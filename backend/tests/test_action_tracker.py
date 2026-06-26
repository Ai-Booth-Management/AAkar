"""Tests for the CM Action Tracker endpoints."""

import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.main import app
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.cm_instruction import CmInstruction

def _make_email(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}@innovateindia.gov"

@patch("app.domain.services.seed_graph.seed")
@patch("app.infrastructure.db.neo4j_client.GraphDatabase")
def test_action_tracker_flow(mock_gdb, mock_seed):
    mock_gdb.driver.return_value = MagicMock()
    client = TestClient(app)

    # 1. Register and login as CM
    cm_email = _make_email("cm")
    reg_cm = client.post("/api/v1/auth/register", json={
        "email": cm_email,
        "password": "securepass123",
        "role": "cm",
        "display_name": "CM Secretariat"
    })
    assert reg_cm.status_code == 201
    cm_token = reg_cm.json()["access_token"]
    cm_headers = {"Authorization": f"Bearer {cm_token}"}

    # 2. Register and login as DM
    dm_email = _make_email("dm")
    reg_dm = client.post("/api/v1/auth/register", json={
        "email": dm_email,
        "password": "securepass123",
        "role": "dm",
        "display_name": "District Magistrate"
    })
    assert reg_dm.status_code == 201
    dm_token = reg_dm.json()["access_token"]
    dm_headers = {"Authorization": f"Bearer {dm_token}"}

    # 3. Create instruction as CM
    payload = {
        "title": "Clean Yamuna River Front",
        "description": "Remove floating debris from the river near Wazirabad barrage.",
        "deadline": "2026-07-10",
        "priority": "High",
        "status": "Assigned"
    }
    create_res = client.post("/api/v1/actions", json=payload, headers=cm_headers)
    assert create_res.status_code == 201
    instruction = create_res.json()
    assert instruction["title"] == "Clean Yamuna River Front"
    assert instruction["status"] == "Assigned"
    instruction_id = instruction["id"]

    # 4. Attempt to create as DM (should fail)
    fail_res = client.post("/api/v1/actions", json=payload, headers=dm_headers)
    assert fail_res.status_code == 403

    # 5. List instructions as DM
    list_res = client.get("/api/v1/actions", headers=dm_headers)
    assert list_res.status_code == 200
    instructions = list_res.json()
    assert len(instructions) >= 1
    assert any(inst["id"] == instruction_id for inst in instructions)

    # 6. DM accepts instruction and adds action note
    update_payload = {
        "status": "Accepted",
        "action_taken": "Irrigation dept team deployed to site."
    }
    update_res = client.put(f"/api/v1/actions/{instruction_id}", json=update_payload, headers=dm_headers)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["status"] == "Accepted"
    assert updated["action_taken"] == "Irrigation dept team deployed to site."

    # 7. DM tries to update title (should be ignored/restricted)
    restricted_payload = {
        "title": "Hacked Title",
        "action_taken": "Work in progress."
    }
    restricted_res = client.put(f"/api/v1/actions/{instruction_id}", json=restricted_payload, headers=dm_headers)
    assert restricted_res.status_code == 200
    # Title must remain unchanged for DM
    assert restricted_res.json()["title"] == "Clean Yamuna River Front"
