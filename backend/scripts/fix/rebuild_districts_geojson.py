import json
import sys
from pathlib import Path
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import unary_union

# constituencies_new mapping
CONSTITUENCIES_NEW = {
    "Central": ['Ballimaran', 'Chandni Chowk', 'Karol Bagh', 'Matia Mahal', 'Patel Nagar', 'Sadar Bazar'],
    "East": ['Gandhi Nagar', 'Kondli', 'Krishna Nagar', 'Laxmi Nagar', 'Patparganj', 'Trilokpuri'],
    "New Delhi": ['Delhi Cantt', 'Jangpura', 'New Delhi', 'Rajinder Nagar'],
    "North": ['Adarsh Nagar', 'Badli', 'Burari', 'Model Town', 'Nerela', 'Timarpur'],
    "North East": ['Ghonda', 'Gokalpur', 'Karawal Nagar', 'Mustafabad', 'Seelam Pur'],
    "North West": ['Bawana', 'Kirari', 'Mangol Puri', 'Mundka', 'Nangloi Jat', 'Rithala', 'Rohini', 'Shakur Basti', 'Shalimar Bagh', 'Sultan Pur Majra', 'Tri Nagar', 'Wazirpur'],
    "Shahdara": ['Babarpur', 'Rohtas Nagar', 'Seemapuri', 'Shahdara', 'Vishwas Nagar'],
    "South": ['Ambedkar Nagar', 'Chhatarpur', 'Deoli', 'Malviya Nagar', 'Mehrauli', 'R.K. Puram'],
    "South East": ['Badarpur', 'Greater Kailash', 'Kalkaji', 'Kasturba Nagar', 'Okhla', 'Sangam Vihar', 'Tughlakabad'],
    "South West": ['Bijwasan', 'Dwarka', 'Matiala', 'Najafgarh', 'Palam', 'Uttam Nagar'],
    "West": ['Hari Nagar', 'Janakpuri', 'Madipur', 'Moti Nagar', 'Rajouri Garden', 'Tilak Nagar', 'Vikaspuri'],
}

def normalize_name(s: str) -> str:
    return "".join(s.lower().replace('(sc)', '').replace('(st)', '').replace('-', ' ').replace('.', '').split())

# Create a mapping from normalized constituency name to district name
const_to_dist = {}
for dist, consts in CONSTITUENCIES_NEW.items():
    for c in consts:
        const_to_dist[normalize_name(c)] = dist

def clean_district_geometry(geoms):
    # 1. Buffer slightly and union
    buffered_union = unary_union([g.buffer(0.00005) for g in geoms]).buffer(-0.00005)
    
    # 2. Extract polygons and remove holes
    polygons = []
    if buffered_union.geom_type == 'Polygon':
        polygons.append(Polygon(buffered_union.exterior))
    elif buffered_union.geom_type == 'MultiPolygon':
        for p in buffered_union.geoms:
            polygons.append(Polygon(p.exterior))
            
    # 3. Filter out tiny sliver polygons (area < 1e-6)
    large_polygons = [p for p in polygons if p.area > 1e-6]
    
    # 4. Return as Polygon or MultiPolygon
    if len(large_polygons) == 1:
        return large_polygons[0]
    return MultiPolygon(large_polygons)

def main():
    # Paths
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    constits_path = repo_root / "frontend" / "public" / "delhi_constituencies_abs.geojson"
    districts_path = repo_root / "frontend" / "public" / "delhi_districts_abs.geojson"

    with open(constits_path, "r", encoding="utf-8") as f:
        constits_data = json.load(f)

    # Group shapely shapes by district
    district_shapes = {}
    for feat in constits_data.get("features", []):
        ac_name = feat["properties"].get("AC_NAME")
        if not ac_name:
            continue
        norm_name = normalize_name(ac_name)
        dist_name = const_to_dist.get(norm_name)
        if not dist_name:
            print(f"Warning: constituency {ac_name} not mapped to any district in CONSTITUENCIES_NEW!")
            continue
        
        geom = shape(feat["geometry"])
        district_shapes.setdefault(dist_name, []).append(geom)

    # Dissolve
    new_features = []
    for dist_name, geoms in district_shapes.items():
        union_geom = clean_district_geometry(geoms)
        feat = {
            "type": "Feature",
            "properties": {"dtname": dist_name},
            "geometry": mapping(union_geom)
        }
        new_features.append(feat)

    new_geojson = {
        "type": "FeatureCollection",
        "features": new_features
    }

    with open(districts_path, "w", encoding="utf-8") as f:
        json.dump(new_geojson, f, indent=2)

    print("Successfully dissolved constituencies into districts based on CONSTITUENCIES_NEW!")

if __name__ == "__main__":
    main()
