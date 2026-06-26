"""File Tracking models for SQLModel-backed File Tracking."""

from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class FileTracker(SQLModel, table=True):
    """Represents a government file being tracked across departments."""

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    department: str = Field(index=True)
    current_holder: str
    status: str = Field(default="Pending")  # Pending, Approved, Rejected, Forwarded, Escalated
    days_pending: int = Field(default=0)
    rejection_reason: Optional[str] = None

    # Relationship to timeline logs
    timeline: List["FileTimelineEntry"] = Relationship(
        back_populates="file",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"}
    )


class FileTimelineEntry(SQLModel, table=True):
    """Represents a timeline step in a file's history."""

    id: Optional[int] = Field(default=None, primary_key=True)
    file_tracker_id: int = Field(foreign_key="filetracker.id")
    stage: str  # Created, Forwarded, Reviewed, Approved, Rejected, Escalated
    timestamp: str
    actor: str
    details: Optional[str] = None

    file: Optional[FileTracker] = Relationship(back_populates="timeline")
