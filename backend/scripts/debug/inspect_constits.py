import json
from pathlib import Path

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

const_to_dist = {}
for dist, consts in CONSTITUENCIES_NEW.items():
    for c in consts:
        const_to_dist[normalize_name(c)] = dist

for filename in ["frontend/public/delhi_constituencies.geojson", "frontend/public/delhi_constituencies_abs.geojson"]:
    if not Path(filename).exists():
        continue
    with open(filename, "r", encoding="utf-8") as f:
        gj = json.load(f)

    print(f"\nMismatch in {filename}:")
    for feat in gj["features"]:
        props = feat["properties"]
        ac_name = props.get("AC_NAME")
        if not ac_name:
            continue
        norm_ac = normalize_name(ac_name)
        expected_dist = const_to_dist.get(norm_ac)
        actual_dist = props.get("district")
        if expected_dist != actual_dist:
            print(f"AC_NAME: {ac_name} | expected: {expected_dist} | actual in geojson: {actual_dist}")
