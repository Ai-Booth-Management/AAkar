"""
Complaints API — v1
====================
Endpoints for lodging and resolving voter complaints.
Integrates with the Fast2SMS notification service for real-time SMS updates.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
from datetime import datetime
from pathlib import Path

from app.domain.services.graph_builder import process_complaints
from app.infrastructure.sms_service import send_sms, notify_by_doc_id
from app.infrastructure.db.neo4j_client import neo4j_client

router = APIRouter()

UPLOADS_DIR = Path("data/uploads")
COMPLAINTS_CSV = UPLOADS_DIR / "complaints.csv"

CSV_COLUMNS = [
    "complaint_id",
    "timestamp",
    "booth_id",
    "EPIC",
    "Contact_no",
    "Issue_Type",
    "Status",
    "Description"
]


# ── Request Models ──────────────────────────────────────────────────────────
class LodgeComplaintRequest(BaseModel):
    epic: str
    contact_no: str
    issue_type: str
    description: str
    booth_id: str = ""


class LegacyComplaintRequest(BaseModel):
    """Backwards-compatible request shape used by the existing frontend."""
    booth_id: str = ""
    epic: str
    issue_type: str
    description: str


# ─────────────────────────────────────────────────────────────────────────────
#  GET  /
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/")
async def list_complaints(skip: int = 0, limit: int = 100):
    """Retrieve all complaints from the intelligence registry."""
    try:
        _ensure_csv_exists()
        df = pd.read_csv(COMPLAINTS_CSV)
        # Ensure all columns exist
        for col in CSV_COLUMNS:
            if col not in df.columns:
                df[col] = ""
        
        # Sort by timestamp descending
        if not df.empty and "timestamp" in df.columns:
            df = df.sort_values(by="timestamp", ascending=False)
            
        return df.iloc[skip:skip+limit].to_dict(orient="records")
    except Exception as e:
        print(f"Error listing complaints: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
#  POST  /lodge-complaint
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/lodge-complaint")
async def lodge_complaint_sms(request: LodgeComplaintRequest):
    """
    Lodge a new complaint and send a *Complaint Registered* SMS to the voter.
    """
    try:
        _ensure_csv_exists()

        # ── AUTHENTICATION: Ensure EPIC exists in central registry ──
        if not _check_voter_exists(request.epic):
            raise HTTPException(
                status_code=400, 
                detail=f"AUTHORIZATION FAILED: EPIC ID '{request.epic}' NOT FOUND IN SOVEREIGN REGISTRY."
            )

        existing_df = pd.read_csv(COMPLAINTS_CSV)
        next_id = _next_complaint_id(existing_df)
        timestamp = datetime.now().isoformat()

        new_row = {
            "complaint_id": next_id,
            "timestamp": timestamp,
            "booth_id": request.booth_id if request.booth_id else _get_booth_id_for_epic(request.epic),
            "EPIC": request.epic,
            "Contact_no": request.contact_no,
            "Issue_Type": request.issue_type,
            "Status": "Open",
            "Description": request.description,
        }

        new_df = pd.concat(
            [existing_df, pd.DataFrame([new_row])], ignore_index=True
        )
        new_df.to_csv(COMPLAINTS_CSV, index=False)

        # Sync into the knowledge‑graph
        try:
            process_complaints(pd.DataFrame([new_row]))
        except Exception as graph_exc:
            # Non-fatal: log but continue
            print(f"⚠ Graph sync failed (non-fatal): {graph_exc}")

        # Fire the acknowledgement SMS
        sms_message = (
            f"AAkar: Your complaint (Ref: {next_id}) regarding "
            f"'{request.issue_type}' has been REGISTERED successfully. "
            f"We will keep you updated. - Govt Secretariat"
        )
        sms_result = send_sms(request.contact_no, sms_message)

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


# ─────────────────────────────────────────────────────────────────────────────
#  POST  /  (legacy endpoint — kept for backward compatibility)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/")
async def lodge_complaint_legacy(request: LegacyComplaintRequest):
    """Original lodge-complaint endpoint preserved for existing clients."""
    try:
        _ensure_csv_exists()

        if not _check_voter_exists(request.epic):
            raise HTTPException(
                status_code=400,
                detail=f"LEGACY AUTH FAIL: EPIC '{request.epic}' NOT FOUND."
            )

        existing_df = pd.read_csv(COMPLAINTS_CSV)
        next_id = _next_complaint_id(existing_df)
        timestamp = datetime.now().isoformat()

        new_row = {
            "complaint_id": next_id,
            "timestamp": timestamp,
            "booth_id": request.booth_id if request.booth_id else _get_booth_id_for_epic(request.epic),
            "EPIC": request.epic,
            "Contact_no": "N/A",
            "Issue_Type": request.issue_type,
            "Status": "Open",
            "Description": request.description,
        }

        # Ensure existing CSV has the new columns
        for col in CSV_COLUMNS:
            if col not in existing_df.columns:
                existing_df[col] = ""

        new_df = pd.concat(
            [existing_df, pd.DataFrame([new_row])], ignore_index=True
        )
        new_df.to_csv(COMPLAINTS_CSV, index=False)

        try:
            process_complaints(pd.DataFrame([new_row]))
        except Exception as graph_exc:
            print(f"⚠ Graph sync failed (non-fatal): {graph_exc}")

        return {"status": "success", "complaint_id": next_id}

    except Exception as e:
        print(f"Error lodging complaint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
#  POST  /resolve/{doc_id}
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/resolve/{doc_id}")
async def resolve_complaint(doc_id: int):
    """
    Mark a complaint as resolved and send a resolution SMS to the voter.
    """
    try:
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

        # Update status to Resolved
        if "Status" in df.columns:
            df.loc[mask, "Status"] = "Resolved"
        elif "status" in df.columns:
            df.loc[mask, "status"] = "Resolved"
        df.to_csv(COMPLAINTS_CSV, index=False)

        # Update Neo4j graph and re-run booth metrics
        try:
            query = "MATCH (i:Issue {complaint_id: $id}) SET i.status = 'Resolved'"
            neo4j_client.run_query(query, {"id": doc_id})
            
            from app.domain.services.graph_enrichment import update_booth_metrics
            from app.domain.services.risk_engine import update_risk_scores
            update_booth_metrics()
            update_risk_scores()
        except Exception as graph_exc:
            print(f"⚠ Graph sync failed during resolve (non-fatal): {graph_exc}")

        # Send the resolution SMS
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


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _ensure_csv_exists() -> None:
    """Create the complaints CSV with headers if it does not yet exist."""
    if not COMPLAINTS_CSV.exists():
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(columns=CSV_COLUMNS).to_csv(COMPLAINTS_CSV, index=False)


def _next_complaint_id(df: pd.DataFrame) -> int:
    """Return the next sequential complaint ID."""
    if df.empty or "complaint_id" not in df.columns:
        return 1001
    return int(df["complaint_id"].max()) + 1


def _get_booth_id_for_epic(epic: str) -> str:
    """Look up the booth_id for a given EPIC in voters.csv."""
    try:
        voters_path = UPLOADS_DIR / "voters.csv"
        if voters_path.exists():
            # Use string type for both columns to ensure clean matching
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
    """Verify if the EPIC exists in the Neo4j Person registry."""
    try:
        query = "MATCH (p:Person {epic_id: $epic}) RETURN count(p) > 0 AS exists"
        result = neo4j_client.run_query(query, {"epic": epic})
        return result[0].get("exists") if result else False
    except Exception as e:
        print(f"Graph check failed: {e}")
        return False

