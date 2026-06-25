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
from app.api.v1.endpoints.ask_election import router as ask_election_router
from app.domain.whatsapp_service import router as whatsapp_router
from app.api.v1.endpoints.volunteers import router as volunteers_router
from app.api.v1.endpoints.broadcasts import router as broadcasts_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.department import router as department_router
from app.domain.services.seed_graph import seed
from app.domain.models.user import User  # noqa: F401 – ensure table is registered
from app.domain.models.volunteer import Volunteer, Task, ConversationState  # noqa: F401 – ensure tables are registered
from app.domain.models.hierarchy import HierarchyNode  # noqa: F401
from app.domain.models.department import DepartmentReport, InfrastructureMetric, Project, Action, AuditLog, ProjectEvidence, ProjectApproval, ProjectDelay, ProjectProgress  # noqa: F401
from app.domain.models.health import HealthReport, HealthMetric, HealthProject  # noqa: F401
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


def seed_pwd_db():
    """Seed PWD report data from pwd.json into SQLite if table is empty."""
    from sqlmodel import Session, select
    from app.infrastructure.db.sqlite_client import engine
    import json
    
    with Session(engine) as session:
        existing_projects = session.exec(select(Project)).first()
        if existing_projects:
            return
            
        # Clear existing reports if projects are missing to ensure clean seed
        existing_reports = session.exec(select(DepartmentReport)).all()
        for r in existing_reports:
            session.delete(r)
            
        # Clear existing actions and audit logs to ensure clean seed
        existing_actions = session.exec(select(Action)).all()
        for act in existing_actions:
            session.delete(act)
            
        existing_logs = session.exec(select(AuditLog)).all()
        for log in existing_logs:
            session.delete(log)
            
        session.commit()
            
        seed_file = Path("data/pwd.json")
        if not seed_file.exists():
            print(f"⚠️ Seed file {seed_file} not found. Skipping seeding.")
            return
            
        print("🌱 Seeding PWD reports into SQLite database...")
        try:
            with open(seed_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            reporting_month = data.get("reporting_month", "June")
            reporting_year = data.get("reporting_year", 2026)
            
            action_counter = 1
            for dist in data.get("district_data", []):
                district_name = dist.get("district_name", "")
                
                notes = dist.get("officer_notes", {})
                remarks = notes.get("remarks", "")
                risks = notes.get("risks", "")
                recommendations = notes.get("recommendations", "")
                
                report = DepartmentReport(
                    department="Public Works Department (PWD)",
                    district_name=district_name,
                    reporting_month=reporting_month,
                    reporting_year=reporting_year,
                    status="submitted",
                    achievements=remarks,
                    challenges=risks,
                    recommendations=recommendations,
                    updated_by="officer@innovateindia.gov"
                )
                session.add(report)
                session.commit()
                session.refresh(report)
                
                infra = dist.get("infrastructure", {})
                infra_metric = InfrastructureMetric(
                    report_id=report.id,
                    roads_completed=infra.get("roads", {}).get("completed", 0.0),
                    roads_ongoing=infra.get("roads", {}).get("ongoing", 0.0),
                    flyovers_completed=infra.get("flyovers", {}).get("completed", 0.0),
                    flyovers_ongoing=infra.get("flyovers", {}).get("ongoing", 0.0),
                    bridges_completed=infra.get("bridges", {}).get("completed", 0.0),
                    bridges_ongoing=infra.get("bridges", {}).get("ongoing", 0.0),
                    buildings_completed=infra.get("buildings", {}).get("completed", 0.0),
                    buildings_ongoing=infra.get("buildings", {}).get("ongoing", 0.0),
                    drainage_completed=infra.get("drainage", {}).get("completed", 0.0),
                    drainage_ongoing=infra.get("drainage", {}).get("ongoing", 0.0),
                    lighting_completed=infra.get("lighting", {}).get("completed", 0.0),
                    lighting_ongoing=infra.get("lighting", {}).get("ongoing", 0.0),
                )
                session.add(infra_metric)
                
                projects_list = dist.get("projects", {}).get("list", [])
                for proj in projects_list:
                    db_proj = Project(
                        report_id=report.id,
                        project_uid=proj.get("id", ""),
                        name=proj.get("name", ""),
                        category=proj.get("type", "Roads"),
                        contractor=proj.get("contractor", ""),
                        executing_agency=proj.get("executing_agency", ""),
                        budget_allocated=proj.get("budget_allocated", 0.0),
                        budget_released=proj.get("budget_released", 0.0),
                        budget_utilized=proj.get("budget_utilized", 0.0),
                        progress=proj.get("progress", 0),
                        status=proj.get("status", "On Track"),
                        deadline=proj.get("deadline", ""),
                        officer_in_charge=proj.get("officer", ""),
                        remarks=proj.get("remarks", "")
                    )
                    session.add(db_proj)
                    
                    # Seed actions from project tasks
                    tasks_list = proj.get("tasks", [])
                    for task in tasks_list:
                        action_uid = f"ACT-{action_counter:03d}"
                        action_counter += 1
                        db_action = Action(
                            action_uid=action_uid,
                            title=task.get("name", "Task Description"),
                            description=f"Action item for PWD project: {proj.get('name')}",
                            assigned_by="PWD Headquarters",
                            assigned_to=proj.get("officer", "Er. Rajesh Kumar"),
                            district=district_name,
                            project_uid=proj.get("id", ""),
                            priority=proj.get("priority", "Medium"),
                            deadline=task.get("deadline", proj.get("deadline", "")),
                            status=task.get("stage", "Assigned"),
                            remarks="",
                            evidence_url=""
                        )
                        session.add(db_action)
                
            session.commit()
            print("✅ PWD seed data loaded successfully into SQLite!")
        except Exception as e:
            print(f"❌ Failed to seed PWD database: {e}")


def seed_health_db():
    """Seed Health report data from health.json into SQLite if table is empty."""
    from sqlmodel import Session, select
    from app.infrastructure.db.sqlite_client import engine
    import json
    
    with Session(engine) as session:
        existing_projects = session.exec(select(HealthProject)).first()
        if existing_projects:
            return
            
        existing_reports = session.exec(select(HealthReport)).all()
        for r in existing_reports:
            session.delete(r)
            
        session.commit()
            
        seed_file = Path("data/health.json")
        if not seed_file.exists():
            print(f"⚠️ Seed file {seed_file} not found. Skipping seeding.")
            return
            
        print("🌱 Seeding Health reports into SQLite database...")
        try:
            with open(seed_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            reporting_month = data.get("reporting_month", "June")
            reporting_year = data.get("reporting_year", 2026)
            
            action_counter = 1
            all_actions = session.exec(select(Action)).all()
            uids = [
                int(a.action_uid.split("-")[1])
                for a in all_actions
                if a.action_uid.startswith("ACT-") and a.action_uid.split("-")[1].isdigit()
            ]
            action_counter = max(uids) + 1 if uids else 1
            
            for dist in data.get("district_data", []):
                district_name = dist.get("district_name", "")
                
                notes = dist.get("officer_notes", {})
                remarks = notes.get("remarks", "")
                risks = notes.get("risks", "")
                recommendations = notes.get("recommendations", "")
                
                report = HealthReport(
                    department="Department of Health & Family Welfare",
                    district_name=district_name,
                    reporting_month=reporting_month,
                    reporting_year=reporting_year,
                    status="submitted",
                    achievements=remarks,
                    challenges=risks,
                    recommendations=recommendations,
                    updated_by="health_officer@innovateindia.gov"
                )
                session.add(report)
                session.commit()
                session.refresh(report)
                
                infra = dist.get("infrastructure", {})
                infra_metric = HealthMetric(
                    report_id=report.id,
                    hospitals_completed=infra.get("hospitals", {}).get("completed", 0.0),
                    hospitals_ongoing=infra.get("hospitals", {}).get("ongoing", 0.0),
                    clinics_completed=infra.get("clinics", {}).get("completed", 0.0),
                    clinics_ongoing=infra.get("clinics", {}).get("ongoing", 0.0),
                    icu_beds_completed=infra.get("icu_beds", {}).get("completed", 0.0),
                    icu_beds_ongoing=infra.get("icu_beds", {}).get("ongoing", 0.0),
                    ventilators_completed=infra.get("ventilators", {}).get("completed", 0.0),
                    ventilators_ongoing=infra.get("ventilators", {}).get("ongoing", 0.0),
                    medicine_stock_completed=infra.get("medicine_stock", {}).get("completed", 0.0),
                    medicine_stock_ongoing=infra.get("medicine_stock", {}).get("ongoing", 0.0),
                    immunization_completed=infra.get("immunization", {}).get("completed", 0.0),
                    immunization_ongoing=infra.get("immunization", {}).get("ongoing", 0.0),
                )
                session.add(infra_metric)
                
                projects_list = dist.get("projects", {}).get("list", [])
                for proj in projects_list:
                    db_proj = HealthProject(
                        report_id=report.id,
                        project_uid=proj.get("id", ""),
                        name=proj.get("name", ""),
                        category=proj.get("type", "Hospitals"),
                        contractor=proj.get("contractor", ""),
                        executing_agency=proj.get("executing_agency", ""),
                        budget_allocated=proj.get("budget_allocated", 0.0),
                        budget_released=proj.get("budget_released", 0.0),
                        budget_utilized=proj.get("budget_utilized", 0.0),
                        progress=proj.get("progress", 0),
                        status=proj.get("status", "On Track"),
                        deadline=proj.get("deadline", ""),
                        officer_in_charge=proj.get("officer", ""),
                        remarks=proj.get("remarks", "")
                    )
                    session.add(db_proj)
                    
                    tasks_list = proj.get("tasks", [])
                    for task in tasks_list:
                        action_uid = f"ACT-{action_counter:03d}"
                        action_counter += 1
                        db_action = Action(
                            action_uid=action_uid,
                            title=task.get("name", "Task Description"),
                            description=f"Action item for Health project: {proj.get('name')}",
                            assigned_by="Health Department Headquarters",
                            assigned_to=proj.get("officer", "Dr. Rajesh Sharma"),
                            district=district_name,
                            project_uid=proj.get("id", ""),
                            priority=proj.get("priority", "Medium"),
                            deadline=task.get("deadline", proj.get("deadline", "")),
                            status=task.get("stage", "Assigned"),
                            remarks="",
                            evidence_url=""
                        )
                        session.add(db_action)
                
            session.commit()
            print("✅ Health seed data loaded successfully into SQLite!")
        except Exception as e:
            print(f"❌ Failed to seed Health database: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables
    init_db()
    # Seed PWD report data if table is empty
    seed_pwd_db()
    # Seed Health report data if table is empty
    seed_health_db()
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
app.include_router(ask_election_router, prefix="/api/v1", tags=["Ask Election"])
app.include_router(complaints_router, prefix="/api/v1/complaints", tags=["Complaints"])
app.include_router(drives_router, prefix="/api/v1/drives", tags=["Drives"])
app.include_router(whatsapp_router, prefix="/api/v1/whatsapp", tags=["WhatsApp"])
app.include_router(volunteers_router, prefix="/api/v1", tags=["Volunteers"])
app.include_router(broadcasts_router, prefix="/api/v1/broadcasts", tags=["Broadcasts"])
app.include_router(dashboard_router, prefix="/api/v1", tags=["Dashboard"])
app.include_router(department_router, prefix="/api/v1/department", tags=["Department"])

from app.api.v1.endpoints.health import router as health_router
app.include_router(health_router, prefix="/api/v1/health", tags=["Health"])


@app.get("/")
def health():
    return {"status": "Backend running"}
