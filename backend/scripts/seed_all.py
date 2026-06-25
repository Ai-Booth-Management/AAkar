"""Run all seed scripts in order to set up a fresh database."""
import sys, os, subprocess
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlmodel import Session, create_engine, select
from app.domain.models.user import User
from app.domain.models.volunteer import Volunteer, ConversationState, Task
from app.domain.models.auth import RevokedToken
from app.domain.models.hierarchy import HierarchyNode
from app.infrastructure.db.sqlite_client import init_db
from app.core.security import hash_password

sqlite_url = "sqlite:///./data/app.db"
engine = create_engine(sqlite_url)
script_dir = os.path.dirname(os.path.abspath(__file__))

def run(script_name, label):
    print(f"\n[{label}] Running {script_name}...")
    result = subprocess.run(
        [sys.executable, os.path.join(script_dir, script_name)],
        capture_output=True, text=True, cwd=os.path.join(script_dir, '..')
    )
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr}")
        sys.exit(1)
    for line in result.stdout.strip().split('\n'):
        print(f"  {line}")
    print(f"  Done")

print("=" * 60)
print("AAKAR — Full Database Seed")
print("=" * 60)

print("\n[0/4] Initializing Database Tables...")
init_db()

run("seed_hierarchy.py", "1/4")
run("seed_delhi_mandals.py", "2/4")
run("seed_delhi_booths.py", "3/4")

print("\n[4/4] Seeding admin and manager users...")
with Session(engine) as session:
    password = hash_password("123456")
    users_data = [
        ("serveradmin@aakar.gov.in", "ELECTION_ADMIN", "Server Admin", {}),
        ("statedelhi@aakar.gov.in", "STATE_ADMIN", "Delhi State Admin", {"state_id": "DL"}),
        ("delhiadmin@aakar.gov.in", "DISTRICT_ADMIN", "East Delhi Admin",
         {"state_id": "DL", "district_id": "ED"}),
        ("cons1@aakar.gov.in", "CONSTITUENCY_MGR", "Krishna Nagar Manager",
         {"state_id": "DL", "district_id": "ED", "constituency_id": "KRN"}),
        ("defence@aakar.gov.in", "MANDAL_MGR", "Defence Colony Mandal",
         {"state_id": "DL", "district_id": "ND", "constituency_id": "JNG", "mandal_id": "JNG-DF"}),
    ]
    created = 0
    for email, role, name, heir in users_data:
        existing = session.exec(select(User).where(User.email == email)).first()
        if not existing:
            user = User(
                email=email,
                hashed_password=password,
                role=role,
                display_name=name,
                **heir
            )
            session.add(user)
            created += 1
            print(f"  Created {role}: {email}")
        else:
            print(f"  Already exists: {email}")
    session.commit()
    print(f"  Created {created} new users")

print("\n" + "=" * 60)
print("Seed complete! Login credentials:")
print("  serveradmin@aakar.gov.in / 123456  (ELECTION_ADMIN)")
print("  statedelhi@aakar.gov.in / 123456   (STATE_ADMIN)")
print("  delhiadmin@aakar.gov.in / 123456   (DISTRICT_ADMIN)")
print("  cons1@aakar.gov.in / 123456        (CONSTITUENCY_MGR)")
print("  defence@aakar.gov.in / 123456      (MANDAL_MGR)")
print("  booth.*@aakar.gov.in / 123456      (BOOTH_PRESIDENT — 240 users)")
print("=" * 60)
