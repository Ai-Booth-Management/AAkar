from sqlmodel import Session, select
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.file_tracker import FileTracker, FileTimelineEntry

def seed_files():
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
            session.flush()  # assign IDs before referencing f*.id
            session.commit()
            
            # Seed timeline entries
            # File 1
            f1 = files[0]
            assert f1.id is not None
            session.add(FileTimelineEntry(file_tracker_id=f1.id, stage="Created", timestamp="2026-06-03 10:00 AM", actor="System", details="File generated from PWD request portal."))
            
            # File 2
            f2 = files[1]
            assert f2.id is not None
            session.add(FileTimelineEntry(file_tracker_id=f2.id, stage="Created", timestamp="2026-06-14 09:30 AM", actor="System", details="File registered under Health scheme upgrades."))
            session.add(FileTimelineEntry(file_tracker_id=f2.id, stage="Forwarded", timestamp="2026-06-14 02:15 PM", actor="Assistant CMO", details="Forwarded to Chief Medical Officer (CMO) for technical audit."))
            
            # File 3
            f3 = files[2]
            assert f3.id is not None
            session.add(FileTimelineEntry(file_tracker_id=f3.id, stage="Created", timestamp="2026-06-15 11:00 AM", actor="System", details="Drainage works proposal registered."))
            session.add(FileTimelineEntry(file_tracker_id=f3.id, stage="Reviewed", timestamp="2026-06-16 03:00 PM", actor="Executive Engineer (EE)", details="Cleared desilting scope."))
            session.add(FileTimelineEntry(file_tracker_id=f3.id, stage="Approved", timestamp="2026-06-17 11:30 AM", actor="Assistant Engineer (AE)", details="Work order approved and signed."))
            
            # File 4
            f4 = files[3]
            assert f4.id is not None
            session.add(FileTimelineEntry(file_tracker_id=f4.id, stage="Created", timestamp="2026-05-26 09:00 AM", actor="System", details="Solar pump inventory request created."))
            session.add(FileTimelineEntry(file_tracker_id=f4.id, stage="Escalated", timestamp="2026-05-27 04:30 PM", actor="Agriculture Officer", details="Escalated to DM due to contract dispute."))
            
            session.commit()
            print("Files seeded successfully!")
