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
from app.api.v1.endpoints.drishti import router as drishti_router
from app.api.v1.endpoints.heatmap import router as heatmap_router
from app.api.v1.endpoints.tasks import router as tasks_router
from app.api.v1.endpoints.files import router as files_router
from app.api.v1.endpoints.audit import router as audit_router
from app.api.v1.endpoints.action_tracker import router as action_tracker_router
from app.api.v1.endpoints.summary import router as summary_router
from app.api.v1.endpoints.campaign import router as campaign_router
from app.domain.whatsapp_service import router as whatsapp_router
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
from app.domain.models.volunteer import Volunteer, Task as VolunteerTask, ConversationState  # noqa: F401 – ensure tables are registered
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


def seed_projects():
    from sqlmodel import Session, select
    from app.infrastructure.db.sqlite_client import engine
    from app.domain.models.project import Project
    
    with Session(engine) as session:
        statement = select(Project)
        existing = session.exec(statement).first()
        if not existing:
            projects = [
                Project(
                    name="Smart Water Supply Metering",
                    department="PWD",
                    budget="₹1.20 Cr",
                    allocated=12000000,
                    released=8000000,
                    utilized=6000000,
                    remaining=6000000,
                    deadline="2026-12-15",
                    progress=65,
                    officer="Suresh Kumar (EE)",
                    status="In Progress"
                ),
                Project(
                    name="Government School Solarization",
                    department="Education",
                    budget="₹45.00 L",
                    allocated=4500000,
                    released=3000000,
                    utilized=2000000,
                    remaining=2500000,
                    deadline="2026-08-20",
                    progress=40,
                    officer="Amit Verma (AE)",
                    status="In Progress"
                ),
                Project(
                    name="Primary Health Center Upgrade",
                    department="Health",
                    budget="₹2.40 Cr",
                    allocated=24000000,
                    released=20000000,
                    utilized=18000000,
                    remaining=6000000,
                    deadline="2026-11-01",
                    progress=90,
                    officer="Dr. Rakesh Sharma (CMO)",
                    status="Pending Approval"
                ),
                Project(
                    name="Micro-Irrigation Solar Pumps",
                    department="Agriculture",
                    budget="₹85.00 L",
                    allocated=8500000,
                    released=5000000,
                    utilized=1500000,
                    remaining=7000000,
                    deadline="2026-07-30",
                    progress=15,
                    officer="Priya Sen (DCP)",
                    status="In Progress"
                ),
                Project(
                    name="Drainage Desilting Phase 2",
                    department="PWD",
                    budget="₹60.00 L",
                    allocated=6000000,
                    released=4000000,
                    utilized=3000000,
                    remaining=3000000,
                    deadline="2026-06-25",
                    progress=50,
                    officer="Vinod Rawat (SE)",
                    status="Delayed"
                )
            ]
            session.add_all(projects)
            session.commit()
            print("Projects seeded successfully!")


