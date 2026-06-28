"""Seed latitude/longitude coordinates for all hierarchy nodes."""
import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlmodel import Session, create_engine, select
from app.domain.models.hierarchy import HierarchyNode

sqlite_url = "sqlite:///./data/app.db"
engine = create_engine(sqlite_url)

# State level
STATE_LOCATIONS = {
    "DL": [28.6139, 77.2090],
}

# District level (based on Delhi districts)
DISTRICT_LOCATIONS = {
    "NWD": [28.7140, 77.0989],
    "ND":  [28.6139, 77.2090],
    "SWD": [28.5876, 77.0614],
    "ED":  [28.6342, 77.3010],
}

# Constituency level (approximate centers)
CONSTITUENCY_LOCATIONS = {
    "MT":   [28.7050, 77.1850],
    "ROH":  [28.7300, 77.0700],
    "BAW":  [28.7900, 77.0300],
    "NAR":  [28.7900, 77.0900],
    "BAD":  [28.7100, 77.1300],
    "RIT":  [28.7200, 77.0800],
    "ND-01":[28.6300, 77.2150],
    "JNG":  [28.5700, 77.2400],
    "KN":   [28.5500, 77.2000],
    "MN":   [28.5200, 77.2100],
    "RKP":  [28.5900, 77.1700],
    "GK":   [28.5500, 77.2400],
    "DWK":  [28.5900, 77.0300],
    "MAT":  [28.6500, 77.0800],
    "NJF":  [28.6100, 76.9800],
    "PAL":  [28.5700, 77.0900],
    "BJW":  [28.5400, 77.0600],
    "TNK":  [28.79000, 77.08200],
    "PTG":  [28.6300, 77.2900],
    "LXN":  [28.6300, 77.2800],
    "VSN":  [28.6500, 77.2800],
    "KRN":  [28.6600, 77.2700],
    "GND":  [28.6500, 77.2600],
    "SHD":  [28.6700, 77.2800],
}

