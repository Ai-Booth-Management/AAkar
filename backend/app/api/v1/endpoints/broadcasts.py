import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from sqlmodel import Session, select
from app.core.security import get_current_user
from app.domain.models.user import User
from app.infrastructure.db.neo4j_client import neo4j_client
from app.infrastructure.db.sqlite_client import get_session

router = APIRouter()

ROLE_HIERARCHY = [
    "ELECTION_ADMIN",
    "STATE_ADMIN",
    "DISTRICT_ADMIN",
    "CONSTITUENCY_MGR",
    "MANDAL_MGR",
    "BOOTH_PRESIDENT",
    "VOLUNTEER",
]

SUBORDINATE_ROLE = {
    "ELECTION_ADMIN": "STATE_ADMIN",
    "STATE_ADMIN": "DISTRICT_ADMIN",
    "DISTRICT_ADMIN": "CONSTITUENCY_MGR",
    "CONSTITUENCY_MGR": "MANDAL_MGR",
    "MANDAL_MGR": "BOOTH_PRESIDENT",
    "BOOTH_PRESIDENT": "VOLUNTEER",
}

SUPERIOR_ROLE = {
    "STATE_ADMIN": "ELECTION_ADMIN",
    "DISTRICT_ADMIN": "STATE_ADMIN",
    "CONSTITUENCY_MGR": "DISTRICT_ADMIN",
    "MANDAL_MGR": "CONSTITUENCY_MGR",
    "BOOTH_PRESIDENT": "MANDAL_MGR",
    "VOLUNTEER": "BOOTH_PRESIDENT",
}

BROADCAST_MEDIA_DIR = Path("data/uploads/broadcast_media")


class BroadcastCreate(BaseModel):
    message: str
    recipient_ids: list[int]
    subject: str = ""
    media_urls: list[str] = []


class ReportCreate(BaseModel):
    message: str
    subject: str = ""
    media_urls: list[str] = []


