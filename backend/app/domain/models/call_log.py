"""CallLog model — tracks video call history in SQLite."""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class CallLog(SQLModel, table=True):
    __tablename__ = "call_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    room_name: str = Field(index=True)
    initiator_id: int
    initiator_role: str
    initiator_name: str
    participant_ids: str
    participant_names: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: int = 0
    status: str = Field(default="active")
