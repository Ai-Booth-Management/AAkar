from typing import Optional
from sqlmodel import SQLModel, Field


class AuditLog(SQLModel, table=True):
    """Represents an item in the Audit and Decision Trail log."""

    id: Optional[int] = Field(default=None, primary_key=True)
    action_type: str = Field(index=True)  # Approval, Rejection, Escalation, Fund Release, Task Creation, Project Update
    project_name: Optional[str] = Field(default=None, index=True)
    department: Optional[str] = Field(default=None, index=True)
    officer: Optional[str] = Field(default=None, index=True)
    details: str
    timestamp: str
