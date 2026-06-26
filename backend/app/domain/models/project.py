"""Project models for SQLModel-backed Project Drishti."""

from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class Project(SQLModel, table=True):
    """Represents a development project monitored under Project Drishti."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    department: str = Field(index=True)
    budget: str
    allocated: int
    released: int
    utilized: int
    remaining: int
    deadline: str
    progress: int = Field(default=0)
    officer: str
    status: str = Field(default="In Progress")

    # Relationship to justification history
    justifications: List["ProjectJustification"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"}
    )


class ProjectJustification(SQLModel, table=True):
    """Represents a DM justification history log entry for an action taken on a project."""

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    action: str
    user: str
    text: str
    timestamp: str

    project: Optional[Project] = Relationship(back_populates="justifications")