def seed_district_metrics():
    from sqlmodel import Session, select
    from app.infrastructure.db.sqlite_client import engine
    from app.domain.models.district_metric import DistrictMetric
    
    with Session(engine) as session:
        statement = select(DistrictMetric)
        existing = session.exec(statement).first()
        if not existing:
            metrics = [
                DistrictMetric(
                    name="North West",
                    status="STABLE",
                    complaints_total=48, complaints_sanitation=15, complaints_water=12, complaints_roads=14, complaints_electricity=7,
                    solved_total=38, solved_sanitation=12, solved_water=10, solved_roads=11, solved_electricity=5,
                    active_total=10, active_sanitation=3, active_water=2, active_roads=3, active_electricity=2,
                    avg_response="24h",
                    escalations=1,
                    alerts_health=1,
                    alerts_education=2,
                    project_name="Outer Ring Drainage",
                    project_status="Active",
                    officer_sanitation="Mr. Rajeev Kumar (MCD Sanitation Division)",
                    officer_water="Mr. S. K. Dwivedi (Delhi Jal Board - West)",
                    officer_roads="Mr. Vinod Prasad (PWD NW Zone)",
                    officer_electricity="Mr. Ramesh Saxena (Tata Power DDL)"
                ),
                DistrictMetric(
                    name="North",
                    status="STABLE",
                    complaints_total=12, complaints_sanitation=3, complaints_water=4, complaints_roads=3, complaints_electricity=2,
                    solved_total=10, solved_sanitation=3, solved_water=3, solved_roads=2, solved_electricity=2,
                    active_total=2, active_sanitation=0, active_water=1, active_roads=1, active_electricity=0,
                    avg_response="12h",
                    escalations=0,
                    alerts_health=0,
                    alerts_education=0,
                    project_name="Heritage Wall Conservation",
                    project_status="Completed",
                    officer_sanitation="Mrs. Anjali Roy (MCD North Zone)",
                    officer_water="Mr. S. K. Bose (DJB North Zone)",
                    officer_roads="Mr. P. K. Singh (PWD North)",
                    officer_electricity="Mr. Sanjay Dutt (Tata Power)"
                ),
                DistrictMetric(
                    name="North East",
                    status="STABLE",
                    complaints_total=35, complaints_sanitation=12, complaints_water=8, complaints_roads=10, complaints_electricity=5,
                    solved_total=28, solved_sanitation=10, solved_water=6, solved_roads=8, solved_electricity=4,
                    active_total=7, active_sanitation=2, active_water=2, active_roads=2, active_electricity=1,
                    avg_response="36h",
                    escalations=1,
                    alerts_health=1,
                    alerts_education=1,
                    project_name="Yamuna East Embankment",
                    project_status="Active",
                    officer_sanitation="Mr. Satish Pal (MCD NE Zone)",
                    officer_water="Mr. V. K. Jain (DJB East)",
                    officer_roads="Mr. S. C. Verma (MCD Works Dept)",
                    officer_electricity="Mr. J. K. Gupta (BSES Yamuna)"
                ),
                DistrictMetric(
                    name="Shahdara",
                    status="STABLE",
                    complaints_total=29, complaints_sanitation=9, complaints_water=7, complaints_roads=8, complaints_electricity=5,
                    solved_total=22, solved_sanitation=7, solved_water=5, solved_roads=6, solved_electricity=4,
                    active_total=7, active_sanitation=2, active_water=2, active_roads=2, active_electricity=1,
                    avg_response="28h",
                    escalations=0,
                    alerts_health=0,
                    alerts_education=1,
                    project_name="N/A",
                    project_status="None",
                    officer_sanitation="Mr. Amit Sharma (MCD Shahdara)",
                    officer_water="Mr. R. K. Mishra (DJB Shahdara)",
                    officer_roads="Mr. L. N. Rao (MCD Works)",
                    officer_electricity="Mr. Naveen Lal (BSES Yamuna)"
                ),
                DistrictMetric(
                    name="East",
                    status="STABLE",
                    complaints_total=41, complaints_sanitation=14, complaints_water=10, complaints_roads=12, complaints_electricity=5,
                    solved_total=32, solved_sanitation=11, solved_water=8, solved_roads=9, solved_electricity=4,
                    active_total=9, active_sanitation=3, active_water=2, active_roads=3, active_electricity=1,
                    avg_response="30h",
                    escalations=1,
                    alerts_health=2,
                    alerts_education=1,
                    project_name="Mayur Vihar Flyover Expansion",
                    project_status="Active",
                    officer_sanitation="Ms. Neha Gupta (MCD East Zone)",
                    officer_water="Mr. H. S. Rawat (DJB East)",
                    officer_roads="Mr. P. R. Chawla (PWD East)",
                    officer_electricity="Mr. A. K. Joshi (BSES Yamuna)"
                ),
                DistrictMetric(
                    name="West",
                    status="STABLE",
                    complaints_total=52, complaints_sanitation=18, complaints_water=14, complaints_roads=12, complaints_electricity=8,
                    solved_total=40, solved_sanitation=14, solved_water=11, solved_roads=9, solved_electricity=6,
                    active_total=12, active_sanitation=4, active_water=3, active_roads=3, active_electricity=2,
                    avg_response="26h",
                    escalations=2,
                    alerts_health=1,
                    alerts_education=3,
                    project_name="Janakpuri Community Park",
                    project_status="Completed",
                    officer_sanitation="Mr. Vinay Yadav (MCD West Zone)",
                    officer_water="Mr. Anil Nair (DJB West)",
                    officer_roads="Mr. S. K. Grover (PWD West)",
                    officer_electricity="Mr. R. S. Negi (BSES Rajdhani)"
                ),
                DistrictMetric(
                    name="Central",
                    status="CRITICAL",
                    complaints_total=138, complaints_sanitation=45, complaints_water=38, complaints_roads=35, complaints_electricity=20,
                    solved_total=92, solved_sanitation=30, solved_water=25, solved_roads=24, solved_electricity=13,
                    active_total=46, active_sanitation=15, active_water=13, active_roads=11, active_electricity=7,
                    avg_response="48h",
                    escalations=8,
                    alerts_health=7,
                    alerts_education=4,
                    project_name="Walled City Sanitation Drive",
                    project_status="Active",
                    officer_sanitation="Mr. Manoj Dwivedi (Executive Engineer, MCD Central Zone)",
                    officer_water="Mr. Rajesh Saxena (Superintendent Engineer, DJB Central)",
                    officer_roads="Mr. P. S. Oberoi (Executive Engineer, PWD Central)",
                    officer_electricity="Mr. V. K. Aggarwal (General Manager, BSES Yamuna)"
                ),
                DistrictMetric(
                    name="New Delhi",
                    status="STABLE",
                    complaints_total=67, complaints_sanitation=20, complaints_water=18, complaints_roads=15, complaints_electricity=14,
                    solved_total=52, solved_sanitation=16, solved_water=14, solved_roads=12, solved_electricity=10,
                    active_total=15, active_sanitation=4, active_water=4, active_roads=3, active_electricity=4,
                    avg_response="18h",
                    escalations=2,
                    alerts_health=2,
                    alerts_education=1,
                    project_name="Kartavya Path Landscaping",
                    project_status="Active",
                    officer_sanitation="Mr. Sanjay Malhotra (Director of Health, NDMC)",
                    officer_water="Mr. Ramesh Lal (Chief Civil Engineer, NDMC)",
                    officer_roads="Mr. Amit Sen (Chief Road Engineer, NDMC)",
                    officer_electricity="Mr. Anil Mehta (Director of Power, NDMC)"
                ),
                DistrictMetric(
                    name="South West",
                    status="STABLE",
                    complaints_total=33, complaints_sanitation=10, complaints_water=9, complaints_roads=9, complaints_electricity=5,
                    solved_total=27, solved_sanitation=8, solved_water=8, solved_roads=7, solved_electricity=4,
                    active_total=6, active_sanitation=2, active_water=1, active_roads=2, active_electricity=1,
                    avg_response="22h",
                    escalations=0,
                    alerts_health=1,
                    alerts_education=0,
                    project_name="Dwarka Sector 21 School",
                    project_status="Pending",
                    officer_sanitation="Mr. K. S. Rao (MCD SW Zone Director)",
                    officer_water="Mr. T. C. Sharma (DJB SW Executive)",
                    officer_roads="Mr. Rohit Gupta (MCD Works SW)",
                    officer_electricity="Mr. Devendra Pal (BSES Rajdhani)"
                ),
                DistrictMetric(
                    name="South",
                    status="CRITICAL",
                    complaints_total=92, complaints_sanitation=30, complaints_water=24, complaints_roads=23, complaints_electricity=15,
                    solved_total=66, solved_sanitation=22, solved_water=16, solved_roads=17, solved_electricity=11,
                    active_total=26, active_sanitation=8, active_water=8, active_roads=6, active_electricity=4,
                    avg_response="38h",
                    escalations=4,
                    alerts_health=4,
                    alerts_education=2,
                    project_name="Saket Smart Hub Integration",
                    project_status="Active",
                    officer_sanitation="Ms. Aarti Sharma (Executive Engineer, MCD South)",
                    officer_water="Mr. S. K. Nair (Superintendent Engineer, DJB South)",
                    officer_roads="Mr. Manoj Rawat (Executive Engineer, PWD South)",
                    officer_electricity="Mr. Amit Bhatia (General Manager, BSES Rajdhani)"
                ),
                DistrictMetric(
                    name="South East",
                    status="STABLE",
                    complaints_total=44, complaints_sanitation=15, complaints_water=11, complaints_roads=12, complaints_electricity=6,
                    solved_total=34, solved_sanitation=12, solved_water=8, solved_roads=9, solved_electricity=5,
                    active_total=10, active_sanitation=3, active_water=3, active_roads=3, active_electricity=1,
                    avg_response="32h",
                    escalations=1,
                    alerts_health=2,
                    alerts_education=0,
                    project_name="Okhla STP Upgradation",
                    project_status="Pending",
                    officer_sanitation="Mr. Rajesh Tiwari (MCD SE Zone)",
                    officer_water="Mr. K. K. Sharma (DJB SE Executive)",
                    officer_roads="Mr. S. P. Yadav (PWD SE)",
                    officer_electricity="Mr. R. K. Mittal (BSES Rajdhani)"
                )
            ]
            session.add_all(metrics)
            session.commit()
            print("District metrics seeded successfully!")


