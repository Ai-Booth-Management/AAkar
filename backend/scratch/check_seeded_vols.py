import sys
from pathlib import Path
import json
from shapely.geometry import shape, Point
from sqlmodel import Session, select
sys.path.append("c:/Users/Pavithran/AAkar/backend")
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.campaign import CampaignVolunteer

# Load geojson
geojson_path = Path("c:/Users/Pavithran/AAkar/frontend/public/delhi_constituencies_abs.geojson")
with open(geojson_path, "r", encoding="utf-8") as f:
    geojson_data = json.load(f)

const_geoms = {}
for feat in geojson_data.get("features", []):
    name = feat["properties"].get("AC_NAME", "")
    if name:
        norm_name = "".join(name.replace(' (SC)', '').replace('(SC)', '').replace('-', ' ').replace('.', '').strip().lower().split())
        const_geoms[norm_name] = shape(feat["geometry"])

def normalize_name(name):
    return "".join(name.replace(' (SC)', '').replace('(SC)', '').replace('-', ' ').replace('.', '').strip().lower().split())

with Session(engine) as session:
    vols = session.exec(select(CampaignVolunteer)).all()
    print(f"Total volunteers in DB: {len(vols)}")
    
    inside_count = 0
    outside_count = 0
    missing_geom = 0
    
    for v in vols:
        norm_c = normalize_name(v.constituency)
        geom = const_geoms.get(norm_c)
        if not geom:
            missing_geom += 1
            print(f"Missing geometry for constituency: {v.constituency} (norm: {norm_c})")
            continue
        p = Point(v.lng, v.lat)
        if geom.contains(p):
            inside_count += 1
        else:
            outside_count += 1
            print(f"Volunteer {v.name} in {v.constituency} is OUTSIDE polygon! Coords: {v.lat}, {v.lng}")
            
    print(f"Inside: {inside_count}, Outside: {outside_count}, Missing Geom: {missing_geom}")
