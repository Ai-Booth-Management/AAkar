import asyncio
import os
from datetime import datetime, timezone
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
from app.api.v1.endpoints.drishti import router as drishti_router
from app.api.v1.endpoints.heatmap import router as heatmap_router
from app.api.v1.endpoints.tasks import router as tasks_router
from app.api.v1.endpoints.files import router as files_router
from app.api.v1.endpoints.audit import router as audit_router
from app.api.v1.endpoints.action_tracker import router as action_tracker_router
from app.api.v1.endpoints.summary import router as summary_router
from app.api.v1.endpoints.campaign import router as campaign_router
from app.api.v1.endpoints.ask_election import router as ask_election_router

from app.infrastructure.messaging.whatsapp_service import router as whatsapp_router
from app.api.v1.endpoints.volunteers import router as volunteers_router
from app.api.v1.endpoints.broadcasts import router as broadcasts_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.domain.services.seed_graph import seed
from app.domain.models.user import User  # noqa: F401 – ensure table is registered
from app.domain.models.project import Project, ProjectJustification  # noqa: F401 – ensure table is registered
from app.domain.models.district_metric import DistrictMetric  # noqa: F401 - ensure table is registered
from app.domain.models.task import Task  # noqa: F401 - ensure table is registered
from app.domain.models.file_tracker import FileTracker, FileTimelineEntry  # noqa: F401 - ensure tables are registered
from app.domain.models.system_config import SystemConfig  # noqa: F401 - ensure table is registered
from app.domain.models.audit_log import AuditLog  # noqa: F401 - ensure table is registered
from app.domain.models.cm_instruction import CmInstruction  # noqa: F401 - ensure table is registered
from app.domain.models.ai_summary import AiSummary  # noqa: F401 - ensure table is registered
from app.domain.models.campaign import CampaignVolunteer, ConstituencyCoverage  # noqa: F401 - ensure tables are registered
from app.domain.models.volunteer import Volunteer, VolunteerTask, ConversationState  # noqa: F401 – ensure tables are registered
from app.domain.models.hierarchy import HierarchyNode  # noqa: F401
from app.infrastructure.db.sqlite_client import init_db
from app.infrastructure.db.neo4j_client import neo4j_client
from app.core.watchers import auto_update_csv
from app.seeds import (
    seed_projects,
    seed_district_metrics,
    seed_tasks,
    seed_files,
    seed_instructions,
    seed_campaign_volunteers,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables
    init_db()
    # Seed new instructions table if empty
    seed_instructions()
    # Seed campaign volunteers if empty
    seed_campaign_volunteers()

    # Check if database is already seeded via persistent SystemConfig table
    from sqlmodel import Session, select
    from app.infrastructure.db.sqlite_client import engine
    from app.domain.models.system_config import SystemConfig

    is_seeded = False
    with Session(engine) as session:
        statement = select(SystemConfig).where(SystemConfig.key == "seeded")
        config = session.exec(statement).first()
        if config and config.value == "true":
            is_seeded = True

    if not is_seeded:
        print("Seeding database for the first time...")
        # Seed projects
        seed_projects()
        # Seed district metrics
        seed_district_metrics()
        # Seed tasks
        seed_tasks()
        # Seed files
        seed_files()
        
        # Mark as seeded persistently in SQLite
        with Session(engine) as session:
            session.add(SystemConfig(key="seeded", value="true"))
            session.commit()
        print("Seeding complete!")
    else:
        print("Database already seeded. Skipping setup.")

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
app.include_router(summary_router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(ask_router, prefix="/api/v1", tags=["Ask"])
app.include_router(ask_election_router, prefix="/api/v1", tags=["Ask Election"])
app.include_router(complaints_router, prefix="/api/v1/complaints", tags=["Complaints"])
app.include_router(drives_router, prefix="/api/v1/drives", tags=["Drives"])
app.include_router(drishti_router, prefix="/api/v1/drishti", tags=["Project Drishti"])
app.include_router(heatmap_router, prefix="/api/v1/heatmap", tags=["Heatmap"])
app.include_router(tasks_router, prefix="/api/v1/tasks", tags=["Tasks"])
app.include_router(files_router, prefix="/api/v1/files", tags=["Files"])
app.include_router(audit_router, prefix="/api/v1/audit", tags=["Audit Logs"])
app.include_router(action_tracker_router, prefix="/api/v1/actions", tags=["Action Tracker"])
app.include_router(campaign_router, prefix="/api/v1", tags=["Campaign"])
app.include_router(whatsapp_router, prefix="/api/v1/whatsapp", tags=["WhatsApp"])
app.include_router(volunteers_router, prefix="/api/v1", tags=["Volunteers"])
app.include_router(broadcasts_router, prefix="/api/v1/broadcasts", tags=["Broadcasts"])
app.include_router(dashboard_router, prefix="/api/v1", tags=["Dashboard"])


@app.get("/")
def health():
    return {"status": "Backend running"}