def seed_tasks():
    from sqlmodel import Session, select
    from app.infrastructure.db.sqlite_client import engine
    from app.domain.models.task import Task
    
    with Session(engine) as session:
        statement = select(Task)
        existing = session.exec(statement).first()
        if not existing:
            tasks = [
                Task(
                    title="Okhla Waste Plant Inspection",
                    description="Inspect solid waste processing units and report daily capacity throughput vs backlog.",
                    deadline="2026-06-25",
                    priority="High",
                    status="Pending",
                    type="Inspection",
                    assigned_to="BDO"
                ),
                Task(
                    title="Dwarka Sub-station Power Load Review",
                    description="Review peak evening hours electricity consumption data to prevent transformer outages.",
                    deadline="2026-06-30",
                    priority="Medium",
                    status="In Progress",
                    type="Review",
                    assigned_to="Department Officer"
                ),
                Task(
                    title="Rohini Jal Vihar Water Survey",
                    description="Conduct door-to-door water pressure quality survey across Sector 9 residential wards.",
                    deadline="2026-07-05",
                    priority="Low",
                    status="Pending",
                    type="Survey",
                    assigned_to="SDO"
                ),
                Task(
                    title="PWD Drainage Desilting Compliance",
                    description="Verify PWD compliance with monsoon preparedness standards for structural storm drains.",
                    deadline="2026-06-23",
                    priority="High",
                    status="Completed",
                    type="Compliance Check",
                    assigned_to="BDO"
                )
            ]
            session.add_all(tasks)
            session.commit()
            print("Tasks seeded successfully!")


