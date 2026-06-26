"""Volunteer and Task management endpoints for the dashboard."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select, func

from app.core.security import get_current_user
from app.domain.models.hierarchy import HierarchyNode
from app.domain.models.user import User
from app.domain.models.volunteer import Volunteer, VolunteerTask

from app.infrastructure.messaging.whatsapp_service import send_text
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
    q_total = select(func.count()).select_from(Volunteer)
    if booth_id:
        q_total = q_total.where(Volunteer.booth_id == booth_id)
    total_volunteers = session.exec(q_total).one() or 0

    # Active volunteers
    q_active = select(func.count()).select_from(Volunteer).where(Volunteer.status == "active")
    if booth_id:
        q_active = q_active.where(Volunteer.booth_id == booth_id)
    active_volunteers = session.exec(q_active).one() or 0

    # Assigned tasks
    q_assigned = select(func.count()).select_from(VolunteerTask).where(VolunteerTask.status == "assigned")
    if booth_id:
        q_assigned = q_assigned.where(VolunteerTask.booth_id == booth_id)
    assigned_tasks = session.exec(q_assigned).one() or 0

    # Completed tasks
    q_completed = select(func.count()).select_from(VolunteerTask).where(VolunteerTask.status == "completed")
    if booth_id:
        q_completed = q_completed.where(VolunteerTask.booth_id == booth_id)
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
            select(func.count()).select_from(VolunteerTask).where(
                VolunteerTask.volunteer_id == vol.id, VolunteerTask.status == "assigned"
            )
        ).one() or 0
        completed = session.exec(
            select(func.count()).select_from(VolunteerTask).where(
                VolunteerTask.volunteer_id == vol.id, VolunteerTask.status == "completed"
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

    phone = body.phone.strip()
    if not phone.startswith("91") or len(phone) < 10 or len(phone) > 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number. Must start with 91 and be 10-15 digits.",
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


@router.get("/volunteers/{volunteer_id}/tasks")
def list_volunteer_tasks(
    volunteer_id: int,
    session: Session = Depends(get_session),
):
    """List all tasks for a specific volunteer."""
    tasks = session.exec(
        select(VolunteerTask).where(VolunteerTask.volunteer_id == volunteer_id)
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

    task = VolunteerTask(
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
    query = select(VolunteerTask)
    if booth_id:
        query = query.where(VolunteerTask.booth_id == booth_id)
    if status_filter:
        query = query.where(VolunteerTask.status == status_filter)
    query = query.order_by(VolunteerTask.assigned_at.desc())  # type: ignore[attr-defined]
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
    task = session.get(VolunteerTask, task_id)
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
