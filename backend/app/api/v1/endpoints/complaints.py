"""
Complaints API — v1
====================
Endpoints for lodging and resolving voter complaints.
Neo4j is the primary graph store; SQLite is the primary query store for dashboards.
CSV/JSON serve as best-effort backup archives.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
import pandas as pd
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from app.infrastructure.communications.sms_service import send_sms, notify_by_doc_id
from app.infrastructure.db.neo4j_client import neo4j_client
from sqlmodel import Session, select
from app.infrastructure.db.sqlite_client import engine, get_session
from app.domain.models.complaint import Complaint
from app.domain.models.hierarchy import HierarchyNode
from app.domain.models.user import User
from app.core.security import get_current_user

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


# ── Request / Response Models ────────────────────────────────────────────────
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


class StatusUpdateRequest(BaseModel):
    status: str  # Open | Under Review | Resolved | Closed


# ── Helpers ──────────────────────────────────────────────────────────────────
def _ensure_csv_exists() -> None:
    """Create the complaints CSV with headers if it does not yet exist."""
    if not COMPLAINTS_CSV.exists():
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(columns=CSV_COLUMNS).to_csv(COMPLAINTS_CSV, index=False)


def _next_complaint_id() -> int:
    """Return the next sequential complaint ID (SQLite → Neo4j fallback → CSV)."""
    try:
        with Session(engine) as s:
            result = s.exec(select(Complaint)).all()
            if result:
                return max((c.complaint_id or 0) for c in result) + 1
    except Exception:
        pass
    try:
        query = """
        MATCH (c:Complaint)
        RETURN coalesce(max(c.complaint_id), 1000) + 1 AS next_id
        """
        result = neo4j_client.run_query(query)
        return result[0]["next_id"]
    except Exception:
        pass
    _ensure_csv_exists()
    try:
        df = pd.read_csv(COMPLAINTS_CSV)
        if df.empty or "complaint_id" not in df.columns:
            return 1001
        return int(df["complaint_id"].max()) + 1
    except Exception:
        return 1001


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
    """Verify if the EPIC exists in the Neo4j Voter registry (non-blocking)."""
    try:
        query = "MATCH (v:Voter {epic: $epic}) RETURN count(v) > 0 AS exists"
        result = neo4j_client.run_query(query, {"epic": epic})
        return result[0].get("exists") if result else False
    except Exception as e:
        print(f"Graph check failed (non-fatal): {e}")
        return False  # soft-fail — we still allow submission


def _resolve_hierarchy(booth_id: str) -> dict:
    """Walk the HierarchyNode table to resolve district/constituency/mandal/state from booth_id."""
    result = {"district_id": "", "constituency_id": "", "mandal_id": "", "state_id": "", "constituency": ""}
    if not booth_id:
        return result
    try:
        with Session(engine) as s:
            node = s.exec(select(HierarchyNode).where(HierarchyNode.code == booth_id)).first()
            while node:
                lvl = (node.level or "").lower()
                if lvl == "district":
                    result["district_id"] = node.code
                elif lvl == "constituency":
                    result["constituency_id"] = node.code
                    result["constituency"] = node.code  # legacy compat
                elif lvl == "mandal":
                    result["mandal_id"] = node.code
                elif lvl == "state":
                    result["state_id"] = node.code
                node = s.get(HierarchyNode, node.parent_id) if node.parent_id else None
    except Exception as e:
        print(f"Hierarchy resolution failed (non-fatal): {e}")
    return result


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


def _save_complaint_sqlite(
    complaint_id: int,
    timestamp: str,
    booth_id: str,
    epic: str,
    phone: str,
    type_: str,
    status: str,
    description: str,
    priority: str = "LOW",
    district_id: str = "",
    constituency_id: str = "",
    mandal_id: str = "",
    state_id: str = "",
    constituency: str = "",
) -> None:
    """Save a full complaint record to SQLite — primary dashboard data source."""
    try:
        with Session(engine) as s:
            c = Complaint(
                complaint_id=complaint_id,
                timestamp=timestamp,
                booth_id=booth_id,
                epic=epic,
                phone=phone,
                type=type_,
                status=status,
                description=description,
                priority=priority,
                district_id=district_id,
                constituency_id=constituency_id,
                mandal_id=mandal_id,
                state_id=state_id,
                constituency=constituency,
            )
            s.add(c)
            s.commit()
    except Exception as e:
        print(f"SQLite complaint save failed (non-fatal): {e}")


# ─────────────────────────────────────────────────────────────────────────────
#  GET  /   — SQLite-primary, role-filtered, with search & filters
# ─────────────────────────────────────────────────────────────────────────────
@router.get("")
@router.get("/")
async def list_complaints(
    skip: int = 0,
    limit: int = 200,
    district_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    booth_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve complaints from SQLite.
    - DM users see only their district_id
    - CM / STATE_ADMIN / ELECTION_ADMIN see all
    - Supports ?district_id, ?status, ?booth_id, ?search (ID or EPIC)
    Falls back to CSV if SQLite has no rows.
    """
    try:
        with Session(engine) as s:
            stmt = select(Complaint)

            # ── Role-based scope enforcement ──
            user_role = (current_user.role or "").upper()
            if user_role in ("DM", "DISTRICT_ADMIN"):
                # DM sees only their district
                scope_district = current_user.district_id or district_id or ""
                if scope_district:
                    stmt = stmt.where(Complaint.district_id == scope_district)
            # CM / STATE_ADMIN / ELECTION_ADMIN / SUPER see everything
            elif district_id:
                stmt = stmt.where(Complaint.district_id == district_id)

            # ── Optional filters ──
            if status:
                stmt = stmt.where(Complaint.status == status)
            if booth_id:
                stmt = stmt.where(Complaint.booth_id == booth_id)

            rows = s.exec(stmt).all()

            # ── Search filter (post-query, on ID or EPIC) ──
            if search:
                q = search.lower()
                rows = [
                    r for r in rows
                    if q in str(r.complaint_id).lower()
                    or q in (r.epic or "").lower()
                    or q in (r.booth_id or "").lower()
                ]

            # Sort newest first
            rows = sorted(rows, key=lambda r: r.timestamp or "", reverse=True)
            rows = rows[skip: skip + limit]

            if rows:
                return [
                    {
                        "complaint_id": r.complaint_id,
                        "timestamp": r.timestamp,
                        "booth_id": r.booth_id,
                        "district_id": r.district_id,
                        "constituency_id": r.constituency_id or r.constituency,
                        "mandal_id": r.mandal_id,
                        "state_id": r.state_id,
                        "epic": r.epic,
                        "phone": r.phone,
                        "type": r.type,
                        "priority": r.priority,
                        "status": r.status,
                        "description": r.description,
                    }
                    for r in rows
                ]

    except Exception as e:
        print(f"SQLite query failed, falling back to CSV: {e}")

    # ── CSV fallback ──
    _ensure_csv_exists()
    try:
        df = pd.read_csv(COMPLAINTS_CSV)
        df.columns = df.columns.str.lower()
        if not df.empty and "timestamp" in df.columns:
            df = df.sort_values(by="timestamp", ascending=False)
        return df.iloc[skip: skip + limit].to_dict(orient="records")
    except Exception as e2:
        print(f"CSV fallback also failed: {e2}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
#  GET  /stats  — aggregated summary for stat cards
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/stats")
async def complaint_stats(
    district_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Return total / open / resolved / closed counts scoped by role."""
    try:
        with Session(engine) as s:
            stmt = select(Complaint)
            user_role = (current_user.role or "").upper()
            if user_role in ("DM", "DISTRICT_ADMIN"):
                scope = current_user.district_id or district_id or ""
                if scope:
                    stmt = stmt.where(Complaint.district_id == scope)
            elif district_id:
                stmt = stmt.where(Complaint.district_id == district_id)

            rows = s.exec(stmt).all()
            total = len(rows)
            open_ = sum(1 for r in rows if (r.status or "").lower() in ("open", ""))
            under_review = sum(1 for r in rows if (r.status or "").lower() == "under review")
            resolved = sum(1 for r in rows if (r.status or "").lower() == "resolved")
            closed = sum(1 for r in rows if (r.status or "").lower() == "closed")
            return {
                "total": total,
                "open": open_,
                "under_review": under_review,
                "resolved": resolved,
                "closed": closed,
            }
    except Exception as e:
        print(f"Stats query failed: {e}")
        return {"total": 0, "open": 0, "under_review": 0, "resolved": 0, "closed": 0}


# ─────────────────────────────────────────────────────────────────────────────
#  POST  /lodge-complaint
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/lodge-complaint")
async def lodge_complaint_sms(request: LodgeComplaintRequest):
    """
    Lodge a new complaint.
    - EPIC validation against Neo4j is SOFT (warns but does not block).
    - Saves to SQLite (primary dashboard store), Neo4j (graph), CSV, JSON.
    - Sends SMS acknowledgement.
    """
    try:
        # ── Soft EPIC validation — warn but don't block ──
        voter_verified = _check_voter_exists(request.epic)
        if not voter_verified:
            print(f"WARN: EPIC '{request.epic}' not found in graph — proceeding anyway.")

        next_id = _next_complaint_id()
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        booth_id = (
            request.booth_id
            if request.booth_id
            else _get_booth_id_for_epic(request.epic)
        )

        # ── Resolve full hierarchy for the booth ──
        hier = _resolve_hierarchy(booth_id)

        # ── Write to SQLite (primary dashboard store) ──
        _save_complaint_sqlite(
            complaint_id=next_id,
            timestamp=timestamp,
            booth_id=booth_id,
            epic=request.epic,
            phone=request.phone,
            type_=request.type,
            status="Open",
            description=request.description,
            priority="LOW",
            district_id=hier["district_id"],
            constituency_id=hier["constituency_id"],
            mandal_id=hier["mandal_id"],
            state_id=hier["state_id"],
            constituency=hier["constituency"],
        )

        # ── Write to Neo4j (best-effort graph store) ──
        try:
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
        except Exception as neo4j_err:
            print(f"Neo4j write failed (non-fatal): {neo4j_err}")

        # ── CSV & JSON backup ──
        backup_row = {
            "complaint_id": next_id,
            "timestamp": timestamp,
            "booth_id": booth_id,
            "epic": request.epic,
            "phone": request.phone,
            "type": request.type,
            "status": "Open",
            "description": request.description,
            "location": request.location,
            "image_path": request.image_path,
        }
        _write_csv_backup(backup_row)
        _write_json_backup(backup_row)

        # ── SMS notification (best-effort) ──
        try:
            sms_message = (
                f"AAkar: Your complaint (Ref: {next_id}) regarding "
                f"'{request.type}' has been REGISTERED successfully. "
                f"We will keep you updated. - Govt Secretariat"
            )
            sms_result = send_sms(request.phone, sms_message)
        except Exception:
            sms_result = "sms_skipped"

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
    try:
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
    except Exception as e:
        print(f"Neo4j volunteer complaint write failed (non-fatal): {e}")

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

    hier = _resolve_hierarchy(booth_id)
    _save_complaint_sqlite(
        complaint_id=next_id,
        timestamp=timestamp,
        booth_id=booth_id,
        epic="",
        phone=phone,
        type_=issue_type,
        status="Open",
        description=description,
        priority="LOW",
        district_id=hier["district_id"],
        constituency_id=hier["constituency_id"],
        mandal_id=hier["mandal_id"],
        state_id=hier["state_id"],
        constituency=hier["constituency"],
    )

    try:
        sms_message = (
            f"AAkar: Your complaint (Ref: {next_id}) regarding "
            f"'{issue_type}' has been REGISTERED successfully."
        )
        send_sms(phone, sms_message)
    except Exception:
        pass
    return {"status": "success", "complaint_id": next_id}


# ─────────────────────────────────────────────────────────────────────────────
#  POST  /  (legacy endpoint — kept for backward compatibility)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/")
async def lodge_complaint_legacy(request: LegacyComplaintRequest):
    """Original lodge-complaint endpoint preserved for existing clients."""
    try:
        voter_verified = _check_voter_exists(request.epic)
        if not voter_verified:
            print(f"WARN (legacy): EPIC '{request.epic}' not found — proceeding.")

        next_id = _next_complaint_id()
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        booth_id = (
            request.booth_id
            if request.booth_id
            else _get_booth_id_for_epic(request.epic)
        )

        hier = _resolve_hierarchy(booth_id)

        # SQLite save
        _save_complaint_sqlite(
            complaint_id=next_id,
            timestamp=timestamp,
            booth_id=booth_id,
            epic=request.epic,
            phone="N/A",
            type_=request.issue_type,
            status="Open",
            description=request.description,
            priority="LOW",
            district_id=hier["district_id"],
            constituency_id=hier["constituency_id"],
            mandal_id=hier["mandal_id"],
            state_id=hier["state_id"],
            constituency=hier["constituency"],
        )

        # Neo4j (best-effort)
        try:
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
        except Exception as e:
            print(f"Neo4j legacy write failed (non-fatal): {e}")

        backup_row = {
            "complaint_id": next_id,
            "timestamp": timestamp,
            "booth_id": booth_id,
            "epic": request.epic,
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
        print(f"Error lodging complaint (legacy): {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
#  PATCH  /status/{complaint_id}  — lifecycle status update
# ─────────────────────────────────────────────────────────────────────────────
VALID_STATUSES = {"Open", "Under Review", "Resolved", "Closed"}

@router.patch("/status/{complaint_id}")
async def update_complaint_status(
    complaint_id: int,
    body: StatusUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Update complaint status (lifecycle: Open → Under Review → Resolved → Closed).
    Requires DM, DISTRICT_ADMIN, CM, STATE_ADMIN, or ELECTION_ADMIN role.
    """
    allowed_roles = {"DM", "DISTRICT_ADMIN", "CM", "STATE_ADMIN", "ELECTION_ADMIN", "SUPER"}
    user_role = (current_user.role or "").upper()
    if user_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions to update complaint status.")

    new_status = body.status
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{new_status}'. Must be one of: {', '.join(VALID_STATUSES)}"
        )

    updated = False
    try:
        with Session(engine) as s:
            c = s.exec(select(Complaint).where(Complaint.complaint_id == complaint_id)).first()
            if c:
                c.status = new_status
                s.add(c)
                s.commit()
                updated = True
    except Exception as e:
        print(f"SQLite status update failed: {e}")

    if not updated:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")

    # ── Sync to Neo4j (best-effort) ──
    try:
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        neo4j_client.run_query(
            "MATCH (c:Complaint {complaint_id: $id}) SET c.status = $status, c.updated_at = $ts RETURN c",
            {"id": complaint_id, "status": new_status, "ts": timestamp}
        )
    except Exception as e:
        print(f"Neo4j status sync failed (non-fatal): {e}")

    return {"status": "success", "complaint_id": complaint_id, "new_status": new_status}


# ─────────────────────────────────────────────────────────────────────────────
#  POST  /resolve/{doc_id}  — legacy resolve endpoint (preserved)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/resolve/{doc_id}")
async def resolve_complaint(doc_id: int):
    """
    Mark a complaint as resolved in SQLite + Neo4j and send a resolution SMS.
    CSV update is performed as a best-effort backup.
    """
    try:
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        sms_phone = None

        # ── Update SQLite (primary) ──
        try:
            with Session(engine) as s:
                c = s.exec(select(Complaint).where(Complaint.complaint_id == doc_id)).first()
                if c:
                    sms_phone = c.phone
                    c.status = "Resolved"
                    s.add(c)
                    s.commit()
        except Exception as sqlite_exc:
            print(f"SQLite status sync failed (non-fatal): {sqlite_exc}")

        # ── Update Neo4j ──
        cypher = """
        MATCH (c:Complaint {complaint_id: $id})
        SET c.status = 'Resolved',
            c.resolved_at = $timestamp
        RETURN c
        """
        try:
            result = neo4j_client.run_query(
                cypher, {"id": doc_id, "timestamp": timestamp}
            )
        except Exception as neo4j_exc:
            print(f"Neo4j resolve failed (non-fatal): {neo4j_exc}")
            result = []

        if not result:
            # Try CSV as final fallback check
            if COMPLAINTS_CSV.exists():
                try:
                    df = pd.read_csv(COMPLAINTS_CSV)
                    mask = df["complaint_id"] == doc_id
                    if not mask.any():
                        pass  # just continue, SQLite is authoritative
                    else:
                        if "status" in df.columns:
                            df.loc[mask, "status"] = "Resolved"
                        df.to_csv(COMPLAINTS_CSV, index=False)
                except Exception:
                    pass

        # ── CSV backup update ──
        try:
            if COMPLAINTS_CSV.exists():
                df = pd.read_csv(COMPLAINTS_CSV)
                mask = df["complaint_id"] == doc_id
                if mask.any() and "status" in df.columns:
                    df.loc[mask, "status"] = "Resolved"
                    df.to_csv(COMPLAINTS_CSV, index=False)
        except Exception as csv_exc:
            print(f"CSV backup update failed (non-fatal): {csv_exc}")

        # ── Re-run graph metrics ──
        try:
            from app.domain.services.graph_enrichment import update_booth_metrics
            from app.domain.services.risk_engine import update_risk_scores
            update_booth_metrics()
            update_risk_scores()
        except Exception as graph_exc:
            print(f"Graph enrichment failed (non-fatal): {graph_exc}")

        # ── SMS notification ──
        try:
            sms_result = notify_by_doc_id(doc_id)
        except Exception:
            sms_result = "sms_skipped"

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