def seed_files():
    from sqlmodel import Session, select
    from app.infrastructure.db.sqlite_client import engine
    from app.domain.models.file_tracker import FileTracker, FileTimelineEntry
    
    with Session(engine) as session:
        statement = select(FileTracker)
        existing = session.exec(statement).first()
        if not existing:
            files = [
                FileTracker(
                    title="Land Acquisition Permit - Central Ridge Corridor",
                    department="PWD",
                    current_holder="Executive Engineer, PWD Central",
                    status="Pending",
                    days_pending=14
                ),
                FileTracker(
                    title="Primary Health Center Solar Installation Fund Allocation",
                    department="Health",
                    current_holder="Chief Medical Officer (CMO)",
                    status="Forwarded",
                    days_pending=3
                ),
                FileTracker(
                    title="Dwarka Drainage Desilting Work Order Approval",
                    department="PWD",
                    current_holder="Assistant Engineer (AE)",
                    status="Approved",
                    days_pending=0
                ),
                FileTracker(
                    title="Procurement of Solar Water Pumps for Agriculture Clusters",
                    department="Agriculture",
                    current_holder="District Magistrate (DM)",
                    status="Escalated",
                    days_pending=22
                )
            ]
            session.add_all(files)
            session.commit()
            
            # Seed timeline entries
            # File 1
            f1 = files[0]
            session.add(FileTimelineEntry(file_tracker_id=f1.id, stage="Created", timestamp="2026-06-03 10:00 AM", actor="System", details="File generated from PWD request portal."))
            
            # File 2
            f2 = files[1]
            session.add(FileTimelineEntry(file_tracker_id=f2.id, stage="Created", timestamp="2026-06-14 09:30 AM", actor="System", details="File registered under Health scheme upgrades."))
            session.add(FileTimelineEntry(file_tracker_id=f2.id, stage="Forwarded", timestamp="2026-06-14 02:15 PM", actor="Assistant CMO", details="Forwarded to Chief Medical Officer (CMO) for technical audit."))
            
            # File 3
            f3 = files[2]
            session.add(FileTimelineEntry(file_tracker_id=f3.id, stage="Created", timestamp="2026-06-15 11:00 AM", actor="System", details="Drainage works proposal registered."))
            session.add(FileTimelineEntry(file_tracker_id=f3.id, stage="Reviewed", timestamp="2026-06-16 03:00 PM", actor="Executive Engineer (EE)", details="Cleared desilting scope."))
            session.add(FileTimelineEntry(file_tracker_id=f3.id, stage="Approved", timestamp="2026-06-17 11:30 AM", actor="Assistant Engineer (AE)", details="Work order approved and signed."))
            
            # File 4
            f4 = files[3]
            session.add(FileTimelineEntry(file_tracker_id=f4.id, stage="Created", timestamp="2026-05-26 09:00 AM", actor="System", details="Solar pump inventory request created."))
            session.add(FileTimelineEntry(file_tracker_id=f4.id, stage="Escalated", timestamp="2026-05-27 04:30 PM", actor="Agriculture Officer", details="Escalated to DM due to contract dispute."))
            
            session.commit()
            print("Files seeded successfully!")


