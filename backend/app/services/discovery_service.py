import re
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import (
    ResearchProfile, DiscoveredPublication, UserPublication,
    NotificationAlert, MonitoringJob, ResearchProject
)
from app.services.academic_sources import academic_source_service, clean_text
from app.services.relevance_service import relevance_service

logger = logging.getLogger(__name__)

def normalize_title(title: str) -> str:
    """Normalize paper title for robust deduplication."""
    if not title:
        return ""
    # Lowercase, remove all non-alphanumeric characters, and strip extra whitespace
    return re.sub(r"[^a-zA-Z0-9]", "", title.lower())

class DiscoveryService:
    """
    Automated Research Paper Discovery Service:
    - Builds scholarly queries from research profiles
    - Searches real academic APIs (arXiv, OpenAlex, Crossref, Semantic Scholar)
    - Deduplicates across sources by DOI and normalized title
    - Evaluates relevance via RelevanceService
    - Persists user-publication links and creates smart alerts
    """

    def construct_queries(self, profile: ResearchProfile) -> List[str]:
        """Constructs targeted search queries from profile topics and keywords."""
        topics = profile.topics_json or []
        keywords = profile.keywords_json or []
        queries = []

        # 1. Primary topic queries
        for t in topics:
            if t and t.strip():
                queries.append(t.strip())

        # 2. Combined topic + keyword query if both exist
        if topics and keywords:
            combined = f"{topics[0]} {keywords[0]}"
            if combined not in queries:
                queries.append(combined)
        elif keywords and not topics:
            queries.extend([k.strip() for k in keywords[:3] if k and k.strip()])

        # Fallback if empty
        if not queries:
            queries.append(profile.name)

        return queries[:3]  # Limit to 3 queries per run to respect API rate limits

    async def run_discovery_for_profile(
        self,
        db: Session,
        profile: ResearchProfile,
        triggered_by: str = "manual"
    ) -> Dict[str, Any]:
        """
        Executes paper discovery for a given profile:
        - Searches scholarly sources
        - Deduplicates and persists publications
        - Assesses relevance
        - Creates non-duplicate alerts
        """
        user_id = profile.user_id
        
        # 1. Create a MonitoringJob audit record
        job = MonitoringJob(
            user_id=user_id,
            profile_id=profile.id,
            status="running",
            started_at=datetime.now(timezone.utc),
            triggered_by=triggered_by
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        queries = self.construct_queries(profile)
        sources = profile.sources_json or ["arxiv", "openalex", "crossref", "semantic_scholar"]
        
        # Get user's saved project topics for contextual relevance
        saved_projects = [
            p.topic for p in db.query(ResearchProject).filter(ResearchProject.user_id == user_id).limit(3).all()
        ]

        discovered_papers_raw: List[Dict[str, Any]] = []

        try:
            # Query each constructed query across sources
            for q in queries:
                papers = await academic_source_service.search_papers(
                    query=q,
                    sources=sources,
                    limit_per_source=4
                )
                discovered_papers_raw.extend(papers)
                await asyncio.sleep(0.5)  # Rate limit courtesy pause

            # Deduplicate by normalized title and DOI within this batch
            batch_deduped: List[Dict[str, Any]] = []
            seen_titles = set()
            seen_dois = set()

            for p in discovered_papers_raw:
                norm_t = normalize_title(p.get("title", ""))
                doi = (p.get("doi") or "").lower().strip()
                if not norm_t:
                    continue

                if norm_t in seen_titles:
                    continue
                if doi and doi in seen_dois:
                    continue

                seen_titles.add(norm_t)
                if doi:
                    seen_dois.add(doi)
                batch_deduped.append(p)

            papers_found = len(batch_deduped)
            papers_new = 0

            # 2. Process each paper into database
            now = datetime.now(timezone.utc)
            for raw_paper in batch_deduped:
                norm_t = normalize_title(raw_paper.get("title", ""))
                doi = (raw_paper.get("doi") or "").strip() or None

                # Check if publication already exists in DiscoveredPublication
                existing_pub = None
                if doi:
                    existing_pub = db.query(DiscoveredPublication).filter(DiscoveredPublication.doi == doi).first()
                if not existing_pub and norm_t:
                    existing_pub = db.query(DiscoveredPublication).filter(DiscoveredPublication.normalized_title == norm_t).first()

                if existing_pub:
                    pub = existing_pub
                    pub.last_checked_at = now
                    if raw_paper.get("abstract") and not pub.abstract:
                        pub.abstract = raw_paper.get("abstract")
                    db.commit()
                else:
                    # New publication record
                    ext_id = raw_paper.get("id") or f"{raw_paper.get('source_db', 'pub')}:{norm_t[:20]}"
                    # Ensure ext_id is unique
                    if db.query(DiscoveredPublication).filter(DiscoveredPublication.external_id == ext_id).first():
                        ext_id = f"{ext_id}-{int(now.timestamp())}"

                    pub = DiscoveredPublication(
                        external_id=ext_id,
                        title=raw_paper.get("title", "Untitled Publication"),
                        normalized_title=norm_t,
                        authors=raw_paper.get("authors"),
                        journal_or_venue=raw_paper.get("venue"),
                        publication_year=raw_paper.get("year"),
                        doi=doi,
                        url=raw_paper.get("url"),
                        pdf_url=raw_paper.get("pdf_url"),
                        abstract=raw_paper.get("abstract"),
                        source_db=raw_paper.get("source_db", "Scholarly API"),
                        citation_count=raw_paper.get("citation_count") or 0,
                        first_discovered_at=now,
                        last_checked_at=now
                    )
                    db.add(pub)
                    db.commit()
                    db.refresh(pub)
                    papers_new += 1

                # 3. Check if user already has this publication for this profile
                user_pub = db.query(UserPublication).filter(
                    UserPublication.user_id == user_id,
                    UserPublication.publication_id == pub.id,
                    UserPublication.profile_id == profile.id
                ).first()

                if not user_pub:
                    # Perform relevance ranking assessment
                    relevance_data = await relevance_service.evaluate_publication(
                        paper=raw_paper,
                        profile_name=profile.name,
                        topics=profile.topics_json or [],
                        keywords=profile.keywords_json or [],
                        saved_projects=saved_projects
                    )

                    user_pub = UserPublication(
                        user_id=user_id,
                        publication_id=pub.id,
                        profile_id=profile.id,
                        relevance_score=relevance_data["relevance_score"],
                        relevance_category=relevance_data["relevance_category"],
                        ai_explanation=relevance_data["ai_explanation"],
                        matching_keywords_json=relevance_data["matching_keywords"],
                        is_read=False,
                        is_saved=False,
                        discovered_at=now
                    )
                    db.add(user_pub)
                    db.commit()

                    # 4. Create Alert if meeting minimum relevance threshold
                    min_rel = (profile.min_relevance or "Medium").lower()
                    cat = relevance_data["relevance_category"].lower()

                    should_alert = False
                    if min_rel == "low":
                        should_alert = True
                    elif min_rel == "medium" and cat in ("medium", "high"):
                        should_alert = True
                    elif min_rel == "high" and cat == "high":
                        should_alert = True

                    if should_alert:
                        # Ensure no duplicate alert for this pub and user
                        existing_alert = db.query(NotificationAlert).filter(
                            NotificationAlert.user_id == user_id,
                            NotificationAlert.publication_id == pub.id,
                            NotificationAlert.profile_id == profile.id
                        ).first()

                        if not existing_alert:
                            alert = NotificationAlert(
                                user_id=user_id,
                                profile_id=profile.id,
                                publication_id=pub.id,
                                title=f"New {relevance_data['relevance_category']} Relevance Paper",
                                message=f"Discovered '{pub.title[:80]}...' in {pub.source_db} matching profile '{profile.name}'.",
                                relevance_category=relevance_data["relevance_category"],
                                is_read=False,
                                created_at=now
                            )
                            db.add(alert)
                            db.commit()

            # Update profile run timestamps
            profile.last_run_at = now
            db.commit()

            # Finalize monitoring job
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            job.papers_found = papers_found
            job.papers_new = papers_new
            db.commit()

            return {
                "success": True,
                "profile_id": profile.id,
                "profile_name": profile.name,
                "papers_found": papers_found,
                "papers_new": papers_new,
                "job_id": job.id,
                "status": "completed"
            }

        except Exception as e:
            logger.error(f"Error during paper discovery for profile {profile.id}: {e}", exc_info=True)
            job.status = "failed"
            job.completed_at = datetime.now(timezone.utc)
            job.error_message = str(e)
            db.commit()

            return {
                "success": False,
                "profile_id": profile.id,
                "error": str(e),
                "job_id": job.id,
                "status": "failed"
            }

discovery_service = DiscoveryService()
