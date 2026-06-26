"""Tests for API endpoints using FastAPI TestClient."""

from unittest.mock import patch, MagicMock
from pathlib import Path
from fastapi.testclient import TestClient
import pytest


@pytest.fixture(autouse=True)
def override_auth_dependency():
    from app.main import app
    from app.core.security import get_current_user
    from app.domain.models.user import User

    dummy_user = User(
        email="test@aakar.gov.in",
        hashed_password="...",
        role="ELECTION_ADMIN",
        display_name="Test Admin"
    )
    app.dependency_overrides[get_current_user] = lambda: dummy_user
    yield
    app.dependency_overrides.clear()


# ─── Health endpoint ────────────────────────────────────────────────────


@patch("app.domain.services.seed_graph.seed")
@patch("app.infrastructure.db.neo4j_client.GraphDatabase")
def test_health_endpoint(mock_gdb, mock_seed):
    """GET / should return a health check response."""
    mock_driver = MagicMock()
    mock_gdb.driver.return_value = mock_driver
    from app.main import app

    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "Backend running"


# ─── Admin overview endpoint ────────────────────────────────────────────


@patch("app.api.v1.endpoints.admin.neo4j_client")
@patch("app.domain.services.seed_graph.seed")
@patch("app.infrastructure.db.neo4j_client.GraphDatabase")
def test_admin_overview(mock_gdb, mock_seed, mock_client):
    """GET /api/v1/admin/overview should return booth/complaint stats."""
    # Booth count comes from Neo4j (mocked); complaint counts come from the real CSV.
    mock_client.run_query.return_value = [{"total_booths": 5}]
    from app.main import app

    client = TestClient(app)
    response = client.get("/api/v1/admin/overview")
    assert response.status_code == 200
    data = response.json()
    # Structural checks – values depend on the real CSV, so only check key presence
    assert "total_booths" in data
    assert "total_complaints" in data
    assert "total_open_complaints" in data
    assert "total_resolved_complaints" in data
    assert isinstance(data["total_complaints"], int)
    assert data["total_complaints"] >= 0


# ─── Admin booths endpoint ─────────────────────────────────────────────


@patch("app.api.v1.endpoints.admin.neo4j_client")
@patch("app.api.v1.endpoints.admin.COMPLAINTS_CSV")
@patch("app.api.v1.endpoints.admin.VOTERS_CSV")
@patch("app.domain.services.seed_graph.seed")
@patch("app.infrastructure.db.neo4j_client.GraphDatabase")
def test_admin_booths(mock_gdb, mock_seed, mock_voters, mock_complaints, mock_neo4j):
    """GET /api/v1/admin/booths should return booth list from CSV data."""
    mock_neo4j.run_query.return_value = [
        {
            "booth_id": "B001",
            "complaint_count": 2,
            "open_count": 1,
            "resolved_count": 1,
            "issue_types": ["Water Supply", "Water Supply"]
        }
    ]
    import tempfile, os

    # Create a temp complaints CSV
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write("complaint_id,epic,issue_type,status,booth_id,timestamp\n")
        f.write("1,ABC123,Water Supply,Open,B001,2026-01-01\n")
        f.write("2,DEF456,Water Supply,Resolved,B001,2026-01-02\n")
        complaints_path = f.name

    mock_complaints.__class__ = type(Path())
    mock_complaints.exists.return_value = True
    mock_complaints.__str__ = lambda self: complaints_path
    mock_complaints.__fspath__ = lambda self: complaints_path

    mock_voters.exists.return_value = False

    from app.main import app
    # Patch pd.read_csv to use our temp file for complaints
    with patch("app.api.v1.endpoints.admin.COMPLAINTS_CSV", Path(complaints_path)), \
         patch("app.api.v1.endpoints.admin.VOTERS_CSV", Path("/nonexistent")):
        client = TestClient(app)
        response = client.get("/api/v1/admin/booths")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["booth_id"] == "B001"
        assert data[0]["complaint_count"] == 2
        assert data[0]["open_count"] == 1
        assert data[0]["resolved_count"] == 1

    os.unlink(complaints_path)


# ─── Ask endpoint ──────────────────────────────────────────────────────


@patch("app.api.v1.endpoints.admin.neo4j_client")
@patch("app.domain.services.seed_graph.seed")
@patch("app.infrastructure.db.neo4j_client.GraphDatabase")
def test_ask_rejects_empty_question(mock_gdb, mock_seed, mock_client):
    """POST /api/v1/ask should reject whitespace-only questions with 400."""
    from app.main import app

    client = TestClient(app)
    response = client.post("/api/v1/ask", json={"question": "   "})
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


@patch("app.api.v1.endpoints.admin.neo4j_client")
@patch("app.domain.services.seed_graph.seed")
@patch("app.infrastructure.db.neo4j_client.GraphDatabase")
def test_ask_requires_question_field(mock_gdb, mock_seed, mock_client):
    """POST /api/v1/ask should return 422 if 'question' field is missing."""
    from app.main import app

    client = TestClient(app)
    response = client.post("/api/v1/ask", json={})
    assert response.status_code == 422
