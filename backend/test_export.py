import asyncio
from app.infrastructure.db.sqlite_client import get_session
from app.api.v1.endpoints.export import export_complaints
from app.domain.models.user import User

async def test():
    # just invoke it with dummy dependencies
    pass

# actually just let's check uvicorn logs from journalctl or see if there is any python exception
