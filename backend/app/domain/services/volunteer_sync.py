"""
volunteer_sync.py
-----------------
Keeps the SQLite volunteer table and frontend/prisma/volunteers.json in sync.
Both use the Prisma schema:
  { id, name, phone, aadhaar, status, lat, lng, createdAt, updatedAt, partNumber, pincode }
"""

import json
import os
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Path to the canonical volunteers.json (Prisma/Boothman schema)
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
VOLUNTEERS_JSON_PATH = os.path.normpath(
    os.path.join(_THIS_DIR, "..", "..", "..", "..", "frontend", "prisma", "volunteers.json")
)


def _sqlite_to_prisma(row) -> dict:
    """Convert a SQLite volunteer row/object to the Prisma JSON schema."""
    # Handle both SQLModel objects and raw tuples
    if hasattr(row, 'id'):
        registered_at = row.registered_at
        if isinstance(registered_at, str):
            created_at_iso = registered_at
        elif registered_at:
            created_at_iso = registered_at.isoformat()
        else:
            created_at_iso = datetime.now(timezone.utc).isoformat()
            
        return {
            "id": row.id,
            "name": row.name or "",
            "phone": row.phone or "",
            "aadhaar": getattr(row, 'aadhar', "") or "",
            "status": (row.status or "pending").upper(),
            "lat": row.lat,
            "lng": row.lng,
            "createdAt": created_at_iso,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "partNumber": row.booth_id or "",
            "pincode": row.pincode or "",
        }
    else:
        # Raw tuple from SQL: (id, phone, name, booth_id, status, registered_at, pincode, address, aadhar, ...)
        registered_at = row[5]
        if isinstance(registered_at, str):
            created_at_iso = registered_at
        elif registered_at:
            created_at_iso = registered_at.isoformat()
        else:
            created_at_iso = datetime.now(timezone.utc).isoformat()
            
        return {
            "id": row[0],
            "name": row[2] or "",
            "phone": row[1] or "",
            "aadhaar": row[8] or "",
            "status": (row[4] or "pending").upper(),
            "lat": row[19] if len(row) > 19 else None,
            "lng": row[20] if len(row) > 20 else None,
            "createdAt": created_at_iso,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "partNumber": row[3] or "",
            "pincode": row[6] or "",
        }


def sync_sqlite_to_json():
    """
    Read all volunteers from SQLite and merge them into frontend/prisma/volunteers.json.
    Existing entries (matched by phone) are updated; new ones are appended.
    """
    from app.infrastructure.db.sqlite_client import engine
    from sqlmodel import Session, text

    # Load existing JSON
    existing = []
    if os.path.exists(VOLUNTEERS_JSON_PATH):
        try:
            with open(VOLUNTEERS_JSON_PATH, "r") as f:
                existing = json.load(f)
        except (json.JSONDecodeError, Exception) as e:
            logger.error(f"Failed to load volunteers.json: {e}")
            existing = []

    # Build a phone→index lookup for existing entries
    phone_index = {}
    for i, v in enumerate(existing):
        phone_index[v.get("phone", "")] = i

    # Read all SQLite volunteers
    with Session(engine) as session:
        rows = session.exec(text("SELECT * FROM volunteer")).all()

    # Merge
    for row in rows:
        prisma_vol = _sqlite_to_prisma(row)
        phone = prisma_vol["phone"]
        if phone in phone_index:
            # Update existing entry, preserve id and createdAt from existing
            idx = phone_index[phone]
            old = existing[idx]
            prisma_vol["id"] = old.get("id", prisma_vol["id"])
            prisma_vol["createdAt"] = old.get("createdAt", prisma_vol["createdAt"])
            existing[idx] = prisma_vol
        else:
            # Assign a new id (max existing + 1)
            max_id = max((v.get("id", 0) for v in existing), default=0)
            prisma_vol["id"] = max_id + 1
            existing.append(prisma_vol)
            phone_index[phone] = len(existing) - 1

    # Write back
    try:
        with open(VOLUNTEERS_JSON_PATH, "w") as f:
            json.dump(existing, f, indent=2)
        logger.info(f"Synced {len(rows)} SQLite volunteers → {VOLUNTEERS_JSON_PATH} (total: {len(existing)})")
    except Exception as e:
        logger.error(f"Failed to write volunteers.json: {e}")


def append_volunteer_to_json(volunteer_obj) -> None:
    """
    Append a single newly-registered volunteer to frontend/prisma/volunteers.json
    using the Prisma schema. Called after WhatsApp registration.
    """
    existing = []
    if os.path.exists(VOLUNTEERS_JSON_PATH):
        try:
            with open(VOLUNTEERS_JSON_PATH, "r") as f:
                existing = json.load(f)
        except (json.JSONDecodeError, Exception):
            existing = []

    # Check if already exists by phone
    for i, v in enumerate(existing):
        if v.get("phone") == volunteer_obj.phone:
            # Update in-place
            existing[i] = _sqlite_to_prisma(volunteer_obj)
            existing[i]["id"] = v.get("id", volunteer_obj.id)
            existing[i]["createdAt"] = v.get("createdAt", existing[i]["createdAt"])
            break
    else:
        # New entry
        prisma_vol = _sqlite_to_prisma(volunteer_obj)
        max_id = max((v.get("id", 0) for v in existing), default=0)
        prisma_vol["id"] = max_id + 1
        existing.append(prisma_vol)

    try:
        with open(VOLUNTEERS_JSON_PATH, "w") as f:
            json.dump(existing, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to append volunteer to JSON: {e}")
