"""
scatter_all_volunteers.py
-------------------------
Loads all Delhi ward boundaries and centroids from delhi_wards.geojson,
and ward_to_constituency.json mapping, then updates ALL volunteers in SQLite
to distribute them uniformly/sequentially across all of Delhi's municipal wards.
"""
import sys
import os
import json
import random
import sqlite3
from pathlib import Path

# Ensure backend root is on path
backend_root = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_root))

db_path = backend_root / "data" / "app.db"
geojson_path = backend_root.parent / "frontend" / "public" / "delhi_wards.geojson"
mapping_path = backend_root.parent / "frontend" / "public" / "ward_to_constituency.json"

STREETS = [
    "Block A", "Block B", "Sector 3", "Sector 4", "Main Bazaar",
    "Gali No. 2", "Pocket C-9", "Phase 1 Colony", "Extension Area",
]

TASK_TEMPLATES = [
    "Door-to-door voter contact in Sector {n}",
    "Distribute pamphlets at {name} Colony",
    "Voter verification drive – Block {n}",
    "WhatsApp broadcast coordination",
    "Booth-level monitoring on poll day",
    "Complaint resolution follow-up – Ward {n}",
]

NAMES = [
    "Karan Sharma", "Arjun Verma", "Neha Gupta", "Vikram Singh", "Jyoti Sharma",
    "Sameer Rao", "Deepika Roy", "Vivek Anand", "Priyanka Sen", "Rohan Das",
    "Aarav Mehta", "Ishaan Kapoor", "Siddharth Malhotra", "Kabir Khan", "Aditya Joshi",
    "Riya Sen", "Ananya Pandey", "Kriti Sanon", "Tara Sutaria", "Kiara Advani",
]

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

def get_centroid(geom):
    coords = []
    if geom['type'] == 'Polygon':
        for ring in geom['coordinates']:
            coords.extend(ring)
    elif geom['type'] == 'MultiPolygon':
        for poly in geom['coordinates']:
            for ring in poly:
                coords.extend(ring)
    if not coords:
        return None
    # coords are [lng, lat]
    lngs = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return sum(lats)/len(lats), sum(lngs)/len(lngs)

def get_district_for_constituency(const_name):
    def norm(s):
        return "".join(s.lower().replace("(sc)", "").replace("(st)", "").replace("-", "").replace(" ", "").split())
    norm_const = norm(const_name)
    for dist, consts in CONSTITUENCIES_NEW.items():
        for c in consts:
            if norm(c) == norm_const:
                return dist
    return "Central"

