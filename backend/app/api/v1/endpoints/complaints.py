"""
Complaints API — v1
====================
Endpoints for lodging and resolving voter complaints.
Neo4j is the primary store; CSV serves as a best-effort backup.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
from datetime import datetime, timezone
from pathlib import Path
from app.infrastructure.communications.sms_service import send_sms, notify_by_doc_id
from app.infrastructure.db.neo4j_client import neo4j_client

router = APIRouter()

UPLOADS_DIR = Path("data/uploads")
COMPLAINTS_CSV = UPLOADS_DIR / "complaints.csv"

CSV_COLUMNS = [
    "complaint_id",
    "timestamp",
    "booth_id",
    "epic",
    "phone",
    "type",
    "status",
    "description",
    "location",
    "image_path"
]


# ── Request Models ──────────────────────────────────────────────────────────
class LodgeComplaintRequest(BaseModel):
    epic: str
    phone: str
    type: str
    description: str
    location: str = ""
    image_path: str = ""
    booth_id: str = ""


class LegacyComplaintRequest(BaseModel):
    """Backwards-compatible request shape used by the existing frontend."""
    booth_id: str = ""
    epic: str
    issue_type: str
    description: str
    location: str = ""
    image_path: str = ""


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _ensure_csv_exists() -> None:
    """Create the complaints CSV with headers if it does not yet exist."""
    if not COMPLAINTS_CSV.exists():
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(columns=CSV_COLUMNS).to_csv(COMPLAINTS_CSV, index=False)


def _next_complaint_id() -> int:
    """Return the next sequential complaint ID from Neo4j (fallback: CSV)."""
    try:
        query = """
        MATCH (c:Complaint)
        RETURN coalesce(max(c.complaint_id), 1000) + 1 AS next_id
        """
        result = neo4j_client.run_query(query)
        return result[0]["next_id"]
    except Exception:
        _ensure_csv_exists()
        df = pd.read_csv(COMPLAINTS_CSV)
        if df.empty or "complaint_id" not in df.columns:
            return 1001
        return int(df["complaint_id"].max()) + 1


def _get_booth_id_for_epic(epic: str) -> str:
    """Look up the booth_id for a given EPIC in voters.csv."""
    try:
        voters_path = UPLOADS_DIR / "voters.csv"
        if voters_path.exists():
            vdf = pd.read_csv(voters_path, dtype={"epic": str, "booth_id": str})
            matches = vdf[vdf["epic"] == epic]
            if not matches.empty:
                booth_id = matches.iloc[0]["booth_id"]
                if not pd.isna(booth_id):
                    return str(booth_id)
    except Exception as e:
        print(f"Error finding booth_id for EPIC {epic}: {e}")
    return "UNKNOWN"


def _check_voter_exists(epic: str) -> bool:
    """Verify if the EPIC exists in the Neo4j Voter registry."""
    try:
        query = "MATCH (v:Voter {epic: $epic}) RETURN count(v) > 0 AS exists"
        result = neo4j_client.run_query(query, {"epic": epic})
        return result[0].get("exists") if result else False
    except Exception as e:
        print(f"Graph check failed: {e}")
        return False


LODGE_CYPHER = """
CREATE (c:Complaint {
  complaint_id: $complaint_id,
  epic: $epic,
  type: $type,
  status: $status,
  timestamp: $timestamp,
  booth_id: $booth_id,
  phone: $phone,
  description: $description,
  location: coalesce($location, ""),
  image_path: coalesce($image_path, "")
})
WITH c
MATCH (v:Voter {epic: $epic})
CREATE (v)-[:REPORTED]->(c)
WITH c, v
MATCH (v)<-[:HAS_MEMBER]-(h:House)
CREATE (c)-[:BELONGS_TO]->(h)
WITH c, h
MATCH (h)<-[:HAS_HOUSE]-(a:Area)
CREATE (c)-[:LOCATED_IN]->(a)
WITH c, a
MATCH (a)<-[:HAS_AREA]-(b:Booth)
CREATE (c)-[:IN_BOOTH]->(b)
"""


def _write_csv_backup(row: dict) -> None:
    """Append a single row to complaints.csv (best-effort)."""
    try:
        _ensure_csv_exists()
        existing_df = pd.read_csv(COMPLAINTS_CSV)
        # Standardize CSV columns to lowercase if they aren't already
        existing_df.columns = existing_df.columns.str.lower()
        
        new_row = {k.lower(): v for k, v in row.items()}
        new_df = pd.concat(
            [existing_df, pd.DataFrame([new_row])], ignore_index=True
        )
        new_df.to_csv(COMPLAINTS_CSV, index=False)
    except Exception as exc:
        print(f"CSV backup write failed (non-fatal): {exc}")


def _write_json_backup(row: dict) -> None:
    """Append a single row to complaints.json (best-effort)."""
    import json
    try:
        json_path = UPLOADS_DIR / "complaints.json"
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        data = []
        if json_path.exists():
            with open(json_path, "r") as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    pass
        data.append(row)
        with open(json_path, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as exc:
        print(f"JSON backup write failed (non-fatal): {exc}")


# ─────────────────────────────────────────────────────────────────────────────
#  GET  /
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/")
async def list_complaints(skip: int = 0, limit: int = 100):
    """Retrieve complaints from Neo4j (falls back to CSV)."""
    try:
        query = """
        MATCH (c:Complaint)
        OPTIONAL MATCH (v:Voter)-[:REPORTED]->(c)
        RETURN
          c.complaint_id AS complaint_id,
          c.timestamp        AS timestamp,
          COALESCE(c.booth_id,   '') AS booth_id,
          COALESCE(c.epic,   v.epic,    '') AS epic,
          COALESCE(c.phone,  v.phone, '') AS phone,
          COALESCE(c.type,   '') AS type,
          COALESCE(c.status, '') AS status,
          COALESCE(c.description, '') AS description
        ORDER BY c.complaint_id DESC
        SKIP $skip
        LIMIT $limit
        """
        result = neo4j_client.run_query(query, {"skip": skip, "limit": limit})
        return result
    except Exception as e:
        print(f"Neo4j unavailable, falling back to CSV: {e}")
        _ensure_csv_exists()
        df = pd.read_csv(COMPLAINTS_CSV)
        df.columns = df.columns.str.lower()
        if not df.empty and "timestamp" in df.columns:
            df = df.sort_values(by="timestamp", ascending=False)
        return df.iloc[skip : skip + limit].to_dict(orient="records")


# ─────────────────────────────────────────────────────────────────────────────
#  POST  /lodge-complaint
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/lodge-complaint")
async def lodge_complaint_sms(request: LodgeComplaintRequest):
    """
    Lodge a new complaint in Neo4j and send a *Complaint Registered* SMS
    to the voter.  CSV write is performed as a best-effort backup.
    """
    try:
        # ── AUTHENTICATION ──
        if not _check_voter_exists(request.epic):
            raise HTTPException(
                status_code=400,
                detail=f"AUTHORIZATION FAILED: EPIC ID '{request.epic}' "
                       "NOT FOUND IN SOVEREIGN REGISTRY.",
            )

        next_id = _next_complaint_id()
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        booth_id = (
            request.booth_id
            if request.booth_id
            else _get_booth_id_for_epic(request.epic)
        )

        # ── Write to Neo4j (primary) ──
        neo4j_client.run_query(
            LODGE_CYPHER,
            {
                "complaint_id": next_id,
                "epic": request.epic,
                "type": request.type,
                "status": "Open",
                "timestamp": timestamp,
                "booth_id": booth_id,
                "phone": request.phone,
                "description": request.description,
                "location": request.location,
                "image_path": request.image_path,
            },
        )

        # ── CSV & JSON backup ──
        backup_row = {
            "complaint_id": next_id,
            "timestamp": timestamp,
            "booth_id": booth_id,
            "phone": request.phone,
            "type": request.type,
            "status": "Open",
            "description": request.description,
            "location": request.location,
            "image_path": request.image_path,
        }
        _write_csv_backup(backup_row)
        _write_json_backup(backup_row)

        # ── SMS notification ──
        sms_message = (
            f"AAkar: Your complaint (Ref: {next_id}) regarding "
            f"'{request.type}' has been REGISTERED successfully. "
            f"We will keep you updated. - Govt Secretariat"
        )
        sms_result = send_sms(request.phone, sms_message)

        return {
            "status": "success",
            "complaint_id": next_id,
            "sms_status": sms_result,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error lodging complaint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def lodge_volunteer_complaint_internal(
    phone: str,
    aadhar: str,
    pincode: str,
    issue_type: str,
    description: str,
    location: str,
    image_path: str = "",
    booth_id: str = ""
):
    next_id = _next_complaint_id()
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    
    query = """
    CREATE (c:Complaint {
      complaint_id: $complaint_id,
      aadhar: $aadhar,
      pincode: $pincode,
      type: $type,
      status: $status,
      timestamp: $timestamp,
      booth_id: $booth_id,
      phone: $phone,
      description: $description,
      location: coalesce($location, ""),
      image_path: coalesce($image_path, "")
    })
    WITH c
    OPTIONAL MATCH (v:User {phone: $phone})
    FOREACH (ignore IN CASE WHEN v IS NOT NULL THEN [1] ELSE [] END |
        MERGE (v)-[:REPORTED]->(c)
    )
    """
    neo4j_client.run_query(
        query,
        {
            "complaint_id": next_id,
            "aadhar": aadhar,
            "pincode": pincode,
            "type": issue_type,
            "status": "Open",
            "timestamp": timestamp,
            "booth_id": booth_id,
            "phone": phone,
            "description": description,
            "location": location,
            "image_path": image_path,
        },
    )

    backup_row = {
        "complaint_id": next_id,
        "timestamp": timestamp,
        "booth_id": booth_id,
        "aadhar": aadhar,
        "pincode": pincode,
        "phone": phone,
        "type": issue_type,
        "status": "Open",
        "description": description,
        "location": location,
        "image_path": image_path,
    }
    _write_csv_backup(backup_row)
    _write_json_backup(backup_row)

    sms_message = (
        f"AAkar: Your complaint (Ref: {next_id}) regarding "
        f"'{issue_type}' has been REGISTERED successfully."
    )
    send_sms(phone, sms_message)
    return {"status": "success", "complaint_id": next_id}


# ─────────────────────────────────────────────────────────────────────────────
#  POST  /  (legacy endpoint — kept for backward compatibility)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/")
async def lodge_complaint_legacy(request: LegacyComplaintRequest):
    """Original lodge-complaint endpoint preserved for existing clients."""
    try:
        if not _check_voter_exists(request.epic):
            raise HTTPException(
                status_code=400,
                detail=f"LEGACY AUTH FAIL: EPIC '{request.epic}' NOT FOUND.",
            )

        next_id = _next_complaint_id()
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        booth_id = (
            request.booth_id
            if request.booth_id
            else _get_booth_id_for_epic(request.epic)
        )

        # ── Write to Neo4j (primary) ──
        neo4j_client.run_query(
            LODGE_CYPHER,
            {
                "complaint_id": next_id,
                "epic": request.epic,
                "type": request.issue_type,
                "status": "Open",
                "timestamp": timestamp,
                "booth_id": booth_id,
                "phone": "N/A",
                "description": request.description,
                "location": request.location,
                "image_path": request.image_path,
            },
        )

        # ── CSV & JSON backup ──
        backup_row = {
            "complaint_id": next_id,
            "timestamp": timestamp,
            "booth_id": booth_id,
            "phone": "N/A",
            "type": request.issue_type,
            "status": "Open",
            "description": request.description,
            "location": request.location,
            "image_path": request.image_path,
        }
        _write_csv_backup(backup_row)
        _write_json_backup(backup_row)

        return {"status": "success", "complaint_id": next_id}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error lodging complaint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
#  POST  /resolve/{doc_id}
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/resolve/{doc_id}")
async def resolve_complaint(doc_id: int):
    """
    Mark a complaint as resolved in Neo4j and send a resolution SMS.
    CSV update is performed as a best-effort backup.
    """
    try:
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # ── Update Neo4j (primary) ──
        cypher = """
        MATCH (c:Complaint {complaint_id: $id})
        SET c.status = 'Resolved',
            c.resolved_at = $timestamp
        RETURN c
        """
        result = neo4j_client.run_query(
            cypher, {"id": doc_id, "timestamp": timestamp}
        )

        if not result:
            # Not found in Neo4j — check CSV as fallback
            if not COMPLAINTS_CSV.exists():
                raise HTTPException(
                    status_code=404, detail="Complaints data not found."
                )
            df = pd.read_csv(COMPLAINTS_CSV)
            mask = df["complaint_id"] == doc_id
            if not mask.any():
                raise HTTPException(
                    status_code=404,
                    detail=f"Complaint with ID {doc_id} not found.",
                )
            if "status" in df.columns:
                df.loc[mask, "status"] = "Resolved"
            df.to_csv(COMPLAINTS_CSV, index=False)
        else:
            # ── CSV backup update ──
            try:
                if COMPLAINTS_CSV.exists():
                    df = pd.read_csv(COMPLAINTS_CSV)
                    mask = df["complaint_id"] == doc_id
                    if mask.any():
                        if "status" in df.columns:
                            df.loc[mask, "status"] = "Resolved"
                        df.to_csv(COMPLAINTS_CSV, index=False)
            except Exception as csv_exc:
                print(f"CSV backup update failed (non-fatal): {csv_exc}")

        # ── Re-run booth metrics & risk scores ──
        try:
            from app.domain.services.graph_enrichment import update_booth_metrics
            from app.domain.services.risk_engine import update_risk_scores

            update_booth_metrics()
            update_risk_scores()
        except Exception as graph_exc:
            print(f"Graph enrichment failed (non-fatal): {graph_exc}")

        # ── SMS notification ──
        sms_result = notify_by_doc_id(doc_id)

        return {
            "status": "success",
            "complaint_id": doc_id,
            "resolution": "Complaint marked as resolved.",
            "sms_status": sms_result,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error resolving complaint {doc_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
