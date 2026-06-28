"""Campaign models: Campaign, Volunteer & ConstituencyCoverage."""
from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime


class Campaign(SQLModel, table=True):
    __tablename__ = "campaign"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: str = Field(default="")
    lat: float
    lng: float
    address: str = Field(default="")
    created_by: Optional[int] = Field(default=None, index=True)
    created_by_name: Optional[str] = Field(default=None)
    created_by_role: Optional[str] = Field(default=None)
    assigned_role: str = Field(default="VOLUNTEER")
    status: str = Field(default="active")
    district: Optional[str] = Field(default=None, index=True)
    constituency: Optional[str] = Field(default=None)
    broadcast_sent_to: Optional[int] = Field(default=0)
    scheduled_at: Optional[str] = Field(default=None)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CampaignVolunteer(SQLModel, table=True):
    __tablename__ = "campaign_volunteer"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    phone: str
    district: str = Field(index=True)
    constituency: str = Field(default="")
    assigned_area: str
    assigned_task: str
    lat: Optional[float] = Field(default=None)
    lng: Optional[float] = Field(default=None)
    status: str = Field(default="inactive")       # active | inactive
    coverage_status: str = Field(default="pending")  # pending | covered
    task_status: str = Field(default="unassigned")  # unassigned | assigned | accepted | completed
    last_location_update: Optional[str] = Field(default=None)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ConstituencyCoverage(SQLModel, table=True):
    __tablename__ = "constituency_coverage"

    id: Optional[int] = Field(default=None, primary_key=True)
    district: str = Field(index=True)
    constituency: str = Field(index=True)
    covered: bool = Field(default=False)
    covered_by: Optional[str] = Field(default=None)   # volunteer name who confirmed
    covered_at: Optional[str] = Field(default=None)
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
