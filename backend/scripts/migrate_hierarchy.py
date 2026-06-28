"""Migrate the Delhi hierarchy to 13 districts, 74 constituencies, 222 mandals, 444 booths.
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


# ── Keep these users ────────────────────────────────────────────────────────
KEEP_EMAILS = {
    "serveradmin@aakar.gov.in",
    "statedelhi@aakar.gov.in",
    "cm-delhi@aakar.gov.in",
    "dm-newdelhi@aakar.gov.in",
    "official-nd@aakar.gov.in",
}

# ── 13 Districts ────────────────────────────────────────────────────────────
DISTRICTS = [
    ("CD",  "Central District"),
    ("CN",  "Central North District"),
    ("ED",  "East District"),
    ("ND",  "New Delhi District"),
    ("NTH", "North District"),
    ("NED", "North East District"),
    ("NWD", "North West District"),
    ("OLD", "Old Delhi District"),
    ("ONR", "Outer North District"),
    ("SD",  "South District"),
    ("SED", "South East District"),
    ("SWD", "South West District"),
    ("WD",  "West District"),
]

# ── 74 Constituencies with their 3 mandals each (222 total) ─────────────────
# Structure: { (district_code, const_code, const_name): [(mandal_code, mandal_name), ...] }
CONSTITUENCIES_AND_MANDALS = {
    # ── Central (CD) ──
    ("CD", "CD-BLM", "Ballimaran"): [
        ("CD-BLM-M1", "Ballimaran"),
        ("CD-BLM-M2", "Maliwara"),
        ("CD-BLM-M3", "Rasoolpur"),
    ],
    ("CD", "CD-BRR", "Burari"): [
        ("CD-BRR-M1", "Burari"),
        ("CD-BRR-M2", "Mukundpur"),
        ("CD-BRR-M3", "Nirankari"),
    ],
    ("CD", "CD-CHC", "Chandni Chowk"): [
        ("CD-CHC-M1", "Chandni Chowk"),
        ("CD-CHC-M2", "Kucha Ghasiram"),
        ("CD-CHC-M3", "Kinari Bazaar"),
    ],
    ("CD", "CD-KRB", "Karol Bagh"): [
        ("CD-KRB-M1", "Karol Bagh"),
        ("CD-KRB-M2", "Dev Nagar"),
        ("CD-KRB-M3", "Bhikaji Cama"),
    ],
    ("CD", "CD-MTM", "Matia Mahal"): [
        ("CD-MTM-M1", "Matia Mahal"),
        ("CD-MTM-M2", "Bara Hindu Rao"),
        ("CD-MTM-M3", "Paharganj"),
    ],
    ("CD", "CD-SDB", "Sadar Bazar"): [
        ("CD-SDB-M1", "Sadar Bazar"),
        ("CD-SDB-M2", "Bara Tooti"),
        ("CD-SDB-M3", "Lahori Gate"),
    ],
    ("CD", "CD-TMP", "Timarpur"): [
        ("CD-TMP-M1", "Timarpur"),
        ("CD-TMP-M2", "North Campus"),
        ("CD-TMP-M3", "Wazirabad"),
    ],

    # ── Central North (CN) ──
    ("CN", "CN-MTN", "Model Town"): [
        ("CN-MTN-M1", "Model Town"),
        ("CN-MTN-M2", "GTB Nagar"),
        ("CN-MTN-M3", "Kamla Nagar"),
    ],
    ("CN", "CN-SKB", "Shakur Basti"): [
        ("CN-SKB-M1", "Shakur Basti"),
        ("CN-SKB-M2", "Punjabi Bagh West"),
        ("CN-SKB-M3", "Fateh Nagar"),
    ],
    ("CN", "CN-SLB", "Shalimar Bagh"): [
        ("CN-SLB-M1", "Shalimar Bagh"),
        ("CN-SLB-M2", "Ashok Vihar"),
        ("CN-SLB-M3", "Azadpur"),
    ],
    ("CN", "CN-TNR", "Tri Nagar"): [
        ("CN-TNR-M1", "Tri Nagar"),
        ("CN-TNR-M2", "Ramesh Nagar"),
        ("CN-TNR-M3", "Moti Nagar"),
    ],
    ("CN", "CN-WZP", "Wazirpur"): [
        ("CN-WZP-M1", "Wazirpur"),
        ("CN-WZP-M2", "Pitampura"),
        ("CN-WZP-M3", "Keshavpuram"),
    ],

    # ── East (ED) ──
    ("ED", "ED-GNG", "Gandhi Nagar"): [
        ("ED-GNG-M1", "Gandhi Nagar"),
        ("ED-GNG-M2", "Shankar Nagar"),
        ("ED-GNG-M3", "Kailash Nagar"),
    ],
    ("ED", "ED-KDL", "Kondli"): [
        ("ED-KDL-M1", "Kondli"),
        ("ED-KDL-M2", "Dilshad Garden"),
        ("ED-KDL-M3", "Shalimar Park"),
    ],
    ("ED", "ED-KRN", "Krishna Nagar"): [
        ("ED-KRN-M1", "Krishna Nagar"),
        ("ED-KRN-M2", "Guru Angad Nagar"),
        ("ED-KRN-M3", "Raghubarpura"),
    ],
    ("ED", "ED-LXN", "Laxmi Nagar"): [
        ("ED-LXN-M1", "Laxmi Nagar"),
        ("ED-LXN-M2", "Shakarpur"),
        ("ED-LXN-M3", "Nand Nagri"),
    ],
    ("ED", "ED-PTG", "Patparganj"): [
        ("ED-PTG-M1", "Patparganj"),
        ("ED-PTG-M2", "Anand Vihar"),
        ("ED-PTG-M3", "IP Extension"),
    ],
    ("ED", "ED-TLP", "Trilokpuri"): [
        ("ED-TLP-M1", "Trilokpuri"),
        ("ED-TLP-M2", "Khureji Khas"),
        ("ED-TLP-M3", "Suraj Parkash Vihar"),
    ],

    # ── New Delhi (ND) ──
    ("ND", "ND-DCT", "Delhi Cantt"): [
        ("ND-DCT-M1", "Delhi Cantt"),
        ("ND-DCT-M2", "Naraina"),
        ("ND-DCT-M3", "Dhaula Kuan"),
    ],
    ("ND", "ND-GRK", "Greater Kailash"): [
        ("ND-GRK-M1", "Greater Kailash"),
        ("ND-GRK-M2", "Chirag Delhi"),
        ("ND-GRK-M3", "GK Enclave"),
    ],
    ("ND", "ND-NDL", "New Delhi"): [
        ("ND-NDL-M1", "Connaught Place"),
        ("ND-NDL-M2", "Lutyens Delhi"),
        ("ND-NDL-M3", "Mandir Marg"),
    ],
    ("ND", "ND-PNL", "Patel Nagar"): [
        ("ND-PNL-M1", "Patel Nagar"),
        ("ND-PNL-M2", "Rajendra Nagar"),
        ("ND-PNL-M3", "Karol Bagh East"),
    ],
    ("ND", "ND-RKP", "R K Puram"): [
        ("ND-RKP-M1", "R K Puram"),
        ("ND-RKP-M2", "Safdarjung Encl"),
        ("ND-RKP-M3", "Lajpat Nagar Central"),
    ],
    ("ND", "ND-RJN", "Rajinder Nagar"): [
        ("ND-RJN-M1", "Rajinder Nagar"),
        ("ND-RJN-M2", "Shadipur"),
        ("ND-RJN-M3", "Ranjit Nagar"),
    ],

    # ── North (NTH) ──
    ("NTH", "NTH-ADN", "Adarsh Nagar"): [
        ("NTH-ADN-M1", "Adarsh Nagar"),
        ("NTH-ADN-M2", "GTK Road"),
        ("NTH-ADN-M3", "Azadpur Colony"),
    ],
    ("NTH", "NTH-BDL", "Badli"): [
        ("NTH-BDL-M1", "Badli"),
        ("NTH-BDL-M2", "Kirari"),
        ("NTH-BDL-M3", "Sultanpuri North"),
    ],
    ("NTH", "NTH-BWN", "Bawana"): [
        ("NTH-BWN-M1", "Bawana"),
        ("NTH-BWN-M2", "Holambi Kalan"),
        ("NTH-BWN-M3", "Puth Kalan"),
    ],
    ("NTH", "NTH-NRL", "Narela"): [
        ("NTH-NRL-M1", "Narela"),
        ("NTH-NRL-M2", "Alipur"),
        ("NTH-NRL-M3", "Bakhtawarpur"),
    ],
    ("NTH", "NTH-ROH", "Rohini"): [
        ("NTH-ROH-M1", "Rohini Sec 1-5"),
        ("NTH-ROH-M2", "Rohini Sec 6-9"),
        ("NTH-ROH-M3", "Rohini Sec 10-15"),
    ],

    # ── North East (NED) ──
    ("NED", "NED-GHD", "Ghonda"): [
        ("NED-GHD-M1", "Ghonda"),
        ("NED-GHD-M2", "Shastri Nagar"),
        ("NED-GHD-M3", "Sabzi Mandi"),
    ],
    ("NED", "NED-GKP", "Gokalpur"): [
        ("NED-GKP-M1", "Gokalpur"),
        ("NED-GKP-M2", "Bhajanpura"),
        ("NED-GKP-M3", "Rathki Village"),
    ],
    ("NED", "NED-KWN", "Karawal Nagar"): [
        ("NED-KWN-M1", "Karawal Nagar"),
        ("NED-KWN-M2", "Maujpur"),
        ("NED-KWN-M3", "Shiv Vihar"),
    ],
    ("NED", "NED-MSF", "Mustafabad"): [
        ("NED-MSF-M1", "Mustafabad"),
        ("NED-MSF-M2", "Zaffrabad"),
        ("NED-MSF-M3", "Jaffrabad"),
    ],
    ("NED", "NED-SLP", "Seelampur"): [
        ("NED-SLP-M1", "Seelampur"),
        ("NED-SLP-M2", "Welcome Colony"),
        ("NED-SLP-M3", "Yamuna Vihar"),
    ],

    # ── North West (NWD) ──
    ("NWD", "NWD-KIR", "Kirari"): [
        ("NWD-KIR-M1", "Kirari"),
        ("NWD-KIR-M2", "Sultanpuri"),
        ("NWD-KIR-M3", "Mangolpuri West"),
    ],
    ("NWD", "NWD-MGP", "Mangol Puri"): [
        ("NWD-MGP-M1", "Mangol Puri"),
        ("NWD-MGP-M2", "MHD Town"),
        ("NWD-MGP-M3", "Budh Vihar"),
    ],
    ("NWD", "NWD-MDK", "Mundka"): [
        ("NWD-MDK-M1", "Mundka"),
        ("NWD-MDK-M2", "Ranhola"),
        ("NWD-MDK-M3", "Nilothi"),
    ],
    ("NWD", "NWD-RTH", "Rithala"): [
        ("NWD-RTH-M1", "Rithala"),
        ("NWD-RTH-M2", "Rohini Sec 24-29"),
        ("NWD-RTH-M3", "Barwala"),
    ],
    ("NWD", "NWD-SPM", "Sultanpur Majra"): [
        ("NWD-SPM-M1", "Sultanpur Majra"),
        ("NWD-SPM-M2", "Begampur"),
        ("NWD-SPM-M3", "Pooth Kalan"),
    ],

    # ── Old Delhi (OLD) ──
    ("OLD", "OLD-BBP", "Babarpur"): [
        ("OLD-BBP-M1", "Babarpur"),
        ("OLD-BBP-M2", "Maujpur"),
        ("OLD-BBP-M3", "Chaman Park"),
    ],
    ("OLD", "OLD-RTN", "Rohtas Nagar"): [
        ("OLD-RTN-M1", "Rohtas Nagar"),
        ("OLD-RTN-M2", "Tahirpur"),
        ("OLD-RTN-M3", "Gulabi Bagh"),
    ],
    ("OLD", "OLD-SMP", "Seema Puri"): [
        ("OLD-SMP-M1", "Seema Puri"),
        ("OLD-SMP-M2", "Sunder Nagari"),
        ("OLD-SMP-M3", "Gagan Mandi"),
    ],
    ("OLD", "OLD-SHD", "Shahdara"): [
        ("OLD-SHD-M1", "Shahdara"),
        ("OLD-SHD-M2", "Durgapuri"),
        ("OLD-SHD-M3", "Roop Nagar"),
    ],
    ("OLD", "OLD-VSN", "Vishwas Nagar"): [
        ("OLD-VSN-M1", "Vishwas Nagar"),
        ("OLD-VSN-M2", "Kanti Nagar"),
        ("OLD-VSN-M3", "Anand Gaon"),
    ],

    # ── Outer North (ONR) ──
    ("ONR", "ONR-ALP", "Alipur"): [
        ("ONR-ALP-M1", "Alipur Village"),
        ("ONR-ALP-M2", "Bakhtawarpur"),
        ("ONR-ALP-M3", "Singhu"),
    ],
    ("ONR", "ONR-KNJ", "Kanjhawala"): [
        ("ONR-KNJ-M1", "Kanjhawala"),
        ("ONR-KNJ-M2", "Sultanpuri West"),
        ("ONR-KNJ-M3", "Keshopur"),
    ],
    ("ONR", "ONR-NRX", "Narela Ext"): [
        ("ONR-NRX-M1", "Narela Ext"),
        ("ONR-NRX-M2", "Sanoth"),
        ("ONR-NRX-M3", "Mitraon"),
    ],
    ("ONR", "ONR-ORB", "Outer Rural Border"): [
        ("ONR-ORB-M1", "Pooth Khurd"),
        ("ONR-ORB-M2", "Ghoga"),
        ("ONR-ORB-M3", "Qadi Pur"),
    ],

    # ── South (SD) ──
    ("SD", "SD-ABN", "Ambedkar Nagar"): [
        ("SD-ABN-M1", "Ambedkar Nagar"),
        ("SD-ABN-M2", "Tughlakabad"),
        ("SD-ABN-M3", "Khanpur"),
    ],
    ("SD", "SD-CHT", "Chhatarpur"): [
        ("SD-CHT-M1", "Chhatarpur"),
        ("SD-CHT-M2", "Vasant Kunj South"),
        ("SD-CHT-M3", "Mahipalpur"),
    ],
    ("SD", "SD-DEL", "Deoli"): [
        ("SD-DEL-M1", "Deoli"),
        ("SD-DEL-M2", "Dakshinpuri"),
        ("SD-DEL-M3", "Sangam Vihar West"),
    ],
    ("SD", "SD-MVN", "Malviya Nagar"): [
        ("SD-MVN-M1", "Malviya Nagar"),
        ("SD-MVN-M2", "Pushp Vihar"),
        ("SD-MVN-M3", "Saket"),
    ],
    ("SD", "SD-MHL", "Mehrauli"): [
        ("SD-MHL-M1", "Mehrauli"),
        ("SD-MHL-M2", "Sultanpur"),
        ("SD-MHL-M3", "Lado Sarai"),
    ],

    # ── South East (SED) ──
    ("SED", "SED-BDP", "Badarpur"): [
        ("SED-BDP-M1", "Badarpur"),
        ("SED-BDP-M2", "Meethapur"),
        ("SED-BDP-M3", "Jaitpur"),
    ],
    ("SED", "SED-JGP", "Jangpura"): [
        ("SED-JGP-M1", "Jangpura"),
        ("SED-JGP-M2", "Nizamuddin"),
        ("SED-JGP-M3", "Sundar Nagar"),
    ],
    ("SED", "SED-KLK", "Kalkaji"): [
        ("SED-KLK-M1", "Kalkaji"),
        ("SED-KLK-M2", "Alaknanda"),
        ("SED-KLK-M3", "Govindpuri"),
    ],
    ("SED", "SED-KSN", "Kasturba Nagar"): [
        ("SED-KSN-M1", "Kasturba Nagar"),
        ("SED-KSN-M2", "Sarojini Nagar"),
        ("SED-KSN-M3", "Kidwai Nagar"),
    ],
    ("SED", "SED-OKH", "Okhla"): [
        ("SED-OKH-M1", "Okhla"),
        ("SED-OKH-M2", "Jasola"),
        ("SED-OKH-M3", "Jamia Nagar"),
    ],
    ("SED", "SED-SGV", "Sangam Vihar"): [
        ("SED-SGV-M1", "Sangam Vihar"),
        ("SED-SGV-M2", "Tigri"),
        ("SED-SGV-M3", "Devli Extension"),
    ],
    ("SED", "SED-TGD", "Tughlakabad"): [
        ("SED-TGD-M1", "Tughlakabad"),
        ("SED-TGD-M2", "Maa Anandmayee Marg"),
        ("SED-TGD-M3", "Hamdard Nagar"),
    ],

    # ── South West (SWD) ──
    ("SWD", "SWD-BJW", "Bijwasan"): [
        ("SWD-BJW-M1", "Bijwasan"),
        ("SWD-BJW-M2", "Dhul Siras"),
        ("SWD-BJW-M3", "Kapashera"),
    ],
    ("SWD", "SWD-DWK", "Dwarka"): [
        ("SWD-DWK-M1", "Dwarka Sec 1-10"),
        ("SWD-DWK-M2", "Dwarka Sec 11-19"),
        ("SWD-DWK-M3", "Dwarka Sec 20-29"),
    ],
    ("SWD", "SWD-MTL", "Matiala"): [
        ("SWD-MTL-M1", "Matiala"),
        ("SWD-MTL-M2", "Jharoda"),
        ("SWD-MTL-M3", "Roshan Pura"),
    ],
    ("SWD", "SWD-NJF", "Najafgarh"): [
        ("SWD-NJF-M1", "Najafgarh"),
        ("SWD-NJF-M2", "Mitraon"),
        ("SWD-NJF-M3", "Ujwa"),
    ],
    ("SWD", "SWD-PLM", "Palam"): [
        ("SWD-PLM-M1", "Palam"),
        ("SWD-PLM-M2", "Sadh Nagar"),
        ("SWD-PLM-M3", "Mahavir Enclave"),
    ],
    ("SWD", "SWD-UTN", "Uttam Nagar"): [
        ("SWD-UTN-M1", "Uttam Nagar"),
        ("SWD-UTN-M2", "Bindapur"),
        ("SWD-UTN-M3", "Vikaspuri East"),
    ],
    ("SWD", "SWD-VKP", "Vikaspuri"): [
        ("SWD-VKP-M1", "Vikaspuri"),
        ("SWD-VKP-M2", "Janakpuri East"),
        ("SWD-VKP-M3", "Dashrathpuri"),
    ],

    # ── West (WD) ──
    ("WD", "WD-HRN", "Hari Nagar"): [
        ("WD-HRN-M1", "Hari Nagar"),
        ("WD-HRN-M2", "Fateh Nagar"),
        ("WD-HRN-M3", "Ghanta Ghar"),
    ],
    ("WD", "WD-JNP", "Janakpuri"): [
        ("WD-JNP-M1", "Janakpuri West"),
        ("WD-JNP-M2", "Janakpuri East"),
        ("WD-JNP-M3", "F Block"),
    ],
    ("WD", "WD-MDP", "Madipur"): [
        ("WD-MDP-M1", "Madipur"),
        ("WD-MDP-M2", "Paschim Vihar"),
        ("WD-MDP-M3", "Punjabi Bagh South"),
    ],
    ("WD", "WD-MTN", "Moti Nagar"): [
        ("WD-MTN-M1", "Moti Nagar"),
        ("WD-MTN-M2", "Khyala"),
        ("WD-MTN-M3", "Ramesh Nagar"),
    ],
    ("WD", "WD-NGJ", "Nangloi Jat"): [
        ("WD-NGJ-M1", "Nangloi"),
        ("WD-NGJ-M2", "Udyog Vihar"),
        ("WD-NGJ-M3", "Jwala Heri"),
    ],
    ("WD", "WD-RJG", "Rajouri Garden"): [
        ("WD-RJG-M1", "Rajouri Garden"),
        ("WD-RJG-M2", "Subhash Nagar"),
        ("WD-RJG-M3", "Tilak Nagar West"),
    ],
    ("WD", "WD-TNK", "Tilak Nagar"): [
        ("WD-TNK-M1", "Tilak Nagar"),
        ("WD-TNK-M2", "Prem Nagar"),
        ("WD-TNK-M3", "Vishnu Garden"),
    ],
}


def get_mandals_by_constituency():
    """Return dict: const_code -> [(mandal_code, mandal_name), ...]"""
    result = {}
    for (dcode, ccode, cname), mandals in CONSTITUENCIES_AND_MANDALS.items():
        result[ccode] = mandals
    return result


def get_constituencies_by_district():
    """Return dict: district_code -> [(const_code, const_name), ...]"""
    result = {}
    for (dcode, ccode, cname), _ in CONSTITUENCIES_AND_MANDALS.items():
        result.setdefault(dcode, []).append((ccode, cname))
    return result


def run():
    with next(get_session()) as session:
        # ── 1. Clear old hierarchy nodes ──
        print("Deleting old HierarchyNode records...")
        session.exec(delete(HierarchyNode))
        session.commit()

        # ── 2. Delete all users except KEEP_EMAILS ──
        print("Deleting old users (except keep list)...")
        all_users = session.exec(select(User)).all()
        deleted_count = 0
        for u in all_users:
            if u.email not in KEEP_EMAILS:
                session.delete(u)
                deleted_count += 1
        session.commit()
        print(f"  Deleted {deleted_count} users, kept {len(KEEP_EMAILS)}")

        # ── 3. Update kept users' hierarchy fields ──
        print("Updating kept users...")
        for email in KEEP_EMAILS:
            user = session.exec(select(User).where(User.email == email)).first()
            if user:
                if email == "statedelhi@aakar.gov.in":
                    user.state_id = "DL"
                    user.district_id = None
                    user.constituency_id = None
                    user.mandal_id = None
                    user.booth_id = None
                    print(f"  Updated STATE_ADMIN: {email}")
                elif email == "cm-delhi@aakar.gov.in":
                    user.state_id = "DL"
                    print(f"  Updated CM: {email}")
                elif email == "dm-newdelhi@aakar.gov.in":
                    user.state_id = "DL"
                    user.district_id = "ND"
                    print(f"  Updated DM: {email}")
                elif email == "official-nd@aakar.gov.in":
                    user.state_id = "DL"
                    user.district_id = "ND"
                    print(f"  Updated BOOTH: {email}")
                else:
                    user.state_id = "DL"
                    print(f"  Updated: {email}")
                session.add(user)
        session.commit()

        # ── 4. Create hierarchy tree ──
        print("\nCreating hierarchy tree...")

        # 4a. State
        state_node = HierarchyNode(code="DL", name="Delhi", level="state")
        session.add(state_node)
        session.flush()
        state_id = state_node.id

        # 4b. Districts
        district_nodes = {}
        for dcode, dname in DISTRICTS:
            dn = HierarchyNode(code=dcode, name=dname, level="district", parent_id=state_id)
            session.add(dn)
            session.flush()
            district_nodes[dcode] = dn

        session.commit()
        print(f"  Created 1 state + {len(DISTRICTS)} districts")

        # 4c. Constituencies
        const_by_dist = get_constituencies_by_district()
        constituency_nodes = {}
        const_count = 0
        for dcode, consts in const_by_dist.items():
            parent = district_nodes[dcode]
            for ccode, cname in consts:
                cn = HierarchyNode(code=ccode, name=cname, level="constituency", parent_id=parent.id)
                session.add(cn)
                session.flush()
                constituency_nodes[ccode] = cn
                const_count += 1

        session.commit()
        print(f"  Created {const_count} constituencies")

        # 4d. Mandals
        mandal_by_const = get_mandals_by_constituency()
        mandal_nodes = {}
        mandal_count = 0
        for ccode, mandals in mandal_by_const.items():
            parent = constituency_nodes[ccode]
            for mcode, mname in mandals:
                mn = HierarchyNode(code=mcode, name=mname, level="mandal", parent_id=parent.id)
                session.add(mn)
                session.flush()
                mandal_nodes[mcode] = mn
                mandal_count += 1

        session.commit()
        print(f"  Created {mandal_count} mandals")

        # 4e. Booths (2 per mandal)
        booth_count = 0
        for mcode, mn in mandal_nodes.items():
            mname = mn.name
            for i in (1, 2):
                bcode = f"{mcode}-B{i}"
                bname = f"{mname} Booth {i}"
                bn = HierarchyNode(code=bcode, name=bname, level="booth", parent_id=mn.id)
                session.add(bn)
                booth_count += 1

        session.commit()
        print(f"  Created {booth_count} booths")

        # ── 5. Create users ──
        password_hash = hash_password("123456")
        created_users = 0

        # 5a. DISTRICT_ADMINs
        for dcode, dname in DISTRICTS:
            email = f"{dcode.lower()}-admin@aakar.gov.in"
            display_name = f"{dname.split('(')[0].strip()} Admin"
            new_user = User(
                email=email,
                hashed_password=password_hash,
                role="DISTRICT_ADMIN",
                display_name=display_name,
                state_id="DL",
                district_id=dcode,
            )
            session.add(new_user)
            created_users += 1

        session.commit()
        print(f"  Created {len(DISTRICTS)} DISTRICT_ADMINs")

        # 5b. CONSTITUENCY_MGRs
        for (dcode, ccode, cname), _ in CONSTITUENCIES_AND_MANDALS.items():
            email = f"{ccode.lower()}-const@aakar.gov.in"
            display_name = f"{cname} Constituency Admin"
            new_user = User(
                email=email,
                hashed_password=password_hash,
                role="CONSTITUENCY_MGR",
                display_name=display_name,
                state_id="DL",
                district_id=dcode,
                constituency_id=ccode,
            )
            session.add(new_user)
            created_users += 1

        session.commit()
        print(f"  Created {len(CONSTITUENCIES_AND_MANDALS)} CONSTITUENCY_MGRs")

        # 5c. MANDAL_MGRs
        for ccode, mandals in mandal_by_const.items():
            # Get district for this constituency
            dcode = None
            for (dc, cc, _), _ in CONSTITUENCIES_AND_MANDALS.items():
                if cc == ccode:
                    dcode = dc
                    break
            for mcode, mname in mandals:
                email = f"{mcode.lower()}-mandal@aakar.gov.in"
                display_name = f"{mname} Mandal Admin"
                new_user = User(
                    email=email,
                    hashed_password=password_hash,
                    role="MANDAL_MGR",
                    display_name=display_name,
                    state_id="DL",
                    district_id=dcode,
                    constituency_id=ccode,
                    mandal_id=mcode,
                )
                session.add(new_user)
                created_users += 1

        session.commit()
        print(f"  Created {mandal_count} MANDAL_MGRs")

        # 5d. BOOTH_PRESIDENTs
        booth_president_count = 0
        for mcode, mn in mandal_nodes.items():
            # Get parent constituency code from the mandal code
            # Format: XXXX-YYY-M# -> XXXX-YYY
            ccode = mcode.rsplit("-", 1)[0]
            # Get district
            dcode = None
            for (dc, cc, _), _ in CONSTITUENCIES_AND_MANDALS.items():
                if cc == ccode:
                    dcode = dc
                    break
            mname = mn.name
            for i in (1, 2):
                bcode = f"{mcode}-B{i}"
                bname = f"{mname} Booth {i}"
                email = f"{bcode.lower()}-bp@aakar.gov.in"
                new_user = User(
                    email=email,
                    hashed_password=password_hash,
                    role="BOOTH_PRESIDENT",
                    display_name=bname,
                    state_id="DL",
                    district_id=dcode,
                    constituency_id=ccode,
                    mandal_id=mcode,
                    booth_id=bcode,
                )
                session.add(new_user)
                booth_president_count += 1

        session.commit()
        print(f"  Created {booth_president_count} BOOTH_PRESIDENTs")

        # ── Summary ──
        print(f"\n{'='*60}")
        print("✅ Migration complete!")
        print(f"   State: 1 (Delhi)")
        print(f"   Districts: {len(DISTRICTS)}")
        print(f"   Constituencies: {const_count}")
        print(f"   Mandals: {mandal_count}")
        print(f"   Booths: {booth_count}")
        print(f"   DISTRICT_ADMINs: {len(DISTRICTS)}")
        print(f"   CONSTITUENCY_MGRs: {const_count}")
        print(f"   MANDAL_MGRs: {mandal_count}")
        print(f"   BOOTH_PRESIDENTs: {booth_president_count}")
        print(f"{'='*60}")


if __name__ == "__main__":
    run()
