"""AI Summary model for storing generated district summaries in SQLite."""

from typing import Optional
from sqlmodel import SQLModel, Field


class AiSummary(SQLModel, table=True):
    """Stores generated AI district summaries."""

    id: Optional[int] = Field(default=None, primary_key=True)
    summary_json: str
    timestamp: str
