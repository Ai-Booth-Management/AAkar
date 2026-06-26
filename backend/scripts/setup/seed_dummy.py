import sys
import os
from sqlmodel import Session, create_engine, select

# Add parent dir to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.domain.models.user import User
from app.core.security import hash_password

sqlite_url = "sqlite:///./data/app.db"
engine = create_engine(sqlite_url)

USERS = [
    {
        "email": "state@aakar.gov.in",
        "role": "STATE_ADMIN",
        "name": "State Administration",
        "hierarchy": {"state_id": "UP"}
    },
    {
        "email": "district@aakar.gov.in",
        "role": "DISTRICT_ADMIN",
        "name": "District Admin",
        "hierarchy": {"state_id": "UP", "district_id": "LUCKNOW"}
    },
    {
        "email": "constituency@aakar.gov.in",
        "role": "CONSTITUENCY_MGR",
        "name": "Constituency Manager",
        "hierarchy": {"state_id": "UP", "district_id": "LUCKNOW", "constituency_id": "LC-01"}
    },
    {
        "email": "mandal@aakar.gov.in",
        "role": "MANDAL_MGR",
        "name": "Mandal Manager",
        "hierarchy": {"state_id": "UP", "district_id": "LUCKNOW", "constituency_id": "LC-01", "mandal_id": "CENTRAL"}
    },
    {
        "email": "booth102@aakar.gov.in",
        "role": "BOOTH_PRESIDENT",
        "name": "Booth Node 102",
        "hierarchy": {"state_id": "UP", "district_id": "LUCKNOW", "constituency_id": "LC-01", "mandal_id": "CENTRAL", "booth_id": "B102"}
    },
    {
        "email": "volunteer@aakar.gov.in",
        "role": "VOLUNTEER",
        "name": "Field Worker 01",
        "hierarchy": {"state_id": "UP", "district_id": "LUCKNOW", "constituency_id": "LC-01", "mandal_id": "CENTRAL", "booth_id": "B102"}
    },
    {
        "email": "serveradmin@aakar.gov.in",
        "role": "ELECTION_ADMIN",
        "name": "Server Admin",
        "hierarchy": {}
    }
]

def seed_users():
    with Session(engine) as session:
        password = hash_password("1234")
        for u in USERS:
            existing = session.exec(select(User).where(User.email == u["email"])).first()
            if not existing:
                user = User(
                    email=u["email"],
                    hashed_password=password,
                    role=u["role"],
                    display_name=u["name"],
                    **u["hierarchy"]
                )
                session.add(user)
                print(f"[{u['role']}] Created mock account: {u['email']}")
            else:
                existing.role = u["role"]
                session.add(existing)
                print(f"[{u['role']}] Updated/Exists: {u['email']}")
        session.commit()

if __name__ == "__main__":
    seed_users()
