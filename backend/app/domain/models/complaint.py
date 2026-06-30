from sqlmodel import SQLModel, Field
from typing import Optional

class Complaint(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    complaint_id: Optional[int] = Field(default=None, index=True)
    timestamp: str = Field(default="")

    # Submitter location
    booth_id: str = Field(default="")
    district_id: str = Field(default="")
    constituency_id: str = Field(default="")
    mandal_id: str = Field(default="")
    state_id: str = Field(default="")

    # Voter details
    epic: str = Field(default="")
    phone: str = Field(default="")

    # Complaint details
    type: str = Field(default="")          # complaint category / issue type
    priority: str = Field(default="LOW")   # LOW | MEDIUM | HIGH
    status: str = Field(default="Open")    # Open | Under Review | Resolved | Closed
    description: str = Field(default="")

    # Legacy compat
    constituency: str = Field(default="")  # kept to avoid breaking existing rows
