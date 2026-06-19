import asyncio
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.v1.endpoints.upload import router as upload_router
from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.ask import router as ask_router
from app.api.v1.endpoints.complaints import router as complaints_router
from app.api.v1.endpoints.drives import router as drives_router
from app.api.v1.endpoints.auth import router as auth_router
from app.domain.whatsapp_service import router as whatsapp_router
from app.api.v1.endpoints.volunteers import router as volunteers_router
from app.api.v1.endpoints.broadcasts import router as broadcasts_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.domain.services.seed_graph import seed
from app.domain.models.user import User  # noqa: F401 – ensure table is registered
from app.domain.models.volunteer import Volunteer, Task, ConversationState  # noqa: F401 – ensure tables are registered
from app.domain.models.hierarchy import HierarchyNode  # noqa: F401
from app.infrastructure.db.sqlite_client import init_db
from app.infrastructure.db.neo4j_client import neo4j_client


async def auto_update_csv():
    voters_file = Path("data/uploads/voters.csv")
    complaints_file = Path("data/uploads/complaints.csv")
    last_voter_mtime = 0
    last_complaint_mtime = 0
    voters_existed = False
    complaints_existed = False
    
    if voters_file.exists():
        last_voter_mtime = os.stat(voters_file).st_mtime
        voters_existed = True
    if complaints_file.exists():
        last_complaint_mtime = os.stat(complaints_file).st_mtime
        complaints_existed = True

    while True:
        await asyncio.sleep(2)
        
        # Watch voters.csv
        current_voters_exists = voters_file.exists()
        if current_voters_exists:
            v_mtime = os.stat(voters_file).st_mtime
            if v_mtime > last_voter_mtime:
                print("💥 Detected change in voters.csv! Auto-updating Neo4j database...")
                last_voter_mtime = v_mtime
                voters_existed = True
                from app.api.v1.endpoints import upload
                if not upload.API_UPLOAD_IN_PROGRESS:
                    try:
                        seed()
                        print("✅ Voters auto-update complete!")
                    except Exception as e:
                        print(f"❌ Voters auto-update failed: {e}")
                else:
                    print("⏭️ Skipping voters auto-update; API upload in progress.")
        else:
            if voters_existed:
                print("💥 Detected deletion of voters.csv! Clearing corresponding Neo4j data...")
                voters_existed = False
                last_voter_mtime = 0
                from app.api.v1.endpoints import upload
                if not upload.API_UPLOAD_IN_PROGRESS:
                    try:
                        seed()
                        print("✅ Voters deletion sync complete!")
                    except Exception as e:
                        print(f"❌ Voters deletion sync failed: {e}")

        # Watch complaints.csv
        current_complaints_exists = complaints_file.exists()
        if current_complaints_exists:
            c_mtime = os.stat(complaints_file).st_mtime
            if c_mtime > last_complaint_mtime:
                print("💥 Detected change in complaints.csv! Auto-syncing to Knowledge Graph...")
                last_complaint_mtime = c_mtime
                complaints_existed = True
                from app.api.v1.endpoints import upload
                if not upload.API_UPLOAD_IN_PROGRESS:
                    try:
                        import pandas as pd
                        from app.domain.services.graph_builder import process_complaints
                        df = pd.read_csv(complaints_file)
                        process_complaints(df)
                        print("✅ Complaints auto-sync complete!")
                    except Exception as e:
                        print(f"❌ Complaints auto-sync failed: {e}")
                else:
                    print("⏭️ Skipping complaints auto-sync; API upload in progress.")
        else:
            if complaints_existed:
                print("💥 Detected deletion of complaints.csv! Clearing corresponding Neo4j data...")
                complaints_existed = False
                last_complaint_mtime = 0
                from app.api.v1.endpoints import upload
                if not upload.API_UPLOAD_IN_PROGRESS:
                    try:
                        seed()
                        print("✅ Complaints deletion sync complete!")
                    except Exception as e:
                        print(f"❌ Complaints deletion sync failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables
    init_db()
    # Ensure Neo4j indexes exist
    neo4j_client.ensure_indexes()
    # Seed initially if needed, and start watcher
    task = asyncio.create_task(auto_update_csv())
    yield
    task.cancel()

app = FastAPI(title="AAkar Backend", lifespan=lifespan, redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(upload_router, prefix="/api/v1/upload", tags=["Upload"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(ask_router, prefix="/api/v1", tags=["Ask"])
app.include_router(complaints_router, prefix="/api/v1/complaints", tags=["Complaints"])
app.include_router(drives_router, prefix="/api/v1/drives", tags=["Drives"])
app.include_router(whatsapp_router, prefix="/api/v1/whatsapp", tags=["WhatsApp"])
app.include_router(volunteers_router, prefix="/api/v1", tags=["Volunteers"])
app.include_router(broadcasts_router, prefix="/api/v1/broadcasts", tags=["Broadcasts"])
app.include_router(dashboard_router, prefix="/api/v1", tags=["Dashboard"])


@app.get("/")
def health():
    return {"status": "Backend running"}
