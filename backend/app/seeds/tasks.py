from sqlmodel import Session, select
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.task import Task

def seed_tasks():
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
