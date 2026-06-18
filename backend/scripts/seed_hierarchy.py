import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlmodel import Session, create_engine, select
from app.domain.models.hierarchy import HierarchyNode

sqlite_url = "sqlite:///./data/app.db"
engine = create_engine(sqlite_url)

INDIA_STATES = [
    ("MH", "Maharashtra"), ("UP", "Uttar Pradesh"), ("BR", "Bihar"),
    ("GJ", "Gujarat"), ("RJ", "Rajasthan"), ("MP", "Madhya Pradesh"),
    ("KA", "Karnataka"), ("TN", "Tamil Nadu"), ("TS", "Telangana"),
    ("WB", "West Bengal"), ("KL", "Kerala"), ("OR", "Odisha"),
    ("PB", "Punjab"), ("AS", "Assam"), ("JH", "Jharkhand"),
    ("CG", "Chhattisgarh"), ("HR", "Haryana"), ("HP", "Himachal Pradesh"),
    ("UK", "Uttarakhand"), ("GA", "Goa"), ("DL", "Delhi"),
]

SAMPLE_DISTRICTS = {
    "UP": [("LUCKNOW", "Lucknow"), ("VNS", "Varanasi"), ("GZB", "Ghaziabad"), ("AGR", "Agra"), ("PRG", "Prayagraj")],
    "MH": [("MUM", "Mumbai"), ("PUN", "Pune"), ("NGP", "Nagpur"), ("THN", "Thane"), ("NASH", "Nashik")],
    "KA": [("BLR", "Bengaluru"), ("MYS", "Mysuru"), ("UBR", "Udupi"), ("DVG", "Davangere")],
    "DL": [("NWD", "North West Delhi"), ("ND", "New Delhi"), ("SWD", "South West Delhi"), ("ED", "East Delhi")],
}

SAMPLE_CONSTITUENCIES = {
    "LUCKNOW": [("LC-01", "Lucknow Central"), ("LC-02", "Lucknow East"), ("LC-03", "Lucknow West")],
    "VNS": [("VNS-01", "Varanasi North"), ("VNS-02", "Varanasi South")],
    "BLR": [("BLR-01", "Bengaluru Central"), ("BLR-02", "Bengaluru South")],
    "NWD": [("MT", "Model Town"), ("ROH", "Rohini"), ("BAW", "Bawana"), ("NAR", "Narela"), ("BAD", "Badli"), ("RIT", "Rithala")],
    "ND": [("ND-01", "New Delhi"), ("JNG", "Jangpura"), ("KN", "Kasturba Nagar"), ("MN", "Malviya Nagar"), ("RKP", "RK Puram"), ("GK", "Greater Kailash")],
    "SWD": [("DWK", "Dwarka"), ("MAT", "Matiala"), ("NJF", "Najafgarh"), ("PAL", "Palam"), ("BJW", "Bijwasan"), ("TNK", "Tilak Nagar")],
    "ED": [("PTG", "Patparganj"), ("LXN", "Laxmi Nagar"), ("VSN", "Vishwas Nagar"), ("KRN", "Krishna Nagar"), ("GND", "Gandhi Nagar"), ("SHD", "Shahdara")],
}

SAMPLE_MANDALS = {
    "LC-01": [("CENTRAL", "Central Ward"), ("HAZ", "Hazratganj"), ("GOM", "Gomti Nagar")],
    "LC-02": [("INDIRA", "Indira Nagar"), ("ALIG", "Aliganj")],
    "VNS-01": [("VAR_CT", "Varanasi City"), ("VAR_CANT", "Varanasi Cantonment")],
    "BLR-01": [("MG_RD", "MG Road"), ("SHIV", "Shivajinagar")],
    "MT": [],
    "ROH": [],
    "BAW": [],
    "NAR": [],
    "BAD": [],
    "RIT": [],
    "ND-01": [],
    "JNG": [],
    "KN": [],
    "MN": [],
    "RKP": [],
    "GK": [],
    "DWK": [],
    "MAT": [],
    "NJF": [],
    "PAL": [],
    "BJW": [],
    "TNK": [],
    "PTG": [],
    "LXN": [],
    "VSN": [],
    "KRN": [],
    "GND": [],
    "SHD": [],
}


def seed():
    with Session(engine) as session:
        existing = session.exec(select(HierarchyNode).limit(1)).first()
        if existing:
            print("Hierarchy data already exists. Skipping.")
            return

        for code, name in INDIA_STATES:
            state = HierarchyNode(code=code, name=name, level="state", parent_id=None)
            session.add(state)
            session.flush()

            for dcode, dname in SAMPLE_DISTRICTS.get(code, []):
                dist = HierarchyNode(code=dcode, name=dname, level="district", parent_id=state.id)
                session.add(dist)
                session.flush()

                for ccode, cname in SAMPLE_CONSTITUENCIES.get(dcode, []):
                    const = HierarchyNode(code=ccode, name=cname, level="constituency", parent_id=dist.id)
                    session.add(const)
                    session.flush()

                    for mcode, mname in SAMPLE_MANDALS.get(ccode, []):
                        mandal = HierarchyNode(code=mcode, name=mname, level="mandal", parent_id=const.id)
                        session.add(mandal)

        session.commit()
        print("Hierarchy seeded successfully!")


if __name__ == "__main__":
    seed()
