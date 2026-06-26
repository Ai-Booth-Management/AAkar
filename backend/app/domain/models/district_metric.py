"""District Metric models for SQLModel-backed heatmaps."""

from typing import Optional
from sqlmodel import SQLModel, Field


class DistrictMetric(SQLModel, table=True):
    """Represents Delhi district civic metrics."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    status: str
    
    complaints_total: int
    complaints_sanitation: int
    complaints_water: int
    complaints_roads: int
    complaints_electricity: int
    
    solved_total: int
    solved_sanitation: int
    solved_water: int
    solved_roads: int
    solved_electricity: int
    
    active_total: int
    active_sanitation: int
    active_water: int
    active_roads: int
    active_electricity: int
    
    avg_response: str
    escalations: int
    alerts_health: int
    alerts_education: int
    
    project_name: str
    project_status: str
    
    officer_sanitation: str
    officer_water: str
    officer_roads: str
    officer_electricity: str
