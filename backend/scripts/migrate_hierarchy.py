"""Migrate the Delhi hierarchy from 4 districts to the real 11-district structure.
Run:  python -m scripts.migrate_hierarchy
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from datetime import datetime, timezone
from app.infrastructure.db.sqlite_client import get_session
from app.domain.models.hierarchy import HierarchyNode
from app.domain.models.user import User
from app.core.security import hash_password
from sqlmodel import select, delete

# ── new hierarchy tree ────────────────────────────────────────────────────
# We assign short codes: first part = district code, second part = const code
NEW_STATE = ("DL", "Delhi", "state", None)

NEW_DISTRICTS = [
    ("CD",  "Central District",     "district"),
    ("ND",  "New Delhi",            "district"),
    ("NTH", "North District",       "district"),
    ("NED", "North East District",  "district"),
    ("NWD", "North West District",  "district"),
    ("SD",  "South District",       "district"),
    ("SED", "South East District",  "district"),
    ("SWD", "South West District",  "district"),
    ("WD",  "West District",        "district"),
    ("ED",  "East District",        "district"),
    ("SHD", "Shahdara District",    "district"),
]

NEW_CONSTITUENCIES = {
    "CD":  [("CD-DRG", "Daryaganj"),      ("CD-KRB", "Karol Bagh"),        ("CD-PHG", "Paharganj")],
    "ND":  [("ND-CNP", "Connaught Place"), ("ND-CHN", "Chanakyapuri"),      ("ND-PRL", "Parliament Street")],
    "NTH": [("NTH-SDR","Sadar Bazar"),     ("NTH-KOT","Kotwali"),           ("NTH-NRL","Narela")],
    "NED": [("NED-SLP","Seelampur"),       ("NED-SHD","Shahdara"),          ("NED-SMP","Seemapuri")],
    "NWD": [("NWD-SRV","Saraswati Vihar"), ("NWD-MDT","Model Town"),        ("NWD-KNJ","Kanjhawala")],
    "SD":  [("SD-SKT", "Saket"),           ("SD-HKH", "Hauz Khas"),         ("SD-MHL", "Mehrauli")],
    "SED": [("SED-DFC","Defence Colony"),  ("SED-KLK","Kalkaji"),           ("SED-SRV","Sarita Vihar")],
    "SWD": [("SWD-VSV","Vasant Vihar"),    ("SWD-DWK","Dwarka"),            ("SWD-NJF","Najafgarh")],
    "WD":  [("WD-PNB", "Punjabi Bagh"),    ("WD-RJG", "Rajouri Garden"),    ("WD-PTN", "Patel Nagar")],
    "ED":  [("ED-GDN", "Gandhi Nagar"),    ("ED-PRV", "Preet Vihar"),       ("ED-MYV", "Mayur Vihar")],
    "SHD": [("SHD-SMP","Seemapuri"),       ("SHD-VVH","Vivek Vihar"),       ("SHD-NND","Nand Nagri")],
}

# ── mapping: old constituency code → (new district code, new constituency code) ──
OLD_CONST_TO_NEW = {
    # North West Delhi old → North West District
    "BAD": ("NWD", "NWD-KNJ"),  "BAW": ("NWD", "NWD-KNJ"),
    "MT":  ("NWD", "NWD-MDT"),  "RIT": ("NWD", "NWD-MDT"),
    "ROH": ("NWD", "NWD-MDT"),
    # Narela → North District
    "NAR": ("NTH", "NTH-NRL"),
    # New Delhi old → New Delhi
    "ND-01": ("ND", "ND-CNP"),
    # Jangpura, RK Puram, Greater Kailash → South East District
    "JNG": ("SED", "SED-DFC"),  "RKP": ("SED", "SED-SRV"),
    "GK":  ("SED", "SED-KLK"),
    # Kasturba Nagar, Malviya Nagar → South District
    "KN": ("SD", "SD-HKH"),     "MN": ("SD", "SD-SKT"),
    # South West Delhi old → South West District
    "DWK": ("SWD", "SWD-DWK"),  "MAT": ("SWD", "SWD-NJF"),
    "NJF": ("SWD", "SWD-NJF"),  "PAL": ("SWD", "SWD-VSV"),
    "BJW": ("SWD", "SWD-DWK"),
    # Tilak Nagar → West District
    "TNK": ("WD", "WD-PTN"),
    # East Delhi old → East District
    "PTG": ("ED", "ED-PRV"),    "LXN": ("ED", "ED-GDN"),
    "GND": ("ED", "ED-GDN"),    "KRN": ("ED", "ED-PRV"),
    # Shahdara → Shahdara District
    "SHD": ("SHD", "SHD-SHD"),  "VSN": ("SHD", "SHD-VVH"),
}

# ── new users ─────────────────────────────────────────────────────────────
DISTRICT_ADMINS = [
    ("central-admin@aakar.gov.in",    "Central Delhi Admin",         "CD"),
    ("newdelhi-admin@aakar.gov.in",   "New Delhi Admin",             "ND"),
    ("north-admin@aakar.gov.in",      "North Delhi Admin",           "NTH"),
    ("northeast-admin@aakar.gov.in",  "North East Delhi Admin",      "NED"),
    ("northwest-admin@aakar.gov.in",  "North West Delhi Admin",      "NWD"),
    ("south-admin@aakar.gov.in",      "South Delhi Admin",           "SD"),
    ("southeast-admin@aakar.gov.in",  "South East Delhi Admin",      "SED"),
    ("southwest-admin@aakar.gov.in",  "South West Delhi Admin",      "SWD"),
    ("west-admin@aakar.gov.in",       "West Delhi Admin",            "WD"),
    ("east-admin@aakar.gov.in",       "East Delhi Admin",            "ED"),
    ("shahdara-admin@aakar.gov.in",   "Shahdara Delhi Admin",        "SHD"),
]

# One CONSTITUENCY_MGR per constituency
CONSTITUENCY_MGRS = [
    ("CD-DRG", "Daryaganj"),
    ("CD-KRB", "Karol Bagh"),
    ("CD-PHG", "Paharganj"),
    ("ND-CNP", "Connaught Place"),
    ("ND-CHN", "Chanakyapuri"),
    ("ND-PRL", "Parliament Street"),
    ("NTH-SDR","Sadar Bazar"),
    ("NTH-KOT","Kotwali"),
    ("NTH-NRL","Narela"),
    ("NED-SLP","Seelampur"),
    ("NED-SHD","Shahdara (NE)"),
    ("NED-SMP","Seemapuri (NE)"),
    ("NWD-SRV","Saraswati Vihar"),
    ("NWD-MDT","Model Town"),
    ("NWD-KNJ","Kanjhawala"),
    ("SD-SKT", "Saket"),
    ("SD-HKH", "Hauz Khas"),
    ("SD-MHL", "Mehrauli"),
    ("SED-DFC","Defence Colony"),
    ("SED-KLK","Kalkaji"),
    ("SED-SRV","Sarita Vihar"),
    ("SWD-VSV","Vasant Vihar"),
    ("SWD-DWK","Dwarka"),
    ("SWD-NJF","Najafgarh"),
    ("WD-PNB", "Punjabi Bagh"),
    ("WD-RJG", "Rajouri Garden"),
    ("WD-PTN", "Patel Nagar"),
    ("ED-GDN", "Gandhi Nagar"),
    ("ED-PRV", "Preet Vihar"),
    ("ED-MYV", "Mayur Vihar"),
    ("SHD-SMP","Seemapuri (Shahdara)"),
    ("SHD-VVH","Vivek Vihar"),
    ("SHD-NND","Nand Nagri"),
]


def run():
    with next(get_session()) as session:
        # ── 1. Clear old hierarchy nodes ──
        print("Deleting old HierarchyNode records...")
        session.exec(delete(HierarchyNode))
        session.commit()

        # ── 2. Create new hierarchy tree ──
        print("Creating new hierarchy tree...")
        state_code, state_name, state_level, _ = NEW_STATE
        state_node = HierarchyNode(code=state_code, name=state_name, level=state_level)
        session.add(state_node)
        session.flush()

        district_nodes = {}
        for dcode, dname, dlevel in NEW_DISTRICTS:
            dn = HierarchyNode(code=dcode, name=dname, level=dlevel, parent_id=state_node.id)
            session.add(dn)
            session.flush()
            district_nodes[dcode] = dn

        constituency_nodes = {}
        for dcode, const_list in NEW_CONSTITUENCIES.items():
            parent = district_nodes[dcode]
            for ccode, cname in const_list:
                cn = HierarchyNode(code=ccode, name=cname, level="constituency", parent_id=parent.id)
                session.add(cn)
                session.flush()
                constituency_nodes[ccode] = cn

        session.commit()

        # ── 3. Create / update users ──

        # 3a. Update STATE_ADMIN
        state_admin = session.exec(
            select(User).where(User.email == "statedelhi@aakar.gov.in")
        ).first()
        if state_admin:
            state_admin.display_name = "Delhi Admin"
            state_admin.state_id = "DL"
            state_admin.district_id = None
            state_admin.constituency_id = None
            state_admin.mandal_id = None
            state_admin.booth_id = None
            session.add(state_admin)
            print(f"Updated STATE_ADMIN: {state_admin.email} → Delhi Admin")

        # 3b. Create / update DISTRICT_ADMINs
        # First, find existing ones
        existing_admin_nd = session.exec(
            select(User).where(User.email == "nd-admin@aakar.gov.in")
        ).first()
        existing_admin_ed = session.exec(
            select(User).where(User.email == "delhiadmin@aakar.gov.in")
        ).first()

        for email, dname, dcode in DISTRICT_ADMINS:
            existing = session.exec(select(User).where(User.email == email)).first()
            if existing:
                existing.display_name = dname
                existing.role = "DISTRICT_ADMIN"
                existing.state_id = "DL"
                existing.district_id = dcode
                existing.constituency_id = None
                existing.mandal_id = None
                existing.booth_id = None
                session.add(existing)
                print(f"Updated DISTRICT_ADMIN: {email} → {dname}")
            else:
                # Use existing nd-admin as "New Delhi Admin" and delhiadmin as "East Delhi Admin"
                if email == "newdelhi-admin@aakar.gov.in" and existing_admin_nd:
                    existing_admin_nd.email = email
                    existing_admin_nd.display_name = dname
                    existing_admin_nd.role = "DISTRICT_ADMIN"
                    existing_admin_nd.state_id = "DL"
                    existing_admin_nd.district_id = dcode
                    existing_admin_nd.constituency_id = None
                    existing_admin_nd.mandal_id = None
                    existing_admin_nd.booth_id = None
                    session.add(existing_admin_nd)
                    print(f"Reassigned DISTRICT_ADMIN: nd-admin → {dname}")
                    continue
                if email == "east-admin@aakar.gov.in" and existing_admin_ed:
                    existing_admin_ed.email = email
                    existing_admin_ed.display_name = dname
                    existing_admin_ed.role = "DISTRICT_ADMIN"
                    existing_admin_ed.state_id = "DL"
                    existing_admin_ed.district_id = dcode
                    existing_admin_ed.constituency_id = None
                    existing_admin_ed.mandal_id = None
                    existing_admin_ed.booth_id = None
                    session.add(existing_admin_ed)
                    print(f"Reassigned DISTRICT_ADMIN: delhiadmin → {dname}")
                    continue
                # Create new district admin
                new_user = User(
                    email=email,
                    hashed_password=hash_password("123456"),
                    role="DISTRICT_ADMIN",
                    display_name=dname,
                    state_id="DL",
                    district_id=dcode,
                )
                session.add(new_user)
                print(f"Created DISTRICT_ADMIN: {email} → {dname}")

        # 3c. Create / update CONSTITUENCY_MGRs
        existing_cons1 = session.exec(
            select(User).where(User.email == "cons1@aakar.gov.in")
        ).first()
        existing_cons2 = session.exec(
            select(User).where(User.email == "nd01-mgr@aakar.gov.in")
        ).first()

        for ccode, cname in CONSTITUENCY_MGRS:
            # Determine which district this constituency belongs to
            parent_district_code = None
            for dcode, const_list in NEW_CONSTITUENCIES.items():
                if any(c[0] == ccode for c in const_list):
                    parent_district_code = dcode
                    break

            email = f"{ccode.lower()}-const@aakar.gov.in"
            dname = f"{cname} Constituency Admin"

            # Use existing nd01-mgr as New Delhi constituency
            if ccode == "ND-CNP" and existing_cons2:
                existing_cons2.email = email
                existing_cons2.display_name = dname
                existing_cons2.role = "CONSTITUENCY_MGR"
                existing_cons2.state_id = "DL"
                existing_cons2.district_id = parent_district_code
                existing_cons2.constituency_id = ccode
                existing_cons2.mandal_id = None
                existing_cons2.booth_id = None
                session.add(existing_cons2)
                print(f"Reassigned CONSTITUENCY_MGR: nd01-mgr → {dname}")
                continue

            # Use existing cons1 as Krishna Nagar
            if ccode == "ED-PRV" and existing_cons1:
                existing_cons1.email = email
                existing_cons1.display_name = "Krishna Nagar Constituency Admin"
                existing_cons1.role = "CONSTITUENCY_MGR"
                existing_cons1.state_id = "DL"
                existing_cons1.district_id = parent_district_code
                existing_cons1.constituency_id = ccode
                existing_cons1.mandal_id = None
                existing_cons1.booth_id = None
                session.add(existing_cons1)
                print(f"Reassigned CONSTITUENCY_MGR: cons1 → Krishna Nagar Constituency Admin")
                continue

            existing = session.exec(select(User).where(User.email == email)).first()
            if existing:
                existing.display_name = dname
                existing.role = "CONSTITUENCY_MGR"
                existing.state_id = "DL"
                existing.district_id = parent_district_code
                existing.constituency_id = ccode
                existing.mandal_id = None
                existing.booth_id = None
                session.add(existing)
                print(f"Updated CONSTITUENCY_MGR: {email}")
            else:
                new_user = User(
                    email=email,
                    hashed_password=hash_password("123456"),
                    role="CONSTITUENCY_MGR",
                    display_name=dname,
                    state_id="DL",
                    district_id=parent_district_code,
                    constituency_id=ccode,
                )
                session.add(new_user)
                print(f"Created CONSTITUENCY_MGR: {email}")

        # 3d. Update existing MANDAL_MGRs
        defence = session.exec(
            select(User).where(User.email == "defence@aakar.gov.in")
        ).first()
        if defence:
            defence.display_name = "Defence Colony Mandal Admin"
            defence.state_id = "DL"
            defence.district_id = "SED"
            defence.constituency_id = "SED-DFC"
            defence.mandal_id = "SED-DFC"
            session.add(defence)
            print(f"Updated MANDAL_MGR: defence → Defence Colony Mandal Admin")

        ndcn_mgr = session.exec(
            select(User).where(User.email == "ndcn-mgr@aakar.gov.in")
        ).first()
        if ndcn_mgr:
            ndcn_mgr.display_name = "Connaught Place Mandal Admin"
            ndcn_mgr.state_id = "DL"
            ndcn_mgr.district_id = "ND"
            ndcn_mgr.constituency_id = "ND-CNP"
            ndcn_mgr.mandal_id = "ND-CNP"
            session.add(ndcn_mgr)
            print(f"Updated MANDAL_MGR: ndcn-mgr → Connaught Place Mandal Admin")

        # ── 4. Reassign all BOOTH_PRESIDENTs ──
        booth_presidents = session.exec(
            select(User).where(User.role == "BOOTH_PRESIDENT")
        ).all()
        print(f"Reassigning {len(booth_presidents)} BOOTH_PRESIDENTs...")
        for bp in booth_presidents:
            old_const = bp.constituency_id
            mapping = OLD_CONST_TO_NEW.get(old_const)
            if mapping:
                new_dist, new_const = mapping
                bp.state_id = "DL"
                bp.district_id = new_dist
                bp.constituency_id = new_const
                # Keep mandal_id and booth_id as-is (just ensure booth_id ref is unique)
                session.add(bp)
            else:
                print(f"  WARNING: no mapping for constituency={old_const}, user={bp.email}")

        # ── 5. Update CM and ELECTION_ADMIN state_id ──
        cm = session.exec(
            select(User).where(User.email == "cm-delhi@aakar.gov.in")
        ).first()
        if cm:
            cm.state_id = "DL"
            session.add(cm)

        election_admin = session.exec(
            select(User).where(User.email == "serveradmin@aakar.gov.in")
        ).first()
        if election_admin:
            election_admin.state_id = "DL"
            session.add(election_admin)

        session.commit()

    print("\n✅ Migration complete!")
    print(f"   State: Delhi")
    print(f"   Districts: {len(NEW_DISTRICTS)}")
    print(f"   Constituencies: {sum(len(v) for v in NEW_CONSTITUENCIES.values())}")
    print(f"   DISTRICT_ADMINs: {len(DISTRICT_ADMINS)}")
    print(f"   CONSTITUENCY_MGRs: {len(CONSTITUENCY_MGRS)}")
    print(f"   BOOTH_PRESIDENTs reassigned: {len(booth_presidents)}")


if __name__ == "__main__":
    run()
