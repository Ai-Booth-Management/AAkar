"""Re-initialize the SQLite database and seed demo users."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.infrastructure.db.sqlite_client import init_db, engine
from app.domain.models.user import User
from app.domain.models.volunteer import Volunteer, Task, ConversationState
from app.core.security import hash_password
from sqlmodel import Session, select

# 1. Create all tables with current schema
init_db()
print("Tables created")

# 2. Seed users
USERS = [
    {"email": "state@aakar.gov.in", "role": "STATE_ADMIN", "name": "State Administration", "h": {"state_id": "UP"}},
    {"email": "district@aakar.gov.in", "role": "DISTRICT_ADMIN", "name": "District Admin", "h": {"state_id": "UP", "district_id": "LUCKNOW"}},
    {"email": "constituency@aakar.gov.in", "role": "CONSTITUENCY_MGR", "name": "Constituency Manager", "h": {"state_id": "UP", "district_id": "LUCKNOW", "constituency_id": "LC-01"}},
    {"email": "mandal@aakar.gov.in", "role": "MANDAL_MGR", "name": "Mandal Manager", "h": {"state_id": "UP", "district_id": "LUCKNOW", "constituency_id": "LC-01", "mandal_id": "CENTRAL"}},
    {"email": "booth102@aakar.gov.in", "role": "BOOTH_PRESIDENT", "name": "Booth Node 102", "h": {"state_id": "UP", "district_id": "LUCKNOW", "constituency_id": "LC-01", "mandal_id": "CENTRAL", "booth_id": "B102"}},
    {"email": "volunteer@aakar.gov.in", "role": "VOLUNTEER", "name": "Field Worker 01", "h": {"state_id": "UP", "district_id": "LUCKNOW", "constituency_id": "LC-01", "mandal_id": "CENTRAL", "booth_id": "B102"}},
    {"email": "serveradmin@aakar.gov.in", "role": "ELECTION_ADMIN", "name": "Server Admin", "h": {}},
]

pw = hash_password("1234")
with Session(engine) as session:
    for u in USERS:
        existing = session.exec(select(User).where(User.email == u["email"])).first()
        if not existing:
            user = User(
                email=u["email"],
                hashed_password=pw,
                role=u["role"],
                display_name=u["name"],
                **u["h"],
            )
            session.add(user)
            print(f"  Created: {u['email']} ({u['role']})")
        else:
            print(f"  Exists:  {u['email']}")
    session.commit()

print("Done! Login with booth102@aakar.gov.in / 1234")
