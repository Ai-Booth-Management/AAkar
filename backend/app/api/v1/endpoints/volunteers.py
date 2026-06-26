"""Volunteer and Task management endpoints for the dashboard."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select, func

from app.core.security import get_current_user
from app.domain.models.hierarchy import HierarchyNode
from app.domain.models.user import User
from app.domain.models.volunteer import Volunteer, Task
from app.domain.whatsapp_service import send_text
from app.infrastructure.db.sqlite_client import get_session

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request / Response schemas ─────────────────────────────────────────

class TaskCreateRequest(BaseModel):
    volunteer_id: int
    booth_id: str
    title: str
    description: Optional[str] = None


class VolunteerCreateRequest(BaseModel):
    phone: str
    name: str
    booth_id: str


# ── Endpoints ──────────────────────────────────────────────────────────

@router.get("/volunteers/stats")
def get_volunteer_stats(
    booth_id: Optional[str] = Query(None),
    session: Session = Depends(get_session),
):
    """Return aggregate volunteer and task statistics, optionally filtered by booth."""
    # Total volunteers
    q_total = select(func.count(Volunteer.id))
    if booth_id:
        q_total = q_total.where(Volunteer.booth_id == booth_id)
    total_volunteers = session.exec(q_total).one() or 0

    # Active volunteers
    q_active = select(func.count(Volunteer.id)).where(Volunteer.status == "active")
    if booth_id:
        q_active = q_active.where(Volunteer.booth_id == booth_id)
    active_volunteers = session.exec(q_active).one() or 0

    # Assigned tasks
    q_assigned = select(func.count(Task.id)).where(Task.status == "assigned")
    if booth_id:
        q_assigned = q_assigned.where(Task.booth_id == booth_id)
    assigned_tasks = session.exec(q_assigned).one() or 0

    # Completed tasks
    q_completed = select(func.count(Task.id)).where(Task.status == "completed")
    if booth_id:
        q_completed = q_completed.where(Task.booth_id == booth_id)
    completed_tasks = session.exec(q_completed).one() or 0

    total_tasks = assigned_tasks + completed_tasks
    completion_rate = (
        round((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0
    )

    return {
        "total_volunteers": total_volunteers,
        "active_volunteers": active_volunteers,
        "total_tasks": total_tasks,
        "assigned_tasks": assigned_tasks,
        "completed_tasks": completed_tasks,
        "completion_rate": completion_rate,
    }


@router.get("/volunteers")
def list_volunteers(
    booth_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    session: Session = Depends(get_session),
):
    """List volunteers with per-volunteer task counts, optionally filtered."""
    query = select(Volunteer)
    if booth_id:
        query = query.where(Volunteer.booth_id == booth_id)
    if status_filter:
        query = query.where(Volunteer.status == status_filter)
    volunteers = session.exec(query).all()

    result = []
    for vol in volunteers:
        assigned = session.exec(
            select(func.count(Task.id)).where(
                Task.volunteer_id == vol.id, Task.status == "assigned"
            )
        ).one() or 0
        completed = session.exec(
            select(func.count(Task.id)).where(
                Task.volunteer_id == vol.id, Task.status == "completed"
            )
        ).one() or 0
        result.append({
            "id": vol.id,
            "phone": vol.phone,
            "name": vol.name,
            "booth_id": vol.booth_id,
            "status": vol.status,
            "registered_at": (
                vol.registered_at.isoformat() if vol.registered_at else None
            ),
            "assigned_tasks": assigned,
            "completed_tasks": completed,
        })

    return result


@router.post("/volunteers", status_code=status.HTTP_201_CREATED)
async def create_volunteer(
    body: VolunteerCreateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Register a new volunteer. Booth President adds a volunteer to their booth."""
    booth = session.exec(
        select(HierarchyNode).where(
            HierarchyNode.code == body.booth_id,
            HierarchyNode.level == "booth",
        )
    ).first()
    if not booth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booth '{body.booth_id}' not found in hierarchy.",
        )

    import re
    # Clean phone: remove non-digits
    phone = re.sub(r"\D", "", body.phone)
    if len(phone) == 10:
        phone = "91" + phone
    
    if len(phone) < 12 or len(phone) > 13: # 91 + 10 digits = 12
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number. Provide 10 digits or 91 + 10 digits.",
        )

    existing = session.exec(
        select(Volunteer).where(Volunteer.phone == phone)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A volunteer with this phone number already exists.",
        )

    volunteer = Volunteer(
        phone=phone,
        name=body.name.strip(),
        booth_id=body.booth_id,
        status="active",
    )
    session.add(volunteer)
    session.commit()
    session.refresh(volunteer)

    try:
        await send_text(
            phone,
            f"Welcome to AAkar, {body.name.strip()}! "
            f"You have been registered as a volunteer for {booth.name} ({booth.code}). "
            "You will receive task assignments here.",
        )
    except Exception as e:
        logger.warning("WhatsApp notification failed for new volunteer %s: %s", phone, e)

    return {
        "id": volunteer.id,
        "phone": volunteer.phone,
        "name": volunteer.name,
        "booth_id": volunteer.booth_id,
        "status": volunteer.status,
    }


