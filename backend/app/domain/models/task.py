"""Task model for SQLModel-backed Task Management."""

from typing import Optional
from sqlmodel import SQLModel, Field


class Task(SQLModel, table=True):
    """Represents an administrative task assigned to BDO, SDO, or Department Officer."""

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: str
    deadline: str
    priority: str      # e.g., "High", "Medium", "Low"
    status: str        # e.g., "Pending", "In Progress", "Completed"
    type: str          # e.g., "Inspection", "Survey", "Review", "Compliance Check"
    assigned_to: str   # e.g., "BDO", "SDO", "Department Officer"