def seed_instructions():
    from sqlmodel import Session, select
    from app.infrastructure.db.sqlite_client import engine
    from app.domain.models.cm_instruction import CmInstruction
    
    with Session(engine) as session:
        statement = select(CmInstruction)
        existing = session.exec(statement).first()
        if not existing:
            instructions = [
                CmInstruction(
                    title="North West PWD Drainage Clearance",
                    description="Clear all clogged storm drains along outer ring road sectors immediately before monsoon onset.",
                    deadline="2026-06-25",
                    priority="High",
                    status="Assigned",
                    created_at="2026-06-18 10:00:00"
                ),
                CmInstruction(
                    title="Critical Health Infrastructure Solarization",
                    description="Ensure solar backup batteries at PHC Najafgarh are installed and fully operational.",
                    deadline="2026-07-02",
                    priority="High",
                    status="Accepted",
                    created_at="2026-06-17 11:30:00",
                    action_taken="Procurement orders cleared by DM. Installation team dispatched."
                ),
                CmInstruction(
                    title="Voter Registry Data Sync Verification",
                    description="Verify that the newly uploaded voter registry CSV synchronizes completely to Neo4j graph nodes.",
                    deadline="2026-06-28",
                    priority="Medium",
                    status="In Progress",
                    created_at="2026-06-18 12:15:00",
                    action_taken="Data ingestion completed. Running automated validation test cases."
                ),
                CmInstruction(
                    title="Emergency Solar Pump Distribution",
                    description="Distribute solar irrigation pumps to critical agricultural cooperatives in West Zone.",
                    deadline="2026-06-15",
                    priority="High",
                    status="Completed",
                    created_at="2026-06-10 09:00:00",
                    action_taken="50 pumps distributed and signed receipts collected from coop heads."
                )
            ]
            session.add_all(instructions)
            session.commit()
            print("CM Instructions seeded successfully!")


