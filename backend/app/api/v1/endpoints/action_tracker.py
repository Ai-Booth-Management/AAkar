"""Endpoints for tracking CM instructions (Action Tracker)."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List, Optional
import datetime

from app.domain.models.cm_instruction import CmInstruction
from app.infrastructure.db.sqlite_client import get_session
from app.core.security import get_current_user
from app.domain.models.user import User
from app.domain.services.audit_service import log_event

router = APIRouter()

VALID_STATUSES = {"Assigned", "Accepted", "In Progress", "Completed"}
VALID_PRIORITIES = {"High", "Medium", "Low"}


class CmInstructionCreate(BaseModel):
    title: str
    description: str
    deadline: str
    priority: str
    status: str = "Assigned"


class CmInstructionUpdate(BaseModel):
    status: Optional[str] = None
    action_taken: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = None


class CmInstructionRead(BaseModel):
    id: int
    title: str
    description: str
    deadline: str
    priority: str
    status: str
    action_taken: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[CmInstructionRead])
def list_instructions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all CM instructions."""
    if current_user.role not in ["official", "cm", "dm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access CM instructions."
        )

    statement = select(CmInstruction).order_by(CmInstruction.id.desc())
    results = session.exec(statement).all()
    return results


@router.post("", response_model=CmInstructionRead, status_code=status.HTTP_201_CREATED)
def create_instruction(
    body: CmInstructionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Assign a new instruction. Authorized for CM role only."""
    if current_user.role != "cm":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only CM Secretariat can assign new instructions."
        )

    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of {VALID_STATUSES}."
        )
    if body.priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid priority. Must be one of {VALID_PRIORITIES}."
        )

    created_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    instruction = CmInstruction(
        title=body.title,
        description=body.description,
        deadline=body.deadline,
        priority=body.priority,
        status=body.status,
        created_at=created_at
    )
    session.add(instruction)

    # Log to Audit Log
    log_event(
        session=session,
        action_type="Task Creation",
        project_name=None,
        department=None,
        officer="District Magistrate (DM)",
        details=f"CM Instruction '{instruction.title}' assigned to DM. Priority: {instruction.priority}."
    )

    session.commit()
    session.refresh(instruction)
    return instruction


@router.put("/{instruction_id}", response_model=CmInstructionRead)
def update_instruction(
    instruction_id: int,
    body: CmInstructionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update instruction status or actions. Authorized for DM and CM roles."""
    if current_user.role not in ["dm", "cm"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only District Magistrate or CM can update instructions."
        )

    instruction = session.get(CmInstruction, instruction_id)
    if not instruction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CM Instruction not found."
        )

    update_data = body.model_dump(exclude_unset=True)

    if "status" in update_data and update_data["status"] not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of {VALID_STATUSES}."
        )
    if "priority" in update_data and update_data["priority"] not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid priority. Must be one of {VALID_PRIORITIES}."
        )

    old_status = instruction.status

    # Restrict DM updates to status and action_taken only
    if current_user.role == "dm":
        for key in ["status", "action_taken"]:
            if key in update_data:
                setattr(instruction, key, update_data[key])
    else:  # CM has full update power
        for key, val in update_data.items():
            setattr(instruction, key, val)

    session.add(instruction)

    # Log to Audit Log
    log_action = "Project Update"
    if "status" in update_data and update_data["status"] != old_status:
        new_status = update_data["status"]
        if new_status == "Accepted":
            log_action = "Approval"
        elif new_status == "Completed":
            log_action = "Project Update"
        
        details_msg = f"CM Instruction '{instruction.title}' status updated from '{old_status}' to '{new_status}' by {current_user.display_name or current_user.email}."
        if instruction.action_taken:
            details_msg += f" Action taken: {instruction.action_taken}"
            
        log_event(
            session=session,
            action_type=log_action,
            project_name=None,
            department=None,
            officer="District Magistrate (DM)",
            details=details_msg
        )
    else:
        log_event(
            session=session,
            action_type="Project Update",
            project_name=None,
            department=None,
            officer="District Magistrate (DM)",
            details=f"CM Instruction '{instruction.title}' details updated by {current_user.display_name or current_user.email}."
        )

    session.commit()
    session.refresh(instruction)
    return instruction
