from datetime import datetime
from sqlmodel import SQLModel, Field

class RevokedToken(SQLModel, table=True):
    """Tracks revoked JWTs (e.g. from logouts) to prevent reuse."""
    jti: str = Field(primary_key=True)
    revoked_at: datetime = Field(default_factory=datetime.utcnow)
