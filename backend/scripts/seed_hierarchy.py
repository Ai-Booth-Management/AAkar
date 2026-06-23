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
    # Delhi (DL) mandals
    "MT":  [("MT-S1", "Model Town Sector 1"), ("MT-S2", "Model Town Sector 2"), ("MT-S3", "Model Town Sector 3"), ("GTB", "GTB Nagar"), ("KAM", "Kamla Nagar")],
    "ROH": [("RH-S1", "Rohini Sector 1"), ("RH-S3", "Rohini Sector 3"), ("RH-S7", "Rohini Sector 7"), ("RH-S8", "Rohini Sector 8"), ("RH-S9", "Rohini Sector 9")],
    "BAW": [("BAW-CTR", "Bawana Centre"), ("BAW-IND", "Bawana Industrial"), ("BAW-EXT", "Bawana Extension"), ("PAP", "Pooth Kalan"), ("KHN", "Khera Khurd")],
    "NAR": [("NAR-CTR", "Narela Centre"), ("NAR-IND", "Narela Industrial"), ("BWL", "Bhorgarh"), ("BKH", "Bakhtawarpur"), ("TNK", "Tikri Khurd")],
    "BAD": [("BAD-SD", "Budh Vihar"), ("BAD-KR", "Karala"), ("BAD-RP", "Rani Pura"), ("BAD-MN", "Mangolpuri"), ("BAD-SV", "Sultanpuri")],
    "RIT": [("RIT-S1", "Rithala Sector 1"), ("RIT-S4", "Rithala Sector 4"), ("RIT-S5", "Rithala Sector 5"), ("RIT-S6", "Rithala Sector 6"), ("RIT-S11", "Rithala Sector 11")],
    "ND-01": [("ND-CN", "Connaught Place"), ("ND-BK", "Barakhamba"), ("ND-DS", "Daryaganj"), ("ND-DPH", "Delhi Police HQs"), ("ND-SG", "Sarojini Nagar")],
    "JNG": [("JNG-DF", "Defence Colony"), ("JNG-LPT", "Lajpat Nagar"), ("JNG-SKH", "Sewa Khel"), ("JNG-NL", "Nizamuddin"), ("JNG-BK", "Bhogal")],
    "KN":  [("KN-GR", "Green Park"), ("KN-HZK", "Hauz Khas"), ("KN-STR", "South Extension"), ("KN-AM", "Amar Colony"), ("KN-ADH", "Adchini")],
    "MN":  [("MN-SKT", "Saket"), ("MN-PSH", "Pushp Vihar"), ("MN-CHA", "Chhatarpur"), ("MN-MDR", "Madanpur Khadar"), ("MN-SGD", "Saidulajab")],
    "RKP": [("RKP-MN", "Moti Bagh"), ("RKP-NNP", "Nanak Pura"), ("RKP-RK", "RK Puram"), ("RKP-KID", "Kidwai Nagar"), ("RKP-SNP", "South Patel Nagar")],
    "GK":  [("GK-E", "Greater Kailash East"), ("GK-W", "Greater Kailash West"), ("GK-CR", "Chirag Delhi"), ("GK-MSH", "Masjid Moth"), ("GK-NEZ", "Neeti Bagh")],
    "DWK": [("DWK-S1", "Dwarka Sector 1"), ("DWK-S4", "Dwarka Sector 4"), ("DWK-S6", "Dwarka Sector 6"), ("DWK-S7", "Dwarka Sector 7"), ("DWK-S12", "Dwarka Sector 12")],
    "MAT": [("MAT-ML", "Mangolpuri"), ("MAT-KH", "Khanpur"), ("MAT-PRM", "Palam Farms"), ("MAT-SMB", "Samalka"), ("MAT-RAW", "Roshanpura")],
    "NJF": [("NJF-JAF", "Najafgarh Town"), ("NJF-KK", "Kakrola"), ("NJF-DND", "Dhansa"), ("NJF-MIT", "Mitraon"), ("NJF-JF", "Jaffarpur")],
    "PAL": [("PAL-CNT", "Palam Cantonment"), ("PAL-SDJ", "Sadar Bazar"), ("PAL-RNG", "Rangpuri"), ("PAL-MBR", "Mahipalpur"), ("PAL-VK", "Vasant Kunj")],
    "BJW": [("BJW-CAP", "Kapashera"), ("BJW-BJW", "Bijwasan Town"), ("BJW-NGM", "Nangal"), ("BJW-NJK", "Nangli Jiwan"), ("BJW-SB", "Sushant Lok")],
    "TNK": [("TNK-TNK", "Tilak Nagar Town"), ("TNK-VS", "Vishnu Garden"), ("TNK-SDN", "Subhash Nagar"), ("TNK-ASN", "Ashok Nagar"), ("TNK-RM", "Ramesh Nagar")],
    "PTG": [("PTG-PTG", "Patparganj Village"), ("PTG-SHI", "Shashi Garden"), ("PTG-KND", "Kaushambi"), ("PTG-PD", "Pandav Nagar"), ("PTG-GZ", "Gazipur")],
    "LXN": [("LXN-LXN", "Laxmi Nagar"), ("LXN-PN", "Preet Vihar"), ("LXN-SN", "Shakarpur"), ("LXN-SKH", "Sukhdev Vihar"), ("LXN-JPR", "Jhilmil Pura")],
    "VSN": [("VSN-VSN", "Vishwas Nagar"), ("VSN-GZG", "Gaziabad Side"), ("VSN-JAF", "Jafrabad"), ("VSN-BK", "Bhajan Pura"), ("VSN-SBZ", "Subhash Mohalla")],
    "KRN": [("KRN-KRN", "Krishna Nagar Town"), ("KRN-GDN", "Gandhi Nagar"), ("KRN-SVP", "Shastri Park"), ("KRN-KBL", "Kabool Nagar"), ("KRN-SP", "Shahdara")],
    "GND": [("GND-GND", "Gandhi Nagar"), ("GND-EGD", "East Gandhi Nagar"), ("GND-GT", "Geeta Colony"), ("GND-NDR", "New Usmanpur"), ("GND-MGH", "Mohan Park")],
    "SHD": [("SHD-SHD", "Shahdara Town"), ("SHD-SVP", "Shahdara South"), ("SHD-UMN", "Usmanpur"), ("SHD-BBR", "Babarpur"), ("SHD-SLR", "Seelampur")],
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
