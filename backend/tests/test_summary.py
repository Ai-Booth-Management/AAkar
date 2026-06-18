import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import os

os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-tests-only!!"


def _make_email(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}@innovateindia.gov"


@patch("app.domain.services.seed_graph.seed")
@patch("app.infrastructure.db.neo4j_client.GraphDatabase")
def test_ai_summary_roles(mock_gdb, mock_seed):
    mock_gdb.driver.return_value = MagicMock()

    from app.main import app
    client = TestClient(app)

    # 1. Official registration and request -> should get 403 Forbidden
    email_off = _make_email("official")
    register_res = client.post("/api/v1/auth/register", json={
        "email": email_off,
        "password": "securepass123",
        "role": "official",
        "display_name": "Test Official"
    })
    assert register_res.status_code == 201
    token_off = register_res.json()["access_token"]
    headers_off = {"Authorization": f"Bearer {token_off}"}

    res_off = client.get("/api/v1/admin/ai-summary", headers=headers_off)
    assert res_off.status_code == 403

    # 2. DM registration and request -> should be allowed
    email_dm = _make_email("dm")
    register_res_dm = client.post("/api/v1/auth/register", json={
        "email": email_dm,
        "password": "securepass123",
        "role": "dm",
        "display_name": "Test DM"
    })
    assert register_res_dm.status_code == 201
    token_dm = register_res_dm.json()["access_token"]
    headers_dm = {"Authorization": f"Bearer {token_dm}"}

    # Mock Ollama HTTP request to avoid external service call during testing
    with patch("requests.post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "response": """
            {
              "risks": [{"title": "Water issue", "description": "No water in booth 1", "severity": "High"}],
              "delayed_projects": [{"name": "Desilting", "department": "PWD", "deadline": "2026-06-25", "progress": 50, "delay_reason": "No labor"}],
              "fund_issues": [{"project_name": "Solarization", "issue": "Underutilized funds", "amount": "₹15 L"}],
              "recommendations": [{"action": "Release funds", "target": "PWD", "priority": "High"}]
            }
            """
        }
        mock_post.return_value = mock_response

        res_dm = client.get("/api/v1/admin/ai-summary", headers=headers_dm)
        assert res_dm.status_code == 200
        data = res_dm.json()
        assert "risks" in data
        assert data["risks"][0]["title"] == "Water issue"
        assert data["delayed_projects"][0]["name"] == "Desilting"
