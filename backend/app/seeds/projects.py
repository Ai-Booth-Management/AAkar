from sqlmodel import Session, select
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.project import Project

def seed_projects():
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
