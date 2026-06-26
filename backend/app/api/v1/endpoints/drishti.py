from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List

from app.domain.models.project import Project, ProjectJustification
from app.infrastructure.db.sqlite_client import get_session
from app.core.security import get_current_user
from app.domain.models.user import User
from app.domain.services.audit_service import log_event

router = APIRouter()


class ActionRequest(BaseModel):
    action: str
    justification: str


class ProjectJustificationRead(BaseModel):
    id: int
    project_id: int
    action: str
    user: str
    text: str
    timestamp: str

    class Config:
        from_attributes = True


class ProjectRead(BaseModel):
    id: int
    name: str
    department: str
    budget: str
    allocated: int
    released: int
    utilized: int
    remaining: int
    deadline: str
    progress: int
    officer: str
    status: str
    justifications: List[ProjectJustificationRead] = []

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    name: str
    department: str
    budget: str
    allocated: int
    released: int
    utilized: int
    remaining: int
    deadline: str
    progress: int = 0
    officer: str
    status: str = "In Progress"


class ProjectUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    budget: str | None = None
    allocated: int | None = None
    released: int | None = None
    utilized: int | None = None
    remaining: int | None = None
    deadline: str | None = None
    progress: int | None = None
    officer: str | None = None
    status: str | None = None


@router.get("/projects", response_model=List[ProjectRead])
def list_projects(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all projects for monitoring."""
    # Ensure user is authorized
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access project data."
        )
    
    statement = select(Project)
    results = session.exec(statement).all()
    return results


@router.post("/projects/{project_id}/action", response_model=ProjectRead)
def perform_project_action(
    project_id: int,
    body: ActionRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Register an action taken on a project by the DM."""
    # DM is the only role authorized to perform actions on Drishti
    if current_user.role != "dm":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only District Magistrates are authorized to execute project actions."
        )

    if not body.justification.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Justification is mandatory before taking action."
        )

    if len(body.justification.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Justification must be at least 10 characters long."
        )

    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    # Calculate status and progress changes
    new_status = project.status
    new_progress = project.progress

    action_type = body.action
    if action_type == "Approve":
        new_status = "Approved"
        new_progress = 100
    elif action_type == "Reject":
        new_status = "Rejected"
    elif action_type == "Escalate":
        new_status = "Escalated"
    elif action_type == "Request Inspection":
        new_status = "Inspection Requested"
    elif action_type == "Mark Delayed":
        new_status = "Delayed"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action type: {action_type}"
        )

    # Update project fields
    project.status = new_status
    project.progress = new_progress
    session.add(project)

    # Save justification log
    import datetime
    timestamp = datetime.datetime.now().strftime("%I:%M %p")
    
    just = ProjectJustification(
        project_id=project.id,
        action=action_type,
        user=current_user.display_name or current_user.email.split("@")[0].upper(),
        text=body.justification.strip(),
        timestamp=timestamp
    )
    session.add(just)

    # Audit log
    log_action = "Project Update"
    if action_type == "Approve":
        log_action = "Approval"
    elif action_type == "Reject":
        log_action = "Rejection"
    elif action_type == "Escalate":
        log_action = "Escalation"
    
    log_event(
        session=session,
        action_type=log_action,
        project_name=project.name,
        department=project.department,
        officer=project.officer,
        details=f"Action '{action_type}' executed by {current_user.display_name or current_user.email}. Justification: {body.justification.strip()}"
    )

    session.commit()
    
    # Refresh to load relationships
    session.refresh(project)
    return project


@router.post("/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    body: ProjectCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new project."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create projects."
        )

    remaining = body.allocated - body.utilized

    project = Project(
        name=body.name,
        department=body.department,
        budget=body.budget,
        allocated=body.allocated,
        released=body.released,
        utilized=body.utilized,
        remaining=remaining,
        deadline=body.deadline,
        progress=body.progress,
        officer=body.officer,
        status=body.status
    )
    session.add(project)
    log_event(
        session=session,
        action_type="Project Update",
        project_name=project.name,
        department=project.department,
        officer=project.officer,
        details=f"Project '{project.name}' created by {current_user.display_name or current_user.email}."
    )
    session.commit()
    session.refresh(project)
    return project


@router.get("/projects/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get a project by ID."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access project data."
        )

    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )
    return project


@router.put("/projects/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    body: ProjectUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update an existing project."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update projects."
        )

    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    old_released = project.released

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    if "allocated" in update_data or "utilized" in update_data:
        project.remaining = project.allocated - project.utilized

    session.add(project)

    if "released" in update_data and project.released > old_released:
        diff = project.released - old_released
        log_event(
            session=session,
            action_type="Fund Release",
            project_name=project.name,
            department=project.department,
            officer=project.officer,
            details=f"Released additional funds: {diff} for project '{project.name}' by {current_user.display_name or current_user.email}."
        )

    log_event(
        session=session,
        action_type="Project Update",
        project_name=project.name,
        department=project.department,
        officer=project.officer,
        details=f"Project '{project.name}' updated by {current_user.display_name or current_user.email}. Fields: {', '.join(update_data.keys())}."
    )

    session.commit()
    session.refresh(project)
    return project


@router.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a project."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete projects."
        )

    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    log_event(
        session=session,
        action_type="Project Update",
        project_name=project.name,
        department=project.department,
        officer=project.officer,
        details=f"Project '{project.name}' deleted by {current_user.display_name or current_user.email}."
    )
    session.delete(project)
    session.commit()
    return {"status": "success", "message": "Project deleted successfully"}