def scatter():
    print(f"Loading geojson from: {geojson_path}")
    if not geojson_path.exists():
        print(f"Error: {geojson_path} not found.")
        return

    print(f"Loading mapping from: {mapping_path}")
    if not mapping_path.exists():
        print(f"Error: {mapping_path} not found.")
        return

    with open(geojson_path, "r", encoding="utf-8") as f:
        geojson_data = json.load(f)

    with open(mapping_path, "r", encoding="utf-8") as f:
        mapping_data = json.load(f)

    # Build mapping of Ward_No to Constituency
    ward_to_const = {item["Ward_No"]: item["Constituency"] for item in mapping_data}

    # Parse all wards and centroids
    wards_pool = []
    for feature in geojson_data.get("features", []):
        props = feature.get("properties", {})
        geom = feature.get("geometry", {})
        if not geom:
            continue
        centroid = get_centroid(geom)
        if not centroid:
            continue
        
        ward_no = props.get("Ward_No", "")
        ward_name = props.get("Ward_Name", "")
        const = ward_to_const.get(ward_no, "Chandni Chowk")
        district = get_district_for_constituency(const)
        
        wards_pool.append({
            "ward_no": ward_no,
            "ward_name": ward_name,
            "constituency": const,
            "district": district,
            "centroid": centroid
        })

    print(f"Parsed {len(wards_pool)} wards from GeoJSON.")
    if not wards_pool:
        print("No wards parsed. Exiting.")
        return

    # Seed the random generator for repeatability
    rng = random.Random(101)
    # Shuffle the wards_pool
    rng.shuffle(wards_pool)

    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all hierarchy constituencies
    cursor.execute("SELECT code, name FROM hierarchy_node WHERE level = 'constituency'")
    const_nodes = cursor.fetchall()
    const_name_to_code = {}
    for node in const_nodes:
        name_norm = "".join(node["name"].lower().replace("(sc)", "").replace("(st)", "").replace("-", "").replace(" ", "").split())
        const_name_to_code[name_norm] = node["code"]

    # Get all hierarchy booths
    cursor.execute("SELECT code FROM hierarchy_node WHERE level = 'booth'")
    booth_codes = [r["code"] for r in cursor.fetchall()]

    const_code_to_booths = {}
    for b_code in booth_codes:
        parts = b_code.split("-")
        if len(parts) >= 2:
            parent_const_code = f"{parts[0]}-{parts[1]}"
            if parent_const_code not in const_code_to_booths:
                const_code_to_booths[parent_const_code] = []
            const_code_to_booths[parent_const_code].append(b_code)

    cursor.execute("SELECT * FROM volunteer")
    volunteers = [dict(row) for row in cursor.fetchall()]
    print(f"Total volunteers found in database: {len(volunteers)}")

    # Reset all constituency coverage records to empty
    cursor.execute("UPDATE constituency_coverage SET covered = 0, covered_by = NULL, covered_at = NULL")

    fixed_count = 0

    for idx, v in enumerate(volunteers):
        # Pick ward sequentially/uniformly from shuffled pool
        w_info = wards_pool[idx % len(wards_pool)]
        ward_no = w_info["ward_no"]
        ward_name = w_info["ward_name"]
        const = w_info["constituency"]
        district = w_info["district"]
        lat_c, lng_c = w_info["centroid"]

        # Random scatter around centroid (very tight ±0.002 degrees for wards)
        lat = lat_c + rng.uniform(-0.002, 0.002)
        lng = lng_c + rng.uniform(-0.002, 0.002)

        # Resolve booth ID belonging to this constituency if possible
        const_norm = "".join(const.lower().replace("(sc)", "").replace("(st)", "").replace("-", "").replace(" ", "").split())
        const_code = const_name_to_code.get(const_norm)
        
        booth_id = None
        if const_code and const_code in const_code_to_booths:
            booth_id = rng.choice(const_code_to_booths[const_code])
        
        if not booth_id:
            slug = const.lower().replace(" ", "-")[:6]
            booth_id = f"nd-{slug}-m1-b{rng.randint(1, 3)}"

        # Generate realistic values
        street = rng.choice(STREETS)
        address = f"Flat {rng.randint(1, 400)}, {street}, {ward_name}"
        pincode = str(rng.randint(110001, 110096))
        name = v.get("name") or rng.choice(NAMES)

        task_status = rng.choice(["assigned", "accepted", "completed", "unassigned"])
        cov_status = "covered" if task_status == "completed" else "pending"
        camp_status = rng.choice(["active", "inactive"])
        
        assigned_task = rng.choice(TASK_TEMPLATES).format(
            n=rng.randint(1, 25), name=rng.choice(["East", "West", "North", "South"])
        )

        cursor.execute("""
            UPDATE volunteer
            SET name = ?,
                constituency = ?,
                district = ?,
                booth_id = ?,
                lat = ?,
                lng = ?,
                address = ?,
                pincode = ?,
                status = 'active',
                coverage_status = ?,
                task_status = ?,
                campaign_status = ?,
                assigned_task = ?,
                area_name = ?,
                block = ?,
                state = 'Delhi'
            WHERE id = ?
        """, (
            name, const, district, booth_id, lat, lng, address, pincode,
            cov_status, task_status, camp_status, assigned_task, ward_name, ward_name, v["id"]
        ))

        if cov_status == "covered":
            from datetime import datetime, timezone
            now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            cursor.execute("""
                UPDATE constituency_coverage
                SET covered = 1, covered_by = ?, covered_at = ?, updated_at = ?
                WHERE constituency = ?
            """, (name, now_str, now_str, const))

        fixed_count += 1

    conn.commit()
    conn.close()
    print(f"Successfully scattered all {fixed_count} volunteers across Delhi wards.")

if __name__ == "__main__":
    scatter()
