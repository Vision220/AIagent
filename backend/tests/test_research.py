from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_plugins_list():
    response = client.get("/api/v1/plugins/")
    assert response.status_code == 200
    plugins = response.json()
    assert isinstance(plugins, list)
    assert len(plugins) > 0
    assert "slug" in plugins[0]

def test_alerts_demo_feed():
    response = client.get("/api/v1/alerts/feed")
    assert response.status_code == 200
    data = response.json()
    assert data["is_demo"] is True
    assert len(data["feed_items"]) > 0

def test_library_get_papers():
    response = client.get("/api/v1/library/papers")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
