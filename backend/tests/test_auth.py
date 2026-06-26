"""Tests for the authentication endpoints (register, login, /me)."""

import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import os

# Force a test-only JWT secret
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-tests-only!!"


def _make_email(prefix: str) -> str:
    """Return a unique email to avoid conflicts with existing DB entries."""
    return f"{prefix}_{uuid.uuid4().hex[:8]}@innovateindia.gov"


@patch("app.api.v1.endpoints.auth.pd.read_csv")
@patch("app.domain.services.seed_graph.seed")
@patch("app.infrastructure.db.neo4j_client.GraphDatabase")
def test_register_and_login(mock_gdb, mock_seed, mock_read_csv):
    """Register a new user, then login with same credentials."""
    mock_gdb.driver.return_value = MagicMock()

    import pandas as pd
    import re

    from app.main import app
    email = _make_email("booth")
    booth_id = re.match(r'^booth_(.*)@', email).group(1)
    mock_read_csv.return_value = pd.DataFrame({"booth_id": [booth_id]})

    with patch("app.api.v1.endpoints.auth.Path.exists", return_value=True):
        client = TestClient(app)

    # ── Register ──
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "securepass123",
        "role": "booth",
        "display_name": "Test Booth"
    })
    assert res.status_code == 201, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"].lower() == "booth"
    assert data["user"]["email"] == email
    token = data["access_token"]

    # ── Login ──
    res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "securepass123"
    })
    assert res.status_code == 200, res.text
    assert "access_token" in res.json()

    # ── /me ──
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    me = res.json()
    assert me["email"] == email
    assert me["role"].lower() == "booth"


@patch("app.domain.services.seed_graph.seed")
@patch("app.infrastructure.db.neo4j_client.GraphDatabase")
def test_login_invalid_credentials(mock_gdb, mock_seed):
    """Login with wrong password should return 401."""
    mock_gdb.driver.return_value = MagicMock()

    from app.main import app
    client = TestClient(app)

    res = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@innovateindia.gov",
        "password": "wrongpass"
    })
    assert res.status_code == 401
    assert res.json()["detail"] == "invalid-credentials"


@patch("app.domain.services.seed_graph.seed")
@patch("app.infrastructure.db.neo4j_client.GraphDatabase")
def test_register_duplicate_email(mock_gdb, mock_seed):
    """Registering with an existing email should return 409."""
    mock_gdb.driver.return_value = MagicMock()

    from app.main import app
    client = TestClient(app)
    email = _make_email("dup")

    payload = {"email": email, "password": "securepass123", "role": "official"}

    # First registration should succeed
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201

    # Second registration with same email should fail
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 409
    assert res.json()["detail"] == "email-already-in-use"


@patch("app.domain.services.seed_graph.seed")
@patch("app.infrastructure.db.neo4j_client.GraphDatabase")
def test_me_without_token(mock_gdb, mock_seed):
    """/me without token should return 401."""
    mock_gdb.driver.return_value = MagicMock()

    from app.main import app
    client = TestClient(app)

    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
