"""SQLModel database models for the Health Department Module."""

from datetime import datetime, timezone
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship


class HealthReport(SQLModel, table=True):
    """Represents a monthly report submitted by a health department officer for a district."""

    id: Optional[int] = Field(default=None, primary_key=True)
    department: str = Field(default="Department of Health & Family Welfare")
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
    updated_by: str = Field(default="health_officer@innovateindia.gov")

    # Relationships
    projects: List["HealthProject"] = Relationship(
        back_populates="report",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    health_metrics: Optional["HealthMetric"] = Relationship(
        back_populates="report",
        sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"}
    )


class HealthMetric(SQLModel, table=True):
    """Represents health-specific metrics completed/ongoing for a district report."""

    id: Optional[int] = Field(default=None, primary_key=True)
    report_id: int = Field(foreign_key="healthreport.id")

    hospitals_completed: float = Field(default=0.0)
    hospitals_ongoing: float = Field(default=0.0)

    clinics_completed: float = Field(default=0.0)
    clinics_ongoing: float = Field(default=0.0)

    icu_beds_completed: float = Field(default=0.0)
    icu_beds_ongoing: float = Field(default=0.0)

    ventilators_completed: float = Field(default=0.0)
    ventilators_ongoing: float = Field(default=0.0)

    medicine_stock_completed: float = Field(default=0.0)
    medicine_stock_ongoing: float = Field(default=0.0)

    immunization_completed: float = Field(default=0.0)
    immunization_ongoing: float = Field(default=0.0)

    report: HealthReport = Relationship(back_populates="health_metrics")


class HealthProject(SQLModel, table=True):
    """Represents a Health project tracked in a district monthly report."""

    id: Optional[int] = Field(default=None, primary_key=True)
    report_id: int = Field(foreign_key="healthreport.id")
    project_uid: str  # Unique ID across reports (e.g. HLT-001)

    name: str
    category: str  # "Hospitals", "Primary Health Centers", "ICU Units", "Maternity Centers", "Diagnostics Centers", "Ambulance Procurement", "Specialty Clinics"
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

    report: HealthReport = Relationship(back_populates="projects")
