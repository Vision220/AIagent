import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.models import (
    ResearchProfile, DiscoveredPublication, UserPublication,
    NotificationAlert, MonitoringJob, SavedPaper
)
from app.services.discovery_service import normalize_title, discovery_service
from app.services.relevance_service import relevance_service
from app.services.monitoring_scheduler import monitoring_scheduler

client = TestClient(app)

def test_normalize_title():
    t1 = "Quantum-Enhanced Neural Networks: A Survey!"
    t2 = "quantum enhanced neural networks a survey"
    assert normalize_title(t1) == normalize_title(t2)

def test_relevance_metadata_scoring():
    paper = {
        "title": "Scalable Quantum Neural Network Architectures with High Parametric Compression",
        "abstract": "We evaluate variational quantum circuits for transformer language models.",
        "venue": "Nature Quantum Info"
    }
    topics = ["Quantum Neural Networks", "Transformer Architectures"]
    keywords = ["variational quantum circuits", "parametric compression"]

    res = relevance_service.calculate_metadata_score(paper, topics, keywords)
    assert res["category"] in ("High", "Medium")
    assert res["score"] > 0.3
    assert len(res["matching_keywords"]) >= 2

def test_research_profile_crud_and_lifecycle():
    # 1. Create a new research profile
    create_payload = {
        "name": "Quantum Machine Learning Monitoring",
        "description": "Daily monitoring for quantum transformer preprints",
        "topics": ["Quantum Machine Learning", "Variational Quantum Circuits"],
        "keywords": ["PQC", "Quantum Attention", "QML"],
        "domains": ["Computer Science", "Physics"],
        "pub_types": ["preprints", "journal_articles"],
        "sources": ["arxiv", "openalex"],
        "date_range_days": 14,
        "language": "en",
        "min_relevance": "Medium",
        "frequency": "daily"
    }
    resp = client.post("/api/v1/profiles/", json=create_payload)
    assert resp.status_code == 201
    profile_data = resp.json()
    profile_id = profile_data["id"]
    assert profile_data["name"] == "Quantum Machine Learning Monitoring"
    assert profile_data["is_active"] is True

    # 2. Get profile by ID
    get_resp = client.get(f"/api/v1/profiles/{profile_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == profile_id

    # 3. Update profile
    update_payload = {"description": "Updated description for test"}
    up_resp = client.put(f"/api/v1/profiles/{profile_id}", json=update_payload)
    assert up_resp.status_code == 200
    assert up_resp.json()["description"] == "Updated description for test"

    # 4. Pause profile
    pause_resp = client.post(f"/api/v1/profiles/{profile_id}/pause")
    assert pause_resp.status_code == 200
    assert pause_resp.json()["is_active"] is False

    # 5. Resume profile
    resume_resp = client.post(f"/api/v1/profiles/{profile_id}/resume")
    assert resume_resp.status_code == 200
    assert resume_resp.json()["is_active"] is True

    # 6. List profiles
    list_resp = client.get("/api/v1/profiles/")
    assert list_resp.status_code == 200
    profiles = list_resp.json()
    assert any(p["id"] == profile_id for p in profiles)

    # 7. Delete profile
    del_resp = client.delete(f"/api/v1/profiles/{profile_id}")
    assert del_resp.status_code == 200

    # Confirm deleted
    get_del = client.get(f"/api/v1/profiles/{profile_id}")
    assert get_del.status_code == 404

def test_query_construction():
    profile = ResearchProfile(
        id=999,
        user_id=1,
        name="Agentic AI Monitoring",
        topics_json=["Autonomous Agents", "Multi-Agent Consensus"],
        keywords_json=["Byzantine Fault Tolerance", "Tool Execution"],
        sources_json=["arxiv", "openalex"]
    )
    queries = discovery_service.construct_queries(profile)
    assert len(queries) >= 2
    assert "Autonomous Agents" in queries
    assert "Multi-Agent Consensus" in queries

def test_monitoring_alerts_and_publications_flow():
    db = SessionLocal()
    try:
        # Create test profile
        profile = ResearchProfile(
            user_id=1,
            name="Biomedical Graph-RAG Profile",
            topics_json=["Biomedical RAG", "Knowledge Graphs"],
            keywords_json=["PubMed", "Target Discovery"],
            sources_json=["arxiv", "openalex"],
            min_relevance="Medium",
            is_active=True
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

        # Create discovered publication
        now = datetime.now(timezone.utc)
        pub = DiscoveredPublication(
            external_id=f"test-pub-{int(now.timestamp())}",
            title="Knowledge Graph Augmented Generation for Biomedical Discovery",
            normalized_title=normalize_title("Knowledge Graph Augmented Generation for Biomedical Discovery"),
            authors="Dr. Maya Patel et al.",
            journal_or_venue="Bioinformatics",
            publication_year=2025,
            doi=f"10.1000/test-{int(now.timestamp())}",
            url="https://doi.org/10.1000/test",
            abstract="Evaluating knowledge graph RAG pipelines against unstructured medical text.",
            source_db="OpenAlex",
            first_discovered_at=now,
            last_checked_at=now
        )
        db.add(pub)
        db.commit()
        db.refresh(pub)

        # Create user publication link
        user_pub = UserPublication(
            user_id=1,
            publication_id=pub.id,
            profile_id=profile.id,
            relevance_score=0.88,
            relevance_category="High",
            ai_explanation="Strong alignment with Biomedical RAG and Knowledge Graphs.",
            matching_keywords_json=["biomedical rag", "knowledge graphs"],
            is_read=False,
            is_saved=False,
            discovered_at=now
        )
        db.add(user_pub)

        # Create notification alert
        alert = NotificationAlert(
            user_id=1,
            profile_id=profile.id,
            publication_id=pub.id,
            title="New High Relevance Paper",
            message=f"Discovered '{pub.title}'",
            relevance_category="High",
            is_read=False,
            created_at=now
        )
        db.add(alert)
        db.commit()
        alert_id = alert.id
        pub_id = pub.id

        # 1. Test unread count endpoint
        unread_resp = client.get("/api/v1/alerts/unread-count")
        assert unread_resp.status_code == 200
        assert unread_resp.json()["unread_count"] >= 1

        # 2. Test get alerts list
        alerts_resp = client.get("/api/v1/alerts/?unread_only=true")
        assert alerts_resp.status_code == 200
        alerts_list = alerts_resp.json()
        assert any(a["id"] == alert_id for a in alerts_list)

        # 3. Test mark alert as read
        read_resp = client.post(f"/api/v1/alerts/{alert_id}/read")
        assert read_resp.status_code == 200
        assert read_resp.json()["is_read"] is True

        # 4. Test mark all as read
        all_read = client.post("/api/v1/alerts/read-all")
        assert all_read.status_code == 200
        assert all_read.json()["success"] is True

        # 5. Test publications listing
        pubs_resp = client.get("/api/v1/monitoring/publications?relevance=High")
        assert pubs_resp.status_code == 200
        pubs_list = pubs_resp.json()
        assert any(p["id"] == pub_id for p in pubs_list)

        # 6. Test save publication to library
        save_resp = client.post(f"/api/v1/monitoring/publications/{pub_id}/save")
        assert save_resp.status_code == 200
        assert save_resp.json()["paper_title"] == pub.title

        # Verify saved paper exists in SavedPaper table
        saved_db = db.query(SavedPaper).filter(
            SavedPaper.user_id == 1,
            SavedPaper.paper_title == pub.title
        ).first()
        assert saved_db is not None

        # 7. Test toggle read on publication
        tog_read = client.post(f"/api/v1/monitoring/publications/{pub_id}/read")
        assert tog_read.status_code == 200
        assert tog_read.json()["is_read"] is True

        # 8. Test update notes on publication
        notes_resp = client.put(f"/api/v1/monitoring/publications/{pub_id}/notes", json={
            "user_notes": "Important reference for oncology graph pipeline",
            "user_tags": ["oncology", "graphs"]
        })
        assert notes_resp.status_code == 200

        # 9. Test monitoring dashboard metrics
        dash_resp = client.get("/api/v1/monitoring/dashboard")
        assert dash_resp.status_code == 200
        dash = dash_resp.json()
        assert dash["total_discovered"] >= 1
        assert "sources_health" in dash

    finally:
        db.close()