@router.get("/superior")
def get_superior(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return the immediate superior user for the current user."""
    superior_role = SUPERIOR_ROLE.get(current_user.role.upper())
    if not superior_role:
        return None

    query = select(User).where(User.role == superior_role)

    if superior_role == "STATE_ADMIN":
        query = query.where(User.state_id == current_user.state_id)
    elif superior_role == "DISTRICT_ADMIN":
        query = query.where(
            User.state_id == current_user.state_id,
            User.district_id == current_user.district_id,
        )
    elif superior_role == "CONSTITUENCY_MGR":
        query = query.where(
            User.state_id == current_user.state_id,
            User.district_id == current_user.district_id,
            User.constituency_id == current_user.constituency_id,
        )
    elif superior_role == "MANDAL_MGR":
        query = query.where(
            User.state_id == current_user.state_id,
            User.district_id == current_user.district_id,
            User.constituency_id == current_user.constituency_id,
            User.mandal_id == current_user.mandal_id,
        )
    elif superior_role == "BOOTH_PRESIDENT":
        query = query.where(
            User.state_id == current_user.state_id,
            User.district_id == current_user.district_id,
            User.constituency_id == current_user.constituency_id,
            User.mandal_id == current_user.mandal_id,
            User.booth_id == current_user.booth_id,
        )

    user = session.exec(query).first()
    if not user:
        return None
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name or user.email,
        "role": user.role,
    }


@router.get("/subordinates")
def get_subordinates(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user_role = current_user.role.upper()
    target_role = SUBORDINATE_ROLE.get(user_role)
    if not target_role:
        return []

    query = select(User).where(User.role == target_role)

    if user_role == "ELECTION_ADMIN":
        pass
    elif user_role == "STATE_ADMIN":
        query = query.where(User.state_id == current_user.state_id)
    elif user_role == "DISTRICT_ADMIN":
        query = query.where(User.district_id == current_user.district_id)
    elif user_role == "CONSTITUENCY_MGR":
        query = query.where(User.constituency_id == current_user.constituency_id)
    elif user_role == "MANDAL_MGR":
        query = query.where(User.mandal_id == current_user.mandal_id)
    elif user_role == "BOOTH_PRESIDENT":
        query = query.where(User.booth_id == current_user.booth_id)

    users = session.exec(query.order_by(User.display_name, User.email)).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "display_name": u.display_name or u.email,
            "role": u.role,
        }
        for u in users
    ]


@router.post("/upload-media")
async def upload_broadcast_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    try:
        BROADCAST_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

        ext = Path(file.filename).suffix if file.filename else ""
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = BROADCAST_MEDIA_DIR / filename

        contents = await file.read()
        filepath.write_bytes(contents)

        media_url = f"/api/v1/broadcasts/media/{filename}"
        return {"status": "success", "media_url": media_url, "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{broadcast_id}/read")
def mark_broadcast_read(
    broadcast_id: str,
    current_user: User = Depends(get_current_user),
):
    try:
        query = """
        MATCH (b:Broadcast)
        WHERE elementId(b) = $id AND b.recipient_id = $user_id
        SET b.is_read = true
        RETURN elementId(b) AS id
        """
        params = {"id": broadcast_id, "user_id": current_user.id}
        result = neo4j_client.run_query(query, params)
        if not result:
            raise HTTPException(status_code=404, detail="Broadcast not found or not yours to mark")
        return {"status": "success", "id": result[0]["id"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
def create_broadcast(
    req: BroadcastCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        if not req.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        if not req.recipient_ids:
            raise HTTPException(status_code=400, detail="At least one recipient is required")

        user_role = current_user.role.upper()
        target_role = SUBORDINATE_ROLE.get(user_role)
        if not target_role:
            raise HTTPException(status_code=403, detail="Your role cannot send broadcasts")

        recipients = session.exec(
            select(User).where(User.id.in_(req.recipient_ids))
        ).all()

        if len(recipients) != len(req.recipient_ids):
            raise HTTPException(status_code=400, detail="One or more recipient IDs are invalid")

        for r in recipients:
            if r.role != target_role:
                raise HTTPException(
                    status_code=400,
                    detail=f"User {r.email} is not a {target_role}",
                )

        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        created = []
        for r in recipients:
            query = """
            CREATE (b:Broadcast {
                message: $message,
                subject: $subject,
                media_urls: $media_urls,
                type: $type,
                sender_id: $sender_id,
                sender_role: $sender_role,
                sender_name: $sender_name,
                recipient_id: $recipient_id,
                recipient_role: $recipient_role,
                recipient_name: $recipient_name,
                created_at: $created_at,
                is_read: false
            })
            RETURN elementId(b) AS id
            """
            params = {
                "message": req.message.strip(),
                "subject": req.subject.strip() if req.subject else "",
                "media_urls": req.media_urls,
                "type": "broadcast",
                "sender_id": current_user.id,
                "sender_role": user_role,
                "sender_name": current_user.display_name or current_user.email,
                "recipient_id": r.id,
                "recipient_role": r.role,
                "recipient_name": r.display_name or r.email,
                "created_at": now,
            }
            result = neo4j_client.run_query(query, params)
            if result:
                created.append({"recipient_id": r.id, "broadcast_id": result[0]["id"]})

        return {"status": "success", "sent": len(created), "broadcasts": created}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report")
def create_report(
    req: ReportCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Send a report/issue upward to the immediate superior."""
    try:
        if not req.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        superior = get_superior(current_user, session)
        if not superior:
            raise HTTPException(status_code=403, detail="No superior found for your role")

        user_role = current_user.role.upper()
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        query = """
        CREATE (b:Broadcast {
            message: $message,
            subject: $subject,
            media_urls: $media_urls,
            type: $type,
            sender_id: $sender_id,
            sender_role: $sender_role,
            sender_name: $sender_name,
            recipient_id: $recipient_id,
            recipient_role: $recipient_role,
            recipient_name: $recipient_name,
            created_at: $created_at,
            is_read: false
        })
        RETURN elementId(b) AS id
        """
        params = {
            "message": req.message.strip(),
            "subject": req.subject.strip() if req.subject else "",
            "media_urls": req.media_urls,
            "type": "report",
            "sender_id": current_user.id,
            "sender_role": user_role,
            "sender_name": current_user.display_name or current_user.email,
            "recipient_id": superior["id"],
            "recipient_role": superior["role"],
            "recipient_name": superior["display_name"],
            "created_at": now,
        }
        result = neo4j_client.run_query(query, params)
        return {"status": "success", "type": "report", "broadcast_id": result[0]["id"] if result else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


_NODE_PROPS = """
elementId(b) AS id, b.message AS message, b.subject AS subject,
b.media_urls AS media_urls, b.type AS type,
b.sender_id AS sender_id, b.sender_role AS sender_role,
b.sender_name AS sender_name,
b.recipient_id AS recipient_id, b.recipient_role AS recipient_role,
b.recipient_name AS recipient_name,
b.created_at AS created_at,
coalesce(b.is_read, true) AS is_read
"""


@router.get("/sent")
def get_sent_broadcasts(current_user: User = Depends(get_current_user)):
    try:
        query = f"""
        MATCH (b:Broadcast)
        WHERE b.sender_id = $user_id AND b.type = 'broadcast'
        RETURN {_NODE_PROPS}
        ORDER BY b.created_at DESC
        LIMIT 50
        """
        params = {"user_id": current_user.id}
        return neo4j_client.run_query(query, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/received")
def get_received_broadcasts(current_user: User = Depends(get_current_user)):
    try:
        query = f"""
        MATCH (b:Broadcast)
        WHERE b.recipient_id = $user_id
        RETURN {_NODE_PROPS}
        ORDER BY b.created_at DESC
        LIMIT 50
        """
        params = {"user_id": current_user.id}
        return neo4j_client.run_query(query, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hub")
def get_hub_messages(current_user: User = Depends(get_current_user)):
    """Return all messages relevant to the user: broadcasts from above,
    reports from below, and own sent reports, each with a direction field."""
    try:
        query = f"""
        MATCH (b:Broadcast)
        WHERE (b.recipient_id = $user_id)
           OR (b.sender_id = $user_id AND b.type = 'report')
           OR (b.sender_id = $user_id AND b.type = 'broadcast')
        RETURN {_NODE_PROPS}
        ORDER BY b.created_at DESC
        LIMIT 50
        """
        params = {"user_id": current_user.id}
        rows = neo4j_client.run_query(query, params)
        uid = current_user.id
        result = []
        for r in rows:
            r["recipient_id"] = int(r["recipient_id"]) if r.get("recipient_id") else None
            r["sender_id"] = int(r["sender_id"]) if r.get("sender_id") else None
            if r["type"] == "broadcast" and r["recipient_id"] == uid:
                r["direction"] = "from_above"
            elif r["type"] == "report" and r["recipient_id"] == uid:
                r["direction"] = "from_below"
            elif r["type"] == "report" and r["sender_id"] == uid:
                r["direction"] = "my_report"
            elif r["type"] == "broadcast" and r["sender_id"] == uid:
                r["direction"] = "my_broadcast"
            else:
                r["direction"] = "other"
            result.append(r)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
