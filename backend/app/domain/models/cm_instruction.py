"""Model representing CM instructions assigned to the DM."""

from typing import Optional
from sqlmodel import SQLModel, Field


class CmInstruction(SQLModel, table=True):
    """Represents an instruction issued by the CM to the DM."""

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: str
    deadline: str
    priority: str        # e.g., "High", "Medium", "Low"
    status: str          # e.g., "Assigned", "Accepted", "In Progress", "Completed"
    action_taken: Optional[str] = Field(default=None)  # Notes from the DM on action taken
    created_at: str
