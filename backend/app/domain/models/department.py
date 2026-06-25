"""SQLModel database models for the PWD Department Module."""

from datetime import datetime, timezone
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship


class DepartmentReport(SQLModel, table=True):
    """Represents a monthly report submitted by a department officer for a district."""

    id: Optional[int] = Field(default=None, primary_key=True)
    department: str = Field(default="Public Works Department (PWD)")
    district_name: str = Field(index=True)
    reporting_month: str
    reporting_year: int
    status: str = Field(default="draft")  # "draft" | "submitted"

    # Monthly Remarks / Narrative
    achievements: Optional[str] = None
    challenges: Optional[str] = None
    recommendations: Optional[str] = None

    # Overridden Budget / Funds values
    funds_allocated: Optional[float] = Field(default=None)
    funds_released: Optional[float] = Field(default=None)
    funds_spent: Optional[float] = Field(default=None)

    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: str = Field(default="officer@innovateindia.gov")

    # Relationships
    projects: List["Project"] = Relationship(
        back_populates="report",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    infra_metrics: Optional["InfrastructureMetric"] = Relationship(
        back_populates="report",
        sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"}
    )


class InfrastructureMetric(SQLModel, table=True):
    """Represents PWD-specific infrastructure metrics completed/ongoing for a district report."""

    id: Optional[int] = Field(default=None, primary_key=True)
    report_id: int = Field(foreign_key="departmentreport.id")

    roads_completed: float = Field(default=0.0)
    roads_ongoing: float = Field(default=0.0)

    flyovers_completed: float = Field(default=0.0)
    flyovers_ongoing: float = Field(default=0.0)

    bridges_completed: float = Field(default=0.0)
    bridges_ongoing: float = Field(default=0.0)

    buildings_completed: float = Field(default=0.0)
    buildings_ongoing: float = Field(default=0.0)

    drainage_completed: float = Field(default=0.0)
    drainage_ongoing: float = Field(default=0.0)

    lighting_completed: float = Field(default=0.0)
    lighting_ongoing: float = Field(default=0.0)

    report: DepartmentReport = Relationship(back_populates="infra_metrics")


class Project(SQLModel, table=True):
    """Represents a PWD project tracked in a district monthly report."""

    id: Optional[int] = Field(default=None, primary_key=True)
    report_id: int = Field(foreign_key="departmentreport.id")
    project_uid: str  # Unique ID across reports (e.g. PWD-001)

    name: str
    category: str  # "Roads", "Flyovers", "Bridges", "Government Buildings", "Drainage", "Footpaths", "Street Lighting"
    contractor: str
    executing_agency: str

    budget_allocated: float = Field(default=0.0)
    budget_released: float = Field(default=0.0)
    budget_utilized: float = Field(default=0.0)

    progress: int = Field(default=0, ge=0, le=100)
    status: str = Field(default="On Track")  # "On Track" | "Delayed" | "Critical" | "Completed"
    deadline: str  # Date string (YYYY-MM-DD)
    officer_in_charge: str
    remarks: Optional[str] = None

    # Evidence details
    evidence_photo_url: Optional[str] = Field(default=None)
    evidence_gps: Optional[str] = Field(default=None)
    evidence_timestamp: Optional[str] = Field(default=None)
    evidence_remarks: Optional[str] = Field(default=None)

    report: DepartmentReport = Relationship(back_populates="projects")


class Action(SQLModel, table=True):
    """Represents a task/instruction assigned to a department officer."""

    id: Optional[int] = Field(default=None, primary_key=True)
    action_uid: str = Field(index=True, unique=True)
    title: str
    description: str
    assigned_by: str
    assigned_to: str
    district: str
    project_uid: str
    priority: str  # "High" | "Medium" | "Low"
    deadline: str  # YYYY-MM-DD
    status: str = Field(default="Assigned")  # "Assigned" | "Accepted" | "In Progress" | "Completed" | "Verified"
    remarks: Optional[str] = None
    evidence_url: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuditLog(SQLModel, table=True):
    """Represents a read-only audit log entry for historical activities."""

    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    officer: str
    department: str = Field(default="Public Works Department (PWD)")
    district: str
    module: Optional[str] = None
    action_type: str
    project_uid: Optional[str] = None
    prev_value: Optional[str] = None
    new_value: Optional[str] = None
    remarks: Optional[str] = None


class ProjectEvidence(SQLModel, table=True):
    """Stores project evidence uploads (multiple allowed per project)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    project_uid: str = Field(index=True)
    photo_url: str
    gps: str
    timestamp: str
    remarks: str


class ProjectApproval(SQLModel, table=True):
    """Tracks project approval submissions and statuses (Pending, Approved, Rejected)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    project_uid: str = Field(index=True)
    status: str = Field(default="Pending")  # "Pending" | "Approved" | "Rejected"
    approver: str = Field(default="")
    comments: str = Field(default="")
    timestamp: str = Field(default="")


class ProjectDelay(SQLModel, table=True):
    """Tracks project delay details when flagged."""
    id: Optional[int] = Field(default=None, primary_key=True)
    project_uid: str = Field(index=True)
    reason: str
    revised_deadline: str
    remarks: str
    timestamp: str = Field(default="")


class ProjectProgress(SQLModel, table=True):
    """Tracks historical project progress updates."""
    id: Optional[int] = Field(default=None, primary_key=True)
    project_uid: str = Field(index=True)
    progress: int
    remarks: str
    timestamp: str = Field(default="")

