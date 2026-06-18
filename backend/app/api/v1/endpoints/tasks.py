from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List, Optional

from app.domain.models.task import Task
from app.infrastructure.db.sqlite_client import get_session
from app.core.security import get_current_user
from app.domain.models.user import User
from app.domain.services.audit_service import log_event

router = APIRouter()

VALID_TYPES = {"Inspection", "Survey", "Review", "Compliance Check"}
VALID_ASSIGNEES = {"BDO", "SDO", "Department Officer"}
VALID_PRIORITIES = {"High", "Medium", "Low"}
VALID_STATUSES = {"Pending", "In Progress", "Completed"}


class TaskCreate(BaseModel):
    title: str
    description: str
    deadline: str
    priority: str
    status: str
    type: str
    assigned_to: str


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    type: Optional[str] = None
    assigned_to: Optional[str] = None


class TaskRead(BaseModel):
    id: int
    title: str
    description: str
    deadline: str
    priority: str
    status: str
    type: str
    assigned_to: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[TaskRead])
def list_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all tasks."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access tasks."
        )
    statement = select(Task)
    return session.exec(statement).all()


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    body: TaskCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new task."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create tasks."
        )

    if body.type not in VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid task type. Must be one of {VALID_TYPES}."
        )
    if body.assigned_to not in VALID_ASSIGNEES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid assignee. Must be one of {VALID_ASSIGNEES}."
        )
    if body.priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid priority. Must be one of {VALID_PRIORITIES}."
        )
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of {VALID_STATUSES}."
        )

    db_task = Task(
        title=body.title,
        description=body.description,
        deadline=body.deadline,
        priority=body.priority,
        status=body.status,
        type=body.type,
        assigned_to=body.assigned_to
    )
    session.add(db_task)
    log_event(
        session=session,
        action_type="Task Creation",
        project_name=None,
        department=None,
        officer=db_task.assigned_to,
        details=f"Task '{db_task.title}' created. Assigned to: {db_task.assigned_to}. Priority: {db_task.priority}."
    )
    session.commit()
    session.refresh(db_task)
    return db_task


@router.put("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    body: TaskUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update an existing task."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update tasks."
        )

    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )

    update_data = body.model_dump(exclude_unset=True)

    if "type" in update_data and update_data["type"] not in VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid task type. Must be one of {VALID_TYPES}."
        )
    if "assigned_to" in update_data and update_data["assigned_to"] not in VALID_ASSIGNEES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid assignee. Must be one of {VALID_ASSIGNEES}."
        )
    if "priority" in update_data and update_data["priority"] not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid priority. Must be one of {VALID_PRIORITIES}."
        )
    if "status" in update_data and update_data["status"] not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of {VALID_STATUSES}."
        )

    for key, val in update_data.items():
        setattr(db_task, key, val)

    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a task."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete tasks."
        )

    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )

    session.delete(db_task)
    session.commit()
    return None
