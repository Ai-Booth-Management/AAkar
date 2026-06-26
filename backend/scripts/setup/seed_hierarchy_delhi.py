import sys
import os
import json
from pathlib import Path
from sqlmodel import Session, create_engine, select

# Ensure the backend root is on the path
backend_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_root))

from app.domain.models.hierarchy import HierarchyNode
from app.domain.models.user import User
from app.core.security import hash_password

sqlite_url = "sqlite:///./data/app.db"
engine = create_engine(sqlite_url)

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

def normalize_name(s: str) -> str:
    return "".join(s.lower().replace('(sc)', '').replace('(st)', '').replace('-', ' ').replace('.', '').split())

def seed():
    # Load ward_to_constituency mapping
    json_path = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "public" / "ward_to_constituency.json"
    if not json_path.exists():
        print(f"Error: {json_path} not found")
        sys.exit(1)
        
    with open(json_path, "r", encoding="utf-8") as f:
        wards_data = json.load(f)
        
    # Map normalized constituency to list of wards
    const_to_wards = {}
    for item in wards_data:
        c_norm = normalize_name(item["Constituency"])
        const_to_wards.setdefault(c_norm, []).append(item)

    with Session(engine) as session:
        # Clear existing HierarchyNode
        print("Clearing HierarchyNode table...")
        for node in session.exec(select(HierarchyNode)).all():
            session.delete(node)
        session.commit()

        # Seed Delhi State
        state_node = HierarchyNode(code="DL", name="Delhi", level="state", parent_id=None)
        session.add(state_node)
        session.flush()
        print(f"Seeded State: {state_node.name}")

        for district, consts in CONSTITUENCIES.items():
            dist_code = district.upper().replace(" ", "_")
            dist_node = HierarchyNode(code=dist_code, name=district, level="district", parent_id=state_node.id)
            session.add(dist_node)
            session.flush()
            print(f"Seeded District: {dist_node.name} ({dist_code})")

            for const in consts:
                const_code = f"C-{const.upper().replace(' ', '_').replace('(', '').replace(')', '')}"
                const_node = HierarchyNode(code=const_code, name=const, level="constituency", parent_id=dist_node.id)
                session.add(const_node)
                session.flush()

                # Find wards
                norm_c = normalize_name(const)
                wards = const_to_wards.get(norm_c, [])
                for ward in wards:
                    if not ward.get("Ward_No") or not ward.get("Ward_Name"):
                        continue
                    ward_code = f"W-{ward['Ward_No']}"
                    ward_node = HierarchyNode(code=ward_code, name=ward["Ward_Name"], level="mandal", parent_id=const_node.id)
                    session.add(ward_node)
                    session.flush()

                    # 2 booths per ward
                    for i in (1, 2):
                        b_code = f"B-{ward['Ward_No']}-{i}"
                        b_name = f"{ward['Ward_Name']} Booth {i}"
                        booth_node = HierarchyNode(code=b_code, name=b_name, level="booth", parent_id=ward_node.id)
                        session.add(booth_node)
                
        session.commit()
        print("Seeded hierarchy nodes successfully!")

        # Now clean up old users and seed new users aligned with Delhi hierarchy
        print("Re-seeding users aligned with Delhi...")
        for u in session.exec(select(User)).all():
            session.delete(u)
        session.commit()

        password = hash_password("1234")
        users = [
            User(email="serveradmin@aakar.gov.in", hashed_password=password, role="ELECTION_ADMIN", display_name="Server Admin"),
            User(email="state@aakar.gov.in", hashed_password=password, role="STATE_ADMIN", display_name="Delhi State Admin", state_id="DL"),
            User(email="district@aakar.gov.in", hashed_password=password, role="DISTRICT_ADMIN", display_name="East Delhi Admin", state_id="DL", district_id="EAST"),
            User(email="constituency@aakar.gov.in", hashed_password=password, role="CONSTITUENCY_MGR", display_name="Krishna Nagar Mgr", state_id="DL", district_id="EAST", constituency_id="C-KRISHNA_NAGAR"),
            User(email="mandal@aakar.gov.in", hashed_password=password, role="MANDAL_MGR", display_name="Anarkali Mandal Mgr", state_id="DL", district_id="EAST", constituency_id="C-KRISHNA_NAGAR", mandal_id="W-232"),
            User(email="booth102@aakar.gov.in", hashed_password=password, role="BOOTH_PRESIDENT", display_name="Anarkali Booth Node 1", state_id="DL", district_id="EAST", constituency_id="C-KRISHNA_NAGAR", mandal_id="W-232", booth_id="B-232-1"),
            User(email="volunteer@aakar.gov.in", hashed_password=password, role="VOLUNTEER", display_name="Volunteer Worker 1", state_id="DL", district_id="EAST", constituency_id="C-KRISHNA_NAGAR", mandal_id="W-232", booth_id="B-232-1"),
            # Civic/CM Portal users
            User(email="cm_admin@innovateindia.gov", hashed_password=password, role="CM", display_name="CM Secretariat"),
            User(email="dm_admin@innovateindia.gov", hashed_password=password, role="DM", display_name="District Magistrate", district_id="CENTRAL"),
            User(email="booth_admin@innovateindia.gov", hashed_password=password, role="BOOTH", display_name="Booth Officer", booth_id="B-82-1")
        ]
        
        for u in users:
            session.add(u)
        session.commit()
        print("Users seeded successfully!")

if __name__ == "__main__":
    seed()
