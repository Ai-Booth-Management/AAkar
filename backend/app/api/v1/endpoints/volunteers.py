"""Volunteer and Task management endpoints for the dashboard."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select, func

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
