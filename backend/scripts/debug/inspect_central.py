import json
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

with open("frontend/public/delhi_constituencies_abs.geojson", "r", encoding="utf-8") as f:
    constits_data = json.load(f)

CONSTITUENCIES_NEW = {
    "Central": ['Ballimaran', 'Chandni Chowk', 'Karol Bagh', 'Matia Mahal', 'Patel Nagar', 'Sadar Bazar'],
}

def normalize_name(s: str) -> str:
    return "".join(s.lower().replace('(sc)', '').replace('(st)', '').replace('-', ' ').replace('.', '').split())

geoms = []
for feat in constits_data.get("features", []):
    ac_name = feat["properties"].get("AC_NAME")
    if not ac_name:
        continue
    norm_name = normalize_name(ac_name)
    if norm_name in [normalize_name(c) for c in CONSTITUENCIES_NEW["Central"]]:
        geoms.append(shape(feat["geometry"]))

u = unary_union(geoms)
print("Central geom type:", u.geom_type)
if u.geom_type == 'MultiPolygon':
    for i, p in enumerate(u.geoms):
        print(f"Part {i}: area={p.area}, bounds={p.bounds}")
