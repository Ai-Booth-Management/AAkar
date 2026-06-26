from sqlmodel import Session, select
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.cm_instruction import CmInstruction

def seed_instructions():
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
