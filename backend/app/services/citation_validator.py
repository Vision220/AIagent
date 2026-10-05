"""
Citation Validation Service — Phase 6

Verifies academic citations against real-world metadata standards:
- DOI format validation (strict regex against International DOI Foundation standard)
- URL syntax and protocol verification (rejects non-HTTP, malformed, or SSRF risks)
- Evidence grounding: Associates citations with verified retrieved excerpts
- Declares citations as VERIFIED or UNVERIFIED without hallucinating replacements
"""

import re
import logging
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Standard DOI pattern: 10.xxxx/...
DOI_REGEX = re.compile(r"^10\.\d{4,9}/[-._;()/:A-Za-z0-9]+$", re.IGNORECASE)


def validate_doi(doi: Optional[str]) -> bool:
    """Validate whether a string conforms to real DOI standards."""
    if not doi or not isinstance(doi, str):
        return False
    clean = doi.strip()
    if clean.startswith("https://doi.org/"):
        clean = clean[len("https://doi.org/"):]
    elif clean.startswith("http://doi.org/"):
        clean = clean[len("http://doi.org/"):]
    elif clean.startswith("doi:"):
        clean = clean[len("doi:"):].strip()
    return bool(DOI_REGEX.match(clean))


def validate_source_url(url: Optional[str]) -> bool:
    """Validate that a URL is a legitimate public web or scholarly source."""
    if not url or not isinstance(url, str):
        return False
    clean = url.strip()
    try:
        parsed = urlparse(clean)
        if parsed.scheme not in ["http", "https"]:
            return False
        host = (parsed.hostname or "").lower()
        if not host:
            return False
        # Disallow loopback / private addresses
        if host in ["localhost", "127.0.0.1", "0.0.0.0", "::1"] or host.startswith("192.168.") or host.startswith("10.") or host.startswith("127."):
            return False
        if "." not in host:
            return False
        return True
    except Exception:
        return False


def validate_single_citation(citation: Dict[str, Any], retrieved_evidence: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    Validate an individual citation record.
    Returns the citation dictionary enriched with:
    - verification_status: 'VERIFIED' | 'UNVERIFIED'
    - verification_notes: list of validation checks that passed/failed
    - is_doi_valid: bool
    - is_url_valid: bool
    - has_evidence_grounding: bool
    """
    title = citation.get("title") or citation.get("paper_title") or ""
    doi = citation.get("doi")
    url = citation.get("url") or citation.get("source_url")
    authors = citation.get("authors") or []

    notes: List[str] = []
    is_doi_valid = validate_doi(doi)
    is_url_valid = validate_source_url(url)

    if is_doi_valid:
        notes.append("Valid scholarly DOI format")
    elif doi:
        notes.append(f"Invalid DOI format: '{doi}'")

    if is_url_valid:
        notes.append("Valid source URL")
    elif url:
        notes.append(f"Invalid or unsafe source URL: '{url}'")

    # Evidence grounding check: does this citation correspond to text in the retrieved corpus?
    has_grounding = False
    if retrieved_evidence and title:
        title_lower = title.lower().strip()
        for ev in retrieved_evidence:
            ev_title = (ev.get("title") or "").lower().strip()
            ev_abstract = (ev.get("abstract") or ev.get("snippet") or "").lower()
            if title_lower and (title_lower in ev_title or ev_title in title_lower):
                has_grounding = True
                notes.append("Grounded in retrieved scholarly evidence")
                break
            # Check if key words match
            words = set(re.findall(r"\w{4,}", title_lower))
            if words and len(words.intersection(set(re.findall(r"\w{4,}", ev_title)))) >= max(2, len(words) // 2):
                has_grounding = True
                notes.append("Grounded in retrieved scholarly corpus")
                break

    # Title & author sanity check
    has_title = bool(title.strip()) and len(title.strip()) >= 5
    has_authors = bool(authors)

    # A citation is VERIFIED if it has valid title and (valid DOI or valid URL or grounded in real evidence)
    is_verified = has_title and (is_doi_valid or is_url_valid or has_grounding)

    return {
        "title": title,
        "authors": authors,
        "doi": doi,
        "url": url,
        "journal_or_venue": citation.get("journal_or_venue") or citation.get("venue"),
        "publication_year": citation.get("publication_year") or citation.get("year"),
        "verification_status": "VERIFIED" if is_verified else "UNVERIFIED",
        "verification_notes": notes,
        "is_doi_valid": is_doi_valid,
        "is_url_valid": is_url_valid,
        "has_evidence_grounding": has_grounding,
    }


def validate_citations_batch(citations: List[Dict[str, Any]], retrieved_evidence: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    Validate a list of citations and provide summary metrics.
    """
    validated_list = [validate_single_citation(c, retrieved_evidence) for c in citations]
    verified_count = sum(1 for c in validated_list if c["verification_status"] == "VERIFIED")
    unverified_count = len(validated_list) - verified_count

    return {
        "total_citations": len(validated_list),
        "verified_count": verified_count,
        "unverified_count": unverified_count,
        "verification_rate": (verified_count / len(validated_list)) if validated_list else 1.0,
        "citations": validated_list,
    }
