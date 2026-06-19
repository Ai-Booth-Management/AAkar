"""Volunteer and Task management endpoints for the dashboard."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from app.domain.models.volunteer import Volunteer, Task
from app.domain.whatsapp_service import send_text
from app.infrastructure.db.sqlite_client import get_session

router = APIRouter()


# ── Request / Response schemas ─────────────────────────────────────────

class TaskCreateRequest(BaseModel):
    volunteer_id: int
    booth_id: str
    title: str
    description: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────────

@router.get("/volunteers/")
def list_volunteers(
    booth_id: Optional[str] = Query(None),
    session: Session = Depends(get_session),
):
    """List all volunteers, optionally filtered by booth_id."""
    query = select(Volunteer)
    if booth_id:
        query = query.where(Volunteer.booth_id == booth_id)
    volunteers = session.exec(query).all()
    return volunteers


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


@router.post("/tasks/", status_code=status.HTTP_201_CREATED)
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

    # Notify the volunteer via WhatsApp
    message = (
        f"📋 New task assigned: {task.title}\n"
        f"{task.description or ''}\n"
        "Reply DONE or send a photo when complete."
    )
    await send_text(volunteer.phone, message)

    return task


@router.get("/tasks/")
def list_tasks(
    booth_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    session: Session = Depends(get_session),
):
    """List tasks, optionally filtered by booth_id and/or status."""
    query = select(Task)
    if booth_id:
        query = query.where(Task.booth_id == booth_id)
    if status_filter:
        query = query.where(Task.status == status_filter)
    tasks = session.exec(query).all()
    return tasks


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