# Mandal level (approximate centers — offset from constituency center)
MANDAL_LOCATIONS = {
    "MT-S1":  [28.70200, 77.18800],
    "MT-S2":  [28.70500, 77.18300],
    "MT-S3":  [28.69345, 77.18482],
    "GTB":    [28.6950, 77.1950],
    "KAM":  [28.68910, 77.18911],
    "RH-S1":  [28.72245, 77.12139],
    "RH-S3":  [28.72443, 77.12007],
    "RH-S7":  [28.72374, 77.11779],
    "RH-S8":  [28.72136, 77.11779],
    "RH-S9":  [28.72067, 77.12007],
    "BAW-CTR":[28.7880, 77.0330],
    "BAW-IND":[28.7920, 77.0280],
    "BAW-EXT":[28.7950, 77.0250],
    "PAP":    [28.7800, 77.0400],
    "KHN":    [28.7850, 77.0350],
    "NAR-CTR":[28.7920, 77.0880],
    "NAR-IND":[28.7950, 77.0850],
    "BWL":    [28.8000, 77.0950],
    "BKH":    [28.7850, 77.0920],
    "TNK":    [28.7900, 77.0820],
    "BAD-SD":  [28.73076, 77.13737],
    "BAD-KR":  [28.73112, 77.12935],
    "BAD-RP":  [28.73122, 77.12923],
    "BAD-MN":  [28.73094, 77.13696],
    "BAD-SV":  [28.73100, 77.13683],
    "RIT-S1": [28.7180, 77.0830],
    "RIT-S4":  [28.72155, 77.07982],
    "RIT-S5":  [28.72306, 77.08060],
    "RIT-S6": [28.7200, 77.0800],
    "RIT-S11":[28.7150, 77.0850],
    "ND-CN":  [28.63200, 77.21800],
    "ND-BK":  [28.62800, 77.22000],
    "ND-DS":  [28.63500, 77.21200],
    "ND-DPH":  [28.63394, 77.21389],
    "ND-SG":  [28.62500, 77.21000],
    "JNG-DF":  [28.60504, 77.25738],
    "JNG-LPT":[28.5680, 77.2420],
    "JNG-SKH":  [28.60677, 77.25099],
    "JNG-NL": [28.5650, 77.2450],
    "JNG-BK":  [28.56392, 77.24777],
    "KN-GR":  [28.54877, 77.21369],
    "KN-HZK":  [28.54887, 77.21358],
    "KN-STR":  [28.54898, 77.21348],
    "KN-AM":  [28.54908, 77.21337],
    "KN-ADH":  [28.54969, 77.21418],
    "MN-SKT":  [28.52501, 77.20778],
    "MN-PSH":  [28.52525, 77.21045],
    "MN-CHA":  [28.52475, 77.20412],
    "MN-MDR":  [28.52547, 77.21249],
    "MN-SGD": [28.5250, 77.2050],
    "RKP-MN":  [28.59086, 77.16831],
    "RKP-NNP":[28.5880, 77.1720],
    "RKP-RK":  [28.59306, 77.16908],
    "RKP-KID":  [28.58344, 77.17386],
    "RKP-SNP":  [28.59308, 77.16938],
    "GK-E":   [28.5530, 77.2380],
    "GK-W":   [28.5480, 77.2420],
    "GK-CR":  [28.55541, 77.23444],
    "GK-MSH": [28.5450, 77.2450],
    "GK-NEZ":  [28.53438, 77.23786],
    "DWK-S1":  [28.59989, 77.09061],
    "DWK-S4":  [28.60333, 77.08798],
    "DWK-S6":  [28.60018, 77.06563],
    "DWK-S7":  [28.59981, 77.06570],
    "DWK-S12":  [28.60296, 77.06532],
    "MAT-ML":  [28.61704, 77.05670],
    "MAT-KH":  [28.61904, 77.05352],
    "MAT-PRM":  [28.61680, 77.05688],
    "MAT-SMB":  [28.61881, 77.05371],
    "MAT-RAW":  [28.61655, 77.05705],
    "NJF-JAF":[28.6120, 76.9780],
    "NJF-KK": [28.6080, 76.9820],
    "NJF-DND":[28.6050, 76.9750],
    "NJF-MIT":[28.6150, 76.9720],
    "NJF-JF": [28.6180, 76.9850],
    "PAL-CNT":  [28.57477, 77.08547],
    "PAL-SDJ":  [28.57443, 77.08516],
    "PAL-RNG":[28.5750, 77.0850],
    "PAL-MBR":  [28.57405, 77.08478],
    "PAL-VK":  [28.57366, 77.08441],
    "BJW-CAP":[28.5380, 77.0620],
    "BJW-BJW":[28.5420, 77.0580],
    "BJW-NGM":[28.5350, 77.0650],
    "BJW-NJK":[28.5450, 77.0550],
    "BJW-SB": [28.5480, 77.0500],
    "TNK-TNK":[28.6380, 77.1020],
    "TNK-VS": [28.6420, 77.0980],
    "TNK-SDN":  [28.63571, 77.10408],
    "TNK-ASN":  [28.64439, 77.09357],
    "TNK-RM": [28.6400, 77.1080],
    "PTG-PTG":  [28.61394, 77.30231],
    "PTG-SHI":  [28.61531, 77.30125],
    "PTG-KND":  [28.61466, 77.29965],
    "PTG-PD":  [28.61294, 77.29987],
    "PTG-GZ":  [28.61270, 77.30158],
    "LXN-LXN":[28.6320, 77.2780],
    "LXN-PN": [28.6280, 77.2820],
    "LXN-SN": [28.6350, 77.2750],
    "LXN-SKH":[28.6250, 77.2850],
    "LXN-JPR":[28.6380, 77.2720],
    "VSN-VSN":  [28.65238, 77.29290],
    "VSN-GZG":  [28.65905, 77.28806],
    "VSN-JAF":  [28.63898, 77.29020],
    "VSN-BK":  [28.66007, 77.28713],
    "VSN-SBZ":  [28.63971, 77.29080],
    "KRN-KRN":  [28.65633, 77.27235],
    "KRN-GDN":  [28.65643, 77.27035],
    "KRN-SVP":[28.6550, 77.2750],
    "KRN-KBL":  [28.65663, 77.27056],
    "KRN-SP":  [28.65672, 77.27121],
    "GND-GND":  [28.65272, 77.26354],
    "GND-EGD":  [28.65339, 77.25906],
    "GND-GT":  [28.65261, 77.26490],
    "GND-NDR":[28.6550, 77.2550],
    "GND-MGH":[28.6580, 77.2600],
    "SHD-SHD":  [28.66723, 77.28138],
    "SHD-SVP":  [28.66740, 77.28302],
    "SHD-UMN":  [28.67115, 77.30983],
    "SHD-BBR":[28.6650, 77.2850],
    "SHD-SLR":  [28.66941, 77.31154],
}


def seed():
    with Session(engine) as session:
        updated = 0
        skipped = 0

        nodes = session.exec(select(HierarchyNode)).all()
        for node in nodes:
            loc = None
            if node.level == "state":
                loc = STATE_LOCATIONS.get(node.code)
            elif node.level == "district":
                loc = DISTRICT_LOCATIONS.get(node.code)
            elif node.level == "constituency":
                loc = CONSTITUENCY_LOCATIONS.get(node.code)
            elif node.level == "mandal":
                loc = MANDAL_LOCATIONS.get(node.code)

            if loc:
                node.latitude = loc[0]
                node.longitude = loc[1]
                session.add(node)
                updated += 1
            else:
                skipped += 1

        session.commit()
        print(f"Updated {updated} nodes with coordinates, skipped {skipped}")

if __name__ == "__main__":
    seed()
