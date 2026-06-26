import sys
import os
from sqlmodel import Session, select, func
from datetime import datetime, timezone

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.infrastructure.db.sqlite_client import engine
from app.domain.models.project import Project, ProjectJustification
from app.domain.models.task import Task
from app.domain.models.file_tracker import FileTracker, FileTimelineEntry
from app.domain.models.system_config import SystemConfig
from app.domain.models.volunteer import Volunteer, VolunteerTask, ConversationState

def main():
    with Session(engine) as session:
        # 1. ProjectJustification (needs at least 5)
        # Check existing projects
        projects = session.exec(select(Project)).all()
        if not projects:
            print("No projects found to link justifications to.")
            return

        justifications_count = session.exec(select(func.count()).select_from(ProjectJustification)).one()
        if justifications_count < 5:
            print(f"Seeding ProjectJustification (current: {justifications_count})...")
            p_id = projects[0].id
            justs = [
                ProjectJustification(
                    project_id=p_id,
                    action="Approved extra budget",
                    user="statedelhi@aakar.gov.in",
                    text="Requested supplementary budget allocation due to raw material price inflation.",
                    timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                ),
                ProjectJustification(
                    project_id=p_id,
                    action="Extended deadline",
                    user="delhiadmin@aakar.gov.in",
                    text="Extended deadline by 2 months owing to monsoon waterlogging delays.",
                    timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                ),
                ProjectJustification(
                    project_id=p_id,
                    action="Change in executive officer",
                    user="statedelhi@aakar.gov.in",
                    text="Transferred command to Senior Engineer Amit Verma for acceleration.",
                    timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                ),
                ProjectJustification(
                    project_id=p_id,
                    action="Scope expansion",
                    user="serveradmin@aakar.gov.in",
                    text="Added smart metering nodes to neighboring wards under PWD mandate.",
                    timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                ),
                ProjectJustification(
                    project_id=p_id,
                    action="Material approval",
                    user="delhiadmin@aakar.gov.in",
                    text="Approved procurement of high-grade copper pipes from local vendor.",
                    timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                )
            ]
            session.add_all(justs)
            print(f"Added {len(justs)} ProjectJustification entries.")

        # 2. Task (current: 4, needs at least 5)
        tasks_count = session.exec(select(func.count()).select_from(Task)).one()
        if tasks_count < 5:
            print(f"Seeding Task (current: {tasks_count})...")
            new_tasks = [
                Task(
                    title="Yamuna Water Level Monitoring",
                    description="Record daily water levels at Wazirabad barrage and sync to central database.",
                    deadline="2026-07-10",
                    priority="High",
                    status="Pending",
                    type="Monitoring",
                    assigned_to="SDO"
                ),
                Task(
                    title="Primary Health Center Vaccine Stock Audit",
                    description="Verify cold storage temperatures and stock count of vaccine vials in East Delhi PHC.",
                    deadline="2026-07-15",
                    priority="Medium",
                    status="Pending",
                    type="Audit",
                    assigned_to="BDO"
                )
            ]
            session.add_all(new_tasks)
            print(f"Added {len(new_tasks)} Tasks.")

        # 3. FileTracker (current: 4, needs at least 5)
        files_count = session.exec(select(func.count()).select_from(FileTracker)).one()
        if files_count < 5:
            print(f"Seeding FileTracker (current: {files_count})...")
            new_files = [
                FileTracker(
                    title="Environmental Clearance - Karol Bagh Flyover Phase III",
                    department="Environment",
                    current_holder="Environmental Officer, Delhi Govt",
                    status="Pending",
                    days_pending=12
                ),
                FileTracker(
                    title="Sadar Bazar Smart Lighting System Tender Allocation",
                    department="Electricity",
                    current_holder="Superintendent Engineer, Power Dept",
                    status="Escalated",
                    days_pending=18
                )
            ]
            session.add_all(new_files)
            print(f"Added {len(new_files)} FileTrackers.")

        # 4. Volunteer (current: 0, needs at least 5)
        volunteers_count = session.exec(select(func.count()).select_from(Volunteer)).one()
        if volunteers_count < 5:
            print(f"Seeding Volunteer (current: {volunteers_count})...")
            vols = [
                Volunteer(phone="919876543210", name="Arjun Kumar", booth_id="B01", status="active"),
                Volunteer(phone="919876543211", name="Sita Sharma", booth_id="B02", status="active"),
                Volunteer(phone="919876543212", name="Rohan Das", booth_id="B03", status="active"),
                Volunteer(phone="919876543213", name="Meera Sen", booth_id="B04", status="pending"),
                Volunteer(phone="919876543214", name="Vikram Adityan", booth_id="B05", status="active")
            ]
            session.add_all(vols)
            session.commit() # Commit to get volunteer IDs
            print(f"Added {len(vols)} Volunteers.")

            # 5. VolunteerTask (current: 0, needs at least 5)
            # Re-fetch volunteers to get their IDs
            db_vols = session.exec(select(Volunteer)).all()
            print("Seeding VolunteerTask...")
            vol_tasks = [
                VolunteerTask(volunteer_id=db_vols[0].id, booth_id="B01", title="Voter slip distribution", description="Distribute slips in Sector 1", status="assigned"),
                VolunteerTask(volunteer_id=db_vols[1].id, booth_id="B02", title="Booth desk setup", description="Set up registration desk at center", status="completed", completed_at=datetime.now(timezone.utc)),
                VolunteerTask(volunteer_id=db_vols[2].id, booth_id="B03", title="Banner assembly", description="Assemble camp banners at booth entry", status="assigned"),
                VolunteerTask(volunteer_id=db_vols[3].id, booth_id="B04", title="Outreach call logs", description="Log calls to local voters list", status="assigned"),
                VolunteerTask(volunteer_id=db_vols[4].id, booth_id="B05", title="Monsoon prep check", description="Check water pooling status near booth entrance", status="completed", completed_at=datetime.now(timezone.utc))
            ]
            session.add_all(vol_tasks)
            print(f"Added {len(vol_tasks)} VolunteerTasks.")

        # 6. ConversationState (current: 0, needs at least 5)
        convs_count = session.exec(select(func.count()).select_from(ConversationState)).one()
        if convs_count < 5:
            print(f"Seeding ConversationState (current: {convs_count})...")
            convs = [
                ConversationState(phone="918888888880", current_step="awaiting_name", collected_data='{"step":"init"}'),
                ConversationState(phone="918888888881", current_step="awaiting_booth", collected_data='{"name":"Rajesh"}'),
                ConversationState(phone="918888888882", current_step="awaiting_confirmation", collected_data='{"name":"Sunita","booth":"B02"}'),
                ConversationState(phone="918888888883", current_step="completed", collected_data='{"name":"Aman","booth":"B03"}'),
                ConversationState(phone="918888888884", current_step="awaiting_name", collected_data='{"step":"init"}')
            ]
            session.add_all(convs)
            print(f"Added {len(convs)} ConversationStates.")

        # 7. SystemConfig (current: 1, needs at least 5)
        config_count = session.exec(select(func.count()).select_from(SystemConfig)).one()
        if config_count < 5:
            print(f"Seeding SystemConfig (current: {config_count})...")
            configs = [
                SystemConfig(key="app_name", value="AAkar"),
                SystemConfig(key="version", value="1.0.0"),
                SystemConfig(key="maintenance_mode", value="false"),
                SystemConfig(key="sync_interval_seconds", value="300")
            ]
            session.add_all(configs)
            print(f"Added {len(configs)} SystemConfig keys.")

        session.commit()
        print("Database seed verified successfully!")

if __name__ == "__main__":
    main()