def seed_campaign_volunteers():
    from datetime import datetime
    import random
    from sqlmodel import Session, select
    from app.infrastructure.db.sqlite_client import engine
    from app.domain.models.campaign import CampaignVolunteer, ConstituencyCoverage

    DELHI_DISTRICTS = [
        'Central', 'East', 'New Delhi', 'North', 'North East',
        'North West', 'Shahdara', 'South', 'South East', 'South West', 'West'
    ]

    CONSTITUENCIES = {
        'Central':    ['Ballimaran', 'Burari', 'Chandni Chowk', 'Karol Bagh', 'Matia Mahal', 'Sadar Bazar', 'Timarpur'],
        'East':       ['Gandhi Nagar', 'Kondli', 'Krishna Nagar', 'Laxmi Nagar', 'Patparganj', 'Trilokpuri'],
        'New Delhi':  ['Delhi Cantt', 'Greater Kailash', 'New Delhi', 'Patel Nagar', 'R K Puram', 'Rajinder Nagar'],
        'North':      ['Adarsh Nagar', 'Badli', 'Bawana', 'Model Town', 'Narela', 'Rohini', 'Shakur Basti', 'Wazirpur'],
        'North East': ['Ghonda', 'Gokalpur', 'Karawal Nagar', 'Mustafabad', 'Seelampur'],
        'North West': ['Kirari', 'Mangol Puri', 'Mundka', 'Rithala', 'Shalimar Bagh', 'Sultanpur Majra', 'Tri Nagar'],
        'Shahdara':   ['Babarpur', 'Rohtas Nagar', 'Seema Puri', 'Shahdara', 'Vishwas Nagar'],
        'South':      ['Ambedkar Nagar', 'Chhatarpur', 'Deoli', 'Malviya Nagar', 'Mehrauli'],
        'South East': ['Badarpur', 'Jangpura', 'Kalkaji', 'Kasturba Nagar', 'Okhla', 'Sangam Vihar', 'Tughlakabad'],
        'South West': ['Bijwasan', 'Dwarka', 'Matiala', 'Najafgarh', 'Palam', 'Uttam Nagar', 'Vikaspuri'],
        'West':       ['Hari Nagar', 'Janakpuri', 'Madipur', 'Moti Nagar', 'Nangloi Jat', 'Rajouri Garden', 'Tilak Nagar'],
    }

    DISTRICT_CENTERS = {
        'Central':    [28.6517, 77.2219],
        'East':       [28.6342, 77.3010],
        'New Delhi':  [28.6139, 77.2090],
        'North':      [28.7041, 77.1025],
        'North East': [28.7000, 77.2620],
        'North West': [28.7140, 77.0989],
        'Shahdara':   [28.6717, 77.2880],
        'South':      [28.5244, 77.2066],
        'South East': [28.5623, 77.2905],
        'South West': [28.5876, 77.0614],
        'West':       [28.6271, 77.0947],
    }

    from shapely.geometry import shape, Point
    from pathlib import Path
    import json

    geojson_path = Path("c:/Users/Pavithran/AAkar/frontend/public/delhi_constituencies_new.geojson")
    if not geojson_path.exists():
        geojson_path = Path(__file__).parent.parent.parent / "frontend/public/delhi_constituencies_new.geojson"

    const_geoms = {}
    if geojson_path.exists():
        try:
            with open(geojson_path, "r", encoding="utf-8") as f:
                geojson_data = json.load(f)
            for feat in geojson_data.get("features", []):
                name = feat["properties"].get("AC_NAME", "")
                if name:
                    norm_name = "".join(name.replace(' (SC)', '').replace('(SC)', '').replace('-', ' ').replace('.', '').strip().lower().split())
                    const_geoms[norm_name] = shape(feat["geometry"])
        except Exception as e:
            print("Error loading geojson in seed:", e)

    def get_random_point_in_geom(geom, fallback_y, fallback_x):
        try:
            minx, miny, maxx, maxy = geom.bounds
            for _ in range(200):
                p = Point(random.uniform(minx, maxx), random.uniform(miny, maxy))
                if geom.contains(p):
                    return p.y, p.x
            c = geom.centroid
            return c.y, c.x
        except Exception:
            return fallback_y, fallback_x

    with Session(engine) as session:
        statement = select(CampaignVolunteer)
        existing = session.exec(statement).first()
        if not existing:
            # First, ensure all constituency coverage rows exist
            for district, constits in CONSTITUENCIES.items():
                for c in constits:
                    cov_exist = session.exec(
                        select(ConstituencyCoverage)
                        .where(ConstituencyCoverage.district == district)
                        .where(ConstituencyCoverage.constituency == c)
                    ).first()
                    if not cov_exist:
                        session.add(ConstituencyCoverage(district=district, constituency=c))
            session.commit()

            NAMES = [
                'Rajesh Kumar', 'Priya Singh', 'Amit Sharma', 'Sunita Devi', 'Manish Yadav',
                'Kavita Gupta', 'Rohit Verma', 'Anjali Mehta', 'Deepak Joshi', 'Pooja Patel',
                'Vinod Chauhan', 'Rekha Nair', 'Aman Verma', 'Neha Sharma', 'Vikram Singh',
                'Siddharth Malhotra', 'Ritu Kapoor', 'Sanjay Dutt', 'Divya Bharti', 'Arjun Rampal'
            ]
            TASKS = [
                'Voter outreach', 'Door-to-door canvassing', 'Booth monitoring',
                'Pamphlet distribution', 'Rally coordination'
            ]

            volunteers = []
            for district in DELHI_DISTRICTS:
                center = DISTRICT_CENTERS[district]
                constits = CONSTITUENCIES[district]
                num_vols = random.randint(8, 12)
                for i in range(num_vols):
                    name = NAMES[(i + len(district)) % len(NAMES)]
                    phone = f"+91 98{random.randint(10000000, 99999999)}"
                    constituency = random.choice(constits)
                    area = f"{constituency} Sector {random.choice(['A', 'B', 'C', 'Market', 'Residential'])}"
                    task_status = random.choice(["unassigned", "assigned", "accepted", "completed"])
                    task = random.choice(TASKS) if task_status != "unassigned" else ""

                    # Compute scattered coordinates inside constituency
                    norm_c = "".join(constituency.replace(' (SC)', '').replace('(SC)', '').replace('-', ' ').replace('.', '').strip().lower().split())
                    geom = const_geoms.get(norm_c)
                    if geom:
                        lat, lng = get_random_point_in_geom(geom, center[0], center[1])
                    else:
                        lat = center[0] + (random.random() - 0.5) * 0.018
                        lng = center[1] + (random.random() - 0.5) * 0.018

                    status = "active" if random.random() > 0.3 else "inactive"
                    coverage_status = "covered" if random.random() > 0.45 else "pending"
                    last_update = datetime.utcnow().isoformat()

                    vol = CampaignVolunteer(
                        name=name,
                        phone=phone,
                        district=district,
                        constituency=constituency,
                        assigned_area=area,
                        assigned_task=task,
                        lat=lat,
                        lng=lng,
                        status=status,
                        coverage_status=coverage_status,
                        task_status=task_status,
                        last_location_update=last_update
                    )
                    volunteers.append(vol)
                    
                    if coverage_status == "covered":
                        cov = session.exec(
                            select(ConstituencyCoverage)
                            .where(ConstituencyCoverage.district == district)
                            .where(ConstituencyCoverage.constituency == constituency)
                        ).first()
                        if cov:
                            cov.covered = True
                            cov.covered_by = name
                            cov.covered_at = last_update
                            cov.updated_at = last_update
                            session.add(cov)
                            
            session.add_all(volunteers)
            session.commit()
            print("Campaign volunteers seeded successfully!")


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
