from datetime import datetime, timezone
import random
import json
from pathlib import Path
from shapely.geometry import shape, Point
from sqlmodel import Session, select
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.campaign import CampaignVolunteer, ConstituencyCoverage

from app.api.v1.endpoints.campaign import CONSTITUENCIES_NEW as CONSTITUENCIES

def seed_campaign_volunteers():
    DELHI_DISTRICTS = [
        'Central', 'East', 'New Delhi', 'North', 'North East',
        'North West', 'Shahdara', 'South', 'South East', 'South West', 'West'
    ]

    DISTRICT_CENTERS = {
        'Central':    [28.6517, 77.2219],
        'East':       [28.6342, 77.3010],
        'New Delhi':  [28.6139, 77.2090],
        'North':      [28.7041, 77.1025],
        'North East': [28.7000, 77.2620],
        'North West': [28.7140, 77.0989],
        'Shahdara':   [28.6717, 77.2880],
        'South':      [28.5244, 77.2066],
        'South East': [28.5623, 77.2905],
        'South West': [28.5876, 77.0614],
        'West':       [28.6271, 77.0947],
    }

    geojson_path = Path("c:/Users/Pavithran/AAkar/frontend/public/delhi_constituencies_abs.geojson")
    if not geojson_path.exists():
        geojson_path = Path(__file__).parent.parent.parent / "frontend/public/delhi_constituencies_abs.geojson"

    const_geoms = {}
    if geojson_path.exists():
        try:
            with open(geojson_path, "r", encoding="utf-8") as f:
                geojson_data = json.load(f)
            for feat in geojson_data.get("features", []):
                name = feat["properties"].get("AC_NAME", "")
                if name:
                    norm_name = "".join(name.replace(' (SC)', '').replace('(SC)', '').replace('-', ' ').replace('.', '').strip().lower().split())
                    const_geoms[norm_name] = shape(feat["geometry"])
        except Exception as e:
            print("Error loading geojson in seed:", e)

    def get_random_point_in_geom(geom, fallback_y, fallback_x):
        try:
            minx, miny, maxx, maxy = geom.bounds
            for _ in range(200):
                p = Point(random.uniform(minx, maxx), random.uniform(miny, maxy))
                if geom.contains(p):
                    return p.y, p.x
            c = geom.centroid
            return c.y, c.x
        except Exception:
            return fallback_y, fallback_x

    with Session(engine) as session:
        statement = select(CampaignVolunteer)
        existing = session.exec(statement).first()
        if not existing:
            # First, ensure all constituency coverage rows exist
            for district, constits in CONSTITUENCIES.items():
                for c in constits:
                    cov_exist = session.exec(
                        select(ConstituencyCoverage)
                        .where(ConstituencyCoverage.district == district)
                        .where(ConstituencyCoverage.constituency == c)
                    ).first()
                    if not cov_exist:
                        session.add(ConstituencyCoverage(district=district, constituency=c))
            session.commit()

            NAMES = [
                'Rajesh Kumar', 'Priya Singh', 'Amit Sharma', 'Sunita Devi', 'Manish Yadav',
                'Kavita Gupta', 'Rohit Verma', 'Anjali Mehta', 'Deepak Joshi', 'Pooja Patel',
                'Vinod Chauhan', 'Rekha Nair', 'Aman Verma', 'Neha Sharma', 'Vikram Singh',
                'Siddharth Malhotra', 'Ritu Kapoor', 'Sanjay Dutt', 'Divya Bharti', 'Arjun Rampal'
            ]
            TASKS = [
                'Voter outreach', 'Door-to-door canvassing', 'Booth monitoring',
                'Pamphlet distribution', 'Rally coordination'
            ]

            volunteers = []
            for district in DELHI_DISTRICTS:
                center = DISTRICT_CENTERS[district]
                constits = CONSTITUENCIES[district]
                num_vols = random.randint(8, 12)
                for i in range(num_vols):
                    name = NAMES[(i + len(district)) % len(NAMES)]
                    phone = f"+91 98{random.randint(10000000, 99999999)}"
                    constituency = random.choice(constits)
                    area = f"{constituency} Sector {random.choice(['A', 'B', 'C', 'Market', 'Residential'])}"
                    task_status = random.choice(["unassigned", "assigned", "accepted", "completed"])
                    task = random.choice(TASKS) if task_status != "unassigned" else ""

                    # Compute scattered coordinates inside constituency
                    norm_c = "".join(constituency.replace(' (SC)', '').replace('(SC)', '').replace('-', ' ').replace('.', '').strip().lower().split())
                    geom = const_geoms.get(norm_c)
                    if geom:
                        lat, lng = get_random_point_in_geom(geom, center[0], center[1])
                    else:
                        lat = center[0] + (random.random() - 0.5) * 0.018
                        lng = center[1] + (random.random() - 0.5) * 0.018

                    status = "active" if random.random() > 0.3 else "inactive"
                    coverage_status = "covered" if random.random() > 0.45 else "pending"
                    last_update = datetime.now(timezone.utc).isoformat()

                    vol = CampaignVolunteer(
                        name=name,
                        phone=phone,
                        district=district,
                        constituency=constituency,
                        assigned_area=area,
                        assigned_task=task,
                        lat=lat,
                        lng=lng,
                        status=status,
                        coverage_status=coverage_status,
                        task_status=task_status,
                        last_location_update=last_update
                    )
                    volunteers.append(vol)
                    
                    if coverage_status == "covered":
                        cov = session.exec(
                            select(ConstituencyCoverage)
                            .where(ConstituencyCoverage.district == district)
                            .where(ConstituencyCoverage.constituency == constituency)
                        ).first()
                        if cov:
                            cov.covered = True
                            cov.covered_by = name
                            cov.covered_at = last_update
                            cov.updated_at = last_update
                            session.add(cov)
                            
            session.add_all(volunteers)
            session.commit()
            print("Campaign volunteers seeded successfully!")
