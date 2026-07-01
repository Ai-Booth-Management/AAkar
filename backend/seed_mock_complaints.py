import random
from datetime import datetime, timedelta
from app.infrastructure.db.sqlite_client import get_session
from app.domain.models.complaint import Complaint
from sqlmodel import delete

def seed_complaints():
    with next(get_session()) as session:
        # Clear existing complaints
        session.exec(delete(Complaint))
        session.commit()

        # Target complaint counts
        complaint_targets = {
            "Water Supply": 1248,
            "Road Conditions": 986,
            "Garbage Collection": 742,
            "Street Lighting": 615,
            "Public Safety": 423
        }

        # Specific targets for Water Supply to match screenshot exactly
        water_supply_areas = {
            "Ward 12 (Rampur)": 186,
            "Ward 5 (Mandal Center)": 142,
            "Ward 8 (Shiv Nagar)": 128,
            "Ward 3 (East Colony)": 107,
            "Ward 14 (New Basti)": 98
        }
        
        # Calculate remaining water supply complaints for other areas
        remaining_water = complaint_targets["Water Supply"] - sum(water_supply_areas.values())
        
        areas = list(water_supply_areas.keys()) + [f"Ward {i}" for i in range(20, 30)]

        complaints_to_insert = []
        complaint_id_counter = 10000

        now = datetime.now()

        def create_complaint(type_, booth_id, severity="High"):
            nonlocal complaint_id_counter
            complaint_id_counter += 1
            # add random time offset in last 30 days
            timestamp = (now - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))).isoformat()
            return Complaint(
                complaint_id=complaint_id_counter,
                timestamp=timestamp,
                booth_id=booth_id,
                phone=f"91999{random.randint(10000, 99999)}",
                type=type_,
                status="Open" if random.random() > 0.3 else "Resolved",
                description=f"Mock {type_} complaint - Severity: {severity}"
            )

        # Seed specific Water Supply areas
        for area, count in water_supply_areas.items():
            for _ in range(count):
                complaints_to_insert.append(create_complaint("Water Supply", area))
                
        # Seed remaining Water Supply
        for _ in range(remaining_water):
            complaints_to_insert.append(create_complaint("Water Supply", random.choice(areas[5:])))
            
        # Seed other categories
        for type_, count in complaint_targets.items():
            if type_ == "Water Supply":
                continue
                
            severity = "High" if type_ == "Road Conditions" else "Medium"
            for _ in range(count):
                complaints_to_insert.append(create_complaint(type_, random.choice(areas), severity))

        # Batch insert
        session.bulk_save_objects(complaints_to_insert)
        session.commit()
        print(f"Successfully inserted {sum(complaint_targets.values())} complaints.")

if __name__ == "__main__":
    seed_complaints()
