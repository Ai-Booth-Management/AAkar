import json

with open("frontend/public/delhi_constituencies_abs.geojson", "r", encoding="utf-8") as f:
    gj = json.load(f)

updated = False
for feat in gj["features"]:
    props = feat["properties"]
    if props.get("AC_NAME") == "Nerela":
        print("Found Nerela feature. Current district:", props.get("district"))
        props["district"] = "North"
        print("Updated district to:", props.get("district"))
        updated = True

if updated:
    with open("frontend/public/delhi_constituencies_abs.geojson", "w", encoding="utf-8") as f:
        json.dump(gj, f, indent=2)
    print("Successfully saved updated delhi_constituencies_abs.geojson")
else:
    print("Nerela feature not found or not updated.")
