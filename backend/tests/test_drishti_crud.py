"""Tests for Project Drishti CRUD operations."""

import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import os

os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-tests-only!!"


def _make_email(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}@innovateindia.gov"


@patch("app.domain.services.seed_graph.seed")
@patch("app.infrastructure.db.neo4j_client.GraphDatabase")
def test_project_crud(mock_gdb, mock_seed):
    mock_gdb.driver.return_value = MagicMock()

    from app.main import app
    client = TestClient(app)

    # 1. Register and login as official
    email = _make_email("official")
    register_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "securepass123",
        "role": "official",
        "display_name": "Test Official"
    })
    assert register_res.status_code == 201
    token = register_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Project
    project_payload = {
        "name": "New Test Project",
        "department": "PWD",
        "budget": "₹10.00 L",
        "allocated": 1000000,
        "released": 500000,
        "utilized": 200000,
        "remaining": 800000,
        "deadline": "2026-12-31",
        "progress": 20,
        "officer": "Test Officer",
        "status": "In Progress"
    }
    create_res = client.post("/api/v1/drishti/projects", json=project_payload, headers=headers)
    assert create_res.status_code == 201, create_res.text
    project_data = create_res.json()
    assert project_data["name"] == "New Test Project"
    assert project_data["remaining"] == 800000  # Calculated allocated - utilized
    project_id = project_data["id"]

    # 3. Read Project
    read_res = client.get(f"/api/v1/drishti/projects/{project_id}", headers=headers)
    assert read_res.status_code == 200
    assert read_res.json()["name"] == "New Test Project"

    # 4. Update Project
    update_payload = {
        "name": "Updated Test Project Name",
        "utilized": 300000  # remaining should become 1000000 - 300000 = 700000
    }
    update_res = client.put(f"/api/v1/drishti/projects/{project_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200, update_res.text
    updated_data = update_res.json()
    assert updated_data["name"] == "Updated Test Project Name"
    assert updated_data["remaining"] == 700000

    # 5. Delete Project
    delete_res = client.delete(f"/api/v1/drishti/projects/{project_id}", headers=headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["status"] == "success"

    # 6. Verify Deleted
    verify_res = client.get(f"/api/v1/drishti/projects/{project_id}", headers=headers)
    assert verify_res.status_code == 404
