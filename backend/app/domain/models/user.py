"""User model for SQLite-backed authentication."""

from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    """Represents an authenticated user within the organizational hierarchy."""

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str

    # Hierarchy Association
    role: str = Field(default="VOLUNTEER")
    # Roles: STATE_ADMIN, DISTRICT_ADMIN, CONSTITUENCY_MGR, MANDAL_MGR, BOOTH_PRESIDENT, VOLUNTEER, OFFICIAL, CM, DM, BOOTH

    state_id: Optional[str] = None
    district_id: Optional[str] = None
    constituency_id: Optional[str] = None
    mandal_id: Optional[str] = None
    booth_id: Optional[str] = None

    display_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
