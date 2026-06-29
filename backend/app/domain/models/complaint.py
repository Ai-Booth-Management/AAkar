from sqlmodel import SQLModel, Field
from typing import Optional

class Complaint(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    complaint_id: Optional[int] = Field(default=None, index=True)
    timestamp: str = Field(default="")
    booth_id: str = Field(default="")
    constituency: str = Field(default="")
    phone: str = Field(default="")
    type: str = Field(default="")
    status: str = Field(default="")
    description: str = Field(default="")
