"""Pydantic schemas for the PWD Department Data Entry module.

These models mirror the nested JSON schema exactly so that
backend storage, API payloads, and frontend consumption remain
structurally consistent.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


# ─────────────────────────────────────────────
# Nested sub-models
# ─────────────────────────────────────────────

class EvidenceSchema(BaseModel):
    photo_url: Optional[str] = None
    gps: Optional[str] = None
    timestamp: str = ""
    remarks: str = ""


class ProjectSchema(BaseModel):
    id: str
    name: str
    type: str  # "Roads" | "Flyovers" | "Bridges" | "Buildings" | "Drainage" | "Lighting"
    contractor: str = ""
    executing_agency: str = ""
    budget_allocated: float = 0
    budget_released: float = 0
    budget_utilized: float = 0
    progress: int = Field(default=0, ge=0, le=100)
    start_date: str = ""
    deadline: str = ""
    status: str = "On Track"  # "On Track" | "Delayed" | "Critical" | "Completed"
    priority: str = "Medium"  # "High" | "Medium" | "Low"
    officer: Optional[str] = None
    remarks: str = ""
    evidence: Optional[EvidenceSchema] = None
    tasks: Optional[List[Dict]] = None


class ProjectSummarySchema(BaseModel):
    total: int = 0
    active: int = 0
    completed: int = 0
    delayed: int = 0
    critical: int = 0
    list: List[ProjectSchema] = []


class FundMetricsSchema(BaseModel):
    allocated: float = 0
    released: float = 0
    utilized: float = 0
    remaining: float = 0


class InfraMetricItemSchema(BaseModel):
    completed: float = 0
    ongoing: float = 0


class InfraMetricsSchema(BaseModel):
    roads: InfraMetricItemSchema = InfraMetricItemSchema()
    flyovers: InfraMetricItemSchema = InfraMetricItemSchema()
    bridges: InfraMetricItemSchema = InfraMetricItemSchema()
    buildings: InfraMetricItemSchema = InfraMetricItemSchema()
    drainage: InfraMetricItemSchema = InfraMetricItemSchema()
    lighting: InfraMetricItemSchema = InfraMetricItemSchema()


class ComplaintMetricsSchema(BaseModel):
    total: int = 0
    resolved: int = 0
    pending: int = 0
    high_priority: int = 0
    categories: Dict[str, int] = {}


class BacklogAgeBucketSchema(BaseModel):
    label: str
    count: int = 0


class BacklogMetricsSchema(BaseModel):
    pending_approvals: int = 0
    pending_reports: int = 0
    pending_requests: int = 0
    delayed_cases: int = 0
    age_buckets: List[BacklogAgeBucketSchema] = []


class AnalyticsSchema(BaseModel):
    score: int = 0
    trend: int = 0


class OfficerNotesSchema(BaseModel):
    remarks: str = ""
    risks: str = ""
    recommendations: str = ""


# ─────────────────────────────────────────────
# District-level container
# ─────────────────────────────────────────────

class DistrictDataSchema(BaseModel):
    district_id: str
    district_name: str
    projects: ProjectSummarySchema = ProjectSummarySchema()
    funds: FundMetricsSchema = FundMetricsSchema()
    infrastructure: InfraMetricsSchema = InfraMetricsSchema()
    complaints: Optional[ComplaintMetricsSchema] = None
    administrative_backlog: BacklogMetricsSchema = BacklogMetricsSchema()
    analytics: AnalyticsSchema = AnalyticsSchema()
    officer_notes: OfficerNotesSchema = OfficerNotesSchema()


# ─────────────────────────────────────────────
# Top-level request / response schemas
# ─────────────────────────────────────────────

class MetadataSchema(BaseModel):
    version: str = "1.0"
    updated_by: str = ""
    last_updated: str = ""


class DataEntrySubmitSchema(BaseModel):
    """Request body for POST /draft and POST /submit."""
    reporting_month: str
    reporting_year: int
    district_data: List[DistrictDataSchema]


class PWDDataFileSchema(BaseModel):
    """Full JSON file schema — used for reading/writing pwd.json & pwd_draft.json."""
    metadata: MetadataSchema = MetadataSchema()
    department: str = "Public Works Department (PWD)"
    reporting_month: str = ""
    reporting_year: int = 2026
    district_data: List[DistrictDataSchema] = []


# ─────────────────────────────────────────────
# API Response wrappers
# ─────────────────────────────────────────────

class DraftSaveResponse(BaseModel):
    status: str = "ok"
    message: str = "Draft saved successfully"
    timestamp: str = ""


class SubmitResponse(BaseModel):
    status: str = "ok"
    message: str = "Data published successfully"
    timestamp: str = ""


# New Project Management schemas
class ProjectCreateSchema(BaseModel):
    name: str
    district: str
    type: str  # e.g., "Roads", "Flyovers", etc.
    contractor: str = ""
    executing_agency: str = ""
    budget_allocated: float = 0.0
    budget_released: float = 0.0
    budget_utilized: float = 0.0
    progress: int = 0
    deadline: str = ""
    status: str = "On Track"
    officer: str = ""
    remarks: str = ""
    reporting_month: str = "June"
    reporting_year: int = 2026


class ProjectUpdateSchema(BaseModel):
    name: str
    type: str
    contractor: str = ""
    executing_agency: str = ""
    budget_allocated: float = 0.0
    budget_released: float = 0.0
    budget_utilized: float = 0.0
    progress: int = 0
    deadline: str = ""
    status: str = "On Track"
    officer: str = ""
    remarks: str = ""
    evidence: Optional[EvidenceSchema] = None


class ProjectActionSchema(BaseModel):
    action_type: str  # "update_progress", "upload_evidence", "request_approval", "flag_delay"
    progress: Optional[int] = None
    status: Optional[str] = None
    photo_url: Optional[str] = None
    gps: Optional[str] = None
    timestamp: Optional[str] = None
    remarks: Optional[str] = None
    approver: Optional[str] = None
    reason: Optional[str] = None
    revised_deadline: Optional[str] = None


class ActionResponseSchema(BaseModel):
    action_uid: str
    title: str
    description: str
    assigned_by: str
    assigned_to: str
    district: str
    project_uid: str
    project_name: str
    priority: str
    deadline: str
    status: str
    remarks: Optional[str] = None
    evidence_url: Optional[str] = None
    updated_at: datetime


class ActionUpdateSchema(BaseModel):
    status: str
    remarks: Optional[str] = None
    evidence_url: Optional[str] = None



