"""Add mandal/sector data for all Delhi constituencies."""
import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from sqlmodel import Session, create_engine, select
from app.domain.models.hierarchy import HierarchyNode

sqlite_url = "sqlite:///./data/app.db"
engine = create_engine(sqlite_url)

# Mandals per Delhi constituency (using known wards/localities)
DELHI_MANDALS = {
    # North West Delhi (NWD)
    "MT":  [("MT-S1", "Model Town Sector 1"), ("MT-S2", "Model Town Sector 2"), ("MT-S3", "Model Town Sector 3"), ("GTB", "GTB Nagar"), ("KAM", "Kamla Nagar")],
    "ROH": [("RH-S1", "Rohini Sector 1"), ("RH-S3", "Rohini Sector 3"), ("RH-S7", "Rohini Sector 7"), ("RH-S8", "Rohini Sector 8"), ("RH-S9", "Rohini Sector 9")],
    "BAW": [("BAW-CTR", "Bawana Centre"), ("BAW-IND", "Bawana Industrial"), ("BAW-EXT", "Bawana Extension"), ("PAP", "Pooth Kalan"), ("KHN", "Khera Khurd")],
    "NAR": [("NAR-CTR", "Narela Centre"), ("NAR-IND", "Narela Industrial"), ("BWL", "Bhorgarh"), ("BKH", "Bakhtawarpur"), ("TNK", "Tikri Khurd")],
    "BAD": [("BAD-SD", "Budh Vihar"), ("BAD-KR", "Karala"), ("BAD-RP", "Rani Pura"), ("BAD-MN", "Mangolpuri"), ("BAD-SV", "Sultanpuri")],
    "RIT": [("RIT-S1", "Rithala Sector 1"), ("RIT-S4", "Rithala Sector 4"), ("RIT-S5", "Rithala Sector 5"), ("RIT-S6", "Rithala Sector 6"), ("RIT-S11", "Rithala Sector 11")],

    # New Delhi (ND)
    "ND-01": [("ND-CN", "Connaught Place"), ("ND-BK", "Barakhamba"), ("ND-DS", "Daryaganj"), ("ND-DPH", "Delhi Police HQs"), ("ND-SG", "Sarojini Nagar")],
    "JNG": [("JNG-DF", "Defence Colony"), ("JNG-LPT", "Lajpat Nagar"), ("JNG-SKH", "Sewa Khel"), ("JNG-NL", "Nizamuddin"), ("JNG-BK", "Bhogal")],
    "KN":  [("KN-GR", "Green Park"), ("KN-HZK", "Hauz Khas"), ("KN-STR", "South Extension"), ("KN-AM", "Amar Colony"), ("KN-ADH", "Adchini")],
    "MN":  [("MN-SKT", "Saket"), ("MN-PSH", "Pushp Vihar"), ("MN-CHA", "Chhatarpur"), ("MN-MDR", "Madanpur Khadar"), ("MN-SGD", "Saidulajab")],
    "RKP": [("RKP-MN", "Moti Bagh"), ("RKP-NNP", "Nanak Pura"), ("RKP-RK", "RK Puram"), ("RKP-KID", "Kidwai Nagar"), ("RKP-SNP", "South Patel Nagar")],
    "GK":  [("GK-E", "Greater Kailash East"), ("GK-W", "Greater Kailash West"), ("GK-CR", "Chirag Delhi"), ("GK-MSH", "Masjid Moth"), ("GK-NEZ", "Neeti Bagh")],

    # South West Delhi (SWD)
    "DWK": [("DWK-S1", "Dwarka Sector 1"), ("DWK-S4", "Dwarka Sector 4"), ("DWK-S6", "Dwarka Sector 6"), ("DWK-S7", "Dwarka Sector 7"), ("DWK-S12", "Dwarka Sector 12")],
    "MAT": [("MAT-ML", "Mangolpuri"), ("MAT-KH", "Khanpur"), ("MAT-PRM", "Palam Farms"), ("MAT-SMB", "Samalka"), ("MAT-RAW", "Roshanpura")],
    "NJF": [("NJF-JAF", "Najafgarh Town"), ("NJF-KK", "Kakrola"), ("NJF-DND", "Dhansa"), ("NJF-MIT", "Mitraon"), ("NJF-JF", "Jaffarpur")],
    "PAL": [("PAL-CNT", "Palam Cantonment"), ("PAL-SDJ", "Sadar Bazar"), ("PAL-RNG", "Rangpuri"), ("PAL-MBR", "Mahipalpur"), ("PAL-VK", "Vasant Kunj")],
    "BJW": [("BJW-CAP", "Kapashera"), ("BJW-BJW", "Bijwasan Town"), ("BJW-NGM", "Nangal"), ("BJW-NJK", "Nangli Jiwan"), ("BJW-SB", "Sushant Lok")],
    "TNK": [("TNK-TNK", "Tilak Nagar Town"), ("TNK-VS", "Vishnu Garden"), ("TNK-SDN", "Subhash Nagar"), ("TNK-ASN", "Ashok Nagar"), ("TNK-RM", "Ramesh Nagar")],

    # East Delhi (ED)
    "PTG": [("PTG-PTG", "Patparganj Village"), ("PTG-SHI", "Shashi Garden"), ("PTG-KND", "Kaushambi"), ("PTG-PD", "Pandav Nagar"), ("PTG-GZ", "Gazipur")],
    "LXN": [("LXN-LXN", "Laxmi Nagar"), ("LXN-PN", "Preet Vihar"), ("LXN-SN", "Shakarpur"), ("LXN-SKH", "Sukhdev Vihar"), ("LXN-JPR", "Jhilmil Pura")],
    "VSN": [("VSN-VSN", "Vishwas Nagar"), ("VSN-GZG", "Gaziabad Side"), ("VSN-JAF", "Jafrabad"), ("VSN-BK", "Bhajan Pura"), ("VSN-SBZ", "Subhash Mohalla")],
    "KRN": [("KRN-KRN", "Krishna Nagar Town"), ("KRN-GDN", "Gandhi Nagar"), ("KRN-SVP", "Shastri Park"), ("KRN-KBL", "Kabool Nagar"), ("KRN-SP", "Shahdara")],
    "GND": [("GND-GND", "Gandhi Nagar"), ("GND-EGD", "East Gandhi Nagar"), ("GND-GT", "Geeta Colony"), ("GND-NDR", "New Usmanpur"), ("GND-MGH", "Mohan Park")],
    "SHD": [("SHD-SHD", "Shahdara Town"), ("SHD-SVP", "Shahdara South"), ("SHD-UMN", "Usmanpur"), ("SHD-BBR", "Babarpur"), ("SHD-SLR", "Seelampur")],
}

def seed():
    with Session(engine) as session:
        existing_mandals = session.exec(
            select(HierarchyNode).where(HierarchyNode.level == "mandal")
        ).all()
        
        # Get existing mandal codes to avoid duplicates
        existing_codes = {m.code for m in existing_mandals}
        
        added = 0
        skipped = 0
        for ccode, mandals in DELHI_MANDALS.items():
            parent = session.exec(
                select(HierarchyNode).where(
                    HierarchyNode.code == ccode,
                    HierarchyNode.level == "constituency"
                )
            ).first()
            if not parent:
                print(f"  WARNING: constituency {ccode} not found, skipping")
                continue
            
            for mcode, mname in mandals:
                if mcode in existing_codes:
                    skipped += 1
                    continue
                node = HierarchyNode(code=mcode, name=mname, level="mandal", parent_id=parent.id)
                session.add(node)
                existing_codes.add(mcode)
                added += 1
        
        session.commit()
        print(f"Added {added} mandals, skipped {skipped} existing")
        print(f"Total Delhi mandals: {added + skipped}")

if __name__ == "__main__":
    seed()