@router.post("/volunteers/upload")
async def upload_volunteers(
    booth_id: str,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Batch register volunteers from an Excel (.xlsx) file.
    Backend converts the Excel data to JSON and then processes it.
    Expected columns: Name, Phone.
    """
    import openpyxl
    import json
    import io
    import re
    
    contents = await file.read()
    
    # Check extension
    filename = file.filename.lower()
    if not filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Only .xlsx (Excel) files are supported.")

    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        sheet = wb.active
        
        # Step 1: Convert Excel to JSON-like list of dicts
        headers = [cell.value for cell in sheet[1]]
        data_json = []
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), 2):
            row_dict = {}
            for col_idx, cell_value in enumerate(row):
                if col_idx < len(headers) and headers[col_idx]:
                    row_dict[str(headers[col_idx]).strip().lower()] = cell_value
            data_json.append(row_dict)
        
        # Step 2: Process the JSON data
        added = 0
        errors = []
        
        for row in data_json:
            name = row.get("name") or row.get("volunteer name") or row.get("full name")
            raw_phone = row.get("phone") or row.get("mobile") or row.get("contact")
            
            if not name or not raw_phone:
                continue
                
            try:
                # Phone cleaning
                phone = re.sub(r"\D", "", str(raw_phone))
                if len(phone) == 10:
                    phone = "91" + phone
                
                if len(phone) < 12 or len(phone) > 13:
                    errors.append(f"Invalid phone: {raw_phone}")
                    continue
                    
                # Check duplication
                existing = session.exec(select(Volunteer).where(Volunteer.phone == phone)).first()
                if existing:
                    continue
                    
                vol = Volunteer(
                    phone=phone,
                    name=str(name).strip(),
                    booth_id=booth_id,
                    status="active"
                )
                session.add(vol)
                
                # Send welcome notification
                try:
                    await send_text(
                        phone,
                        f"Welcome to AAkar, {str(name).strip()}! You've been registered as a team volunteer. "
                        "You will receive tasks here."
                    )
                except Exception as notify_err:
                    logger.warning(f"Notification failed for {name}: {notify_err}")

                added += 1
            except Exception as e:
                errors.append(f"Error processing {name}: {str(e)}")
                
        session.commit()
        return {
            "status": "success", 
            "added": added, 
            "errors": errors,
            "processed_json_count": len(data_json)
        }

    except Exception as e:
        logger.error(f"Excel processing failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process Excel file: {str(e)}")


class BroadcastRequest(BaseModel):
    volunteer_ids: list[int]
    message: str

@router.post("/volunteers/broadcast")
async def broadcast_to_volunteers(
    req: BroadcastRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Sends a WhatsApp message to multiple selected volunteers and logs it."""
    volunteers = session.exec(select(Volunteer).where(Volunteer.id.in_(req.volunteer_ids))).all()

    success_count = 0
    errors = []

    for vol in volunteers:
        try:
            await send_text(vol.phone, req.message)
            success_count += 1
        except Exception as e:
            errors.append(f"Failed for {vol.name or vol.phone}: {str(e)}")

    # Persist the broadcast log regardless of WhatsApp delivery status
    if success_count > 0 or volunteers:
        from app.domain.models.volunteer import VolunteerBroadcastLog
        log = VolunteerBroadcastLog(
            sender_id=current_user.id,
            sender_name=current_user.display_name or current_user.email,
            booth_id=getattr(current_user, 'booth_id', None),
            message=req.message.strip(),
            recipient_count=len(volunteers),
        )
        session.add(log)
        session.commit()

    return {"status": "complete", "sent": success_count, "errors": errors}


@router.get("/volunteers/broadcasts/history")
def get_volunteer_broadcast_history(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Returns the broadcast history sent by the current user to volunteers."""
    from app.domain.models.volunteer import VolunteerBroadcastLog
    logs = session.exec(
        select(VolunteerBroadcastLog)
        .where(VolunteerBroadcastLog.sender_id == current_user.id)
        .order_by(VolunteerBroadcastLog.sent_at.desc())
        .limit(50)
    ).all()
    return [
        {
            "id": log.id,
            "message": log.message,
            "recipient_count": log.recipient_count,
            "sent_at": log.sent_at.isoformat() if log.sent_at else None,
            "sender_name": log.sender_name,
        }
        for log in logs
    ]


@router.get("/volunteers/{volunteer_id}/tasks")
def list_volunteer_tasks(
    volunteer_id: int,
    session: Session = Depends(get_session),
):
    """List all tasks for a specific volunteer."""
    tasks = session.exec(
        select(Task).where(Task.volunteer_id == volunteer_id)
    ).all()
    return tasks


@router.post("/tasks", status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreateRequest,
    session: Session = Depends(get_session),
):
    """Assign a new task to a volunteer and notify them via WhatsApp."""
    volunteer = session.get(Volunteer, body.volunteer_id)
    if not volunteer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer not found.",
        )

    task = Task(
        volunteer_id=body.volunteer_id,
        booth_id=body.booth_id,
        title=body.title,
        description=body.description,
    )
    session.add(task)
    session.commit()
    session.refresh(task)

    # Notify the volunteer via WhatsApp.
    # Wrapped in try/except so task creation succeeds even if
    # the WhatsApp notification fails (network issue, token expired, etc.)
    message = (
        f"\U0001f4cb New task assigned: {task.title}\n"
        f"{task.description or ''}\n"
        "Reply DONE or send a photo when complete."
    )
    try:
        await send_text(volunteer.phone, message)
    except Exception as e:
        logger.warning(
            "WhatsApp notification failed for volunteer %s: %s",
            volunteer.phone,
            e,
        )

    return task


@router.get("/tasks")
def list_tasks(
    booth_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    session: Session = Depends(get_session),
):
    """List tasks enriched with volunteer info, optionally filtered."""
    query = select(Task)
    if booth_id:
        query = query.where(Task.booth_id == booth_id)
    if status_filter:
        query = query.where(Task.status == status_filter)
    query = query.order_by(Task.assigned_at.desc())
    tasks = session.exec(query).all()

    result = []
    for task in tasks:
        vol = session.get(Volunteer, task.volunteer_id)
        result.append({
            "id": task.id,
            "volunteer_id": task.volunteer_id,
            "volunteer_name": vol.name if vol else "Unknown",
            "volunteer_phone": vol.phone if vol else "",
            "booth_id": task.booth_id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "assigned_at": (
                task.assigned_at.isoformat() if task.assigned_at else None
            ),
            "completed_at": (
                task.completed_at.isoformat() if task.completed_at else None
            ),
            "has_proof": bool(task.proof_image_path),
        })

    return result


@router.get("/tasks/{task_id}/proof")
def get_task_proof(
    task_id: int,
    session: Session = Depends(get_session),
):
    """Serve the proof image for a completed task."""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    if not task.proof_image_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No proof image uploaded for this task.",
        )
    return FileResponse(task.proof_image_path, media_type="image/jpeg")
