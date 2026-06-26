import json
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

with open("frontend/public/delhi_constituencies_abs.geojson", "r", encoding="utf-8") as f:
    constits_data = json.load(f)

# constituencies_new mapping
CONSTITUENCIES_NEW = {
    "South": ['Ambedkar Nagar', 'Chhatarpur', 'Deoli', 'Malviya Nagar', 'Mehrauli', 'R.K. Puram'],
    "East": ['Gandhi Nagar', 'Kondli', 'Krishna Nagar', 'Laxmi Nagar', 'Patparganj', 'Trilokpuri'],
    "West": ['Hari Nagar', 'Janakpuri', 'Madipur', 'Moti Nagar', 'Rajouri Garden', 'Tilak Nagar', 'Vikaspuri'],
}

def normalize_name(s: str) -> str:
    return "".join(s.lower().replace('(sc)', '').replace('(st)', '').replace('-', ' ').replace('.', '').split())

const_to_dist = {}
for dist, consts in CONSTITUENCIES_NEW.items():
    for c in consts:
        const_to_dist[normalize_name(c)] = dist

for dist_name in ["South", "East", "West"]:
    geoms = []
    for feat in constits_data.get("features", []):
        ac_name = feat["properties"].get("AC_NAME")
        if not ac_name:
            continue
        norm_name = normalize_name(ac_name)
        if norm_name in [normalize_name(c) for c in CONSTITUENCIES_NEW[dist_name]]:
            geoms.append(shape(feat["geometry"]))
            
    # buffered union
    u = unary_union([g.buffer(0.00005) for g in geoms]).buffer(-0.00005)
    print(f"District: {dist_name}, geom type: {u.geom_type}")
    if u.geom_type == 'MultiPolygon':
        for i, p in enumerate(u.geoms):
            print(f"  Part {i}: area={p.area}, bounds={p.bounds}")
