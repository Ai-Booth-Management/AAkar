"""System configuration model for SQLModel-backed state tracking."""

from typing import Optional
from sqlmodel import SQLModel, Field


class SystemConfig(SQLModel, table=True):
    """Tracks database state, such as whether seed data has been applied."""

    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)
    value: str
