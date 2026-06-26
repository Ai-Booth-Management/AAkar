import asyncio
import os
from pathlib import Path
from app.domain.services.seed_graph import seed

async def auto_update_csv():
    voters_file = Path("data/uploads/voters.csv")
    complaints_file = Path("data/uploads/complaints.csv")
    last_voter_mtime = 0
    last_complaint_mtime = 0
    voters_existed = False
    complaints_existed = False
    
    if voters_file.exists():
        last_voter_mtime = os.stat(voters_file).st_mtime
        voters_existed = True
    if complaints_file.exists():
        last_complaint_mtime = os.stat(complaints_file).st_mtime
        complaints_existed = True

    while True:
        await asyncio.sleep(2)
        
        # Watch voters.csv
        current_voters_exists = voters_file.exists()
        if current_voters_exists:
            v_mtime = os.stat(voters_file).st_mtime
            if v_mtime > last_voter_mtime:
                print("💥 Detected change in voters.csv! Auto-updating Neo4j database...")
                last_voter_mtime = v_mtime
                voters_existed = True
                from app.api.v1.endpoints import upload
                if not upload.API_UPLOAD_IN_PROGRESS:
                    try:
                        seed()
                        print("✅ Voters auto-update complete!")
                    except Exception as e:
                        print(f"❌ Voters auto-update failed: {e}")
                else:
                    print("⏭️ Skipping voters auto-update; API upload in progress.")
        else:
            if voters_existed:
                print("💥 Detected deletion of voters.csv! Clearing corresponding Neo4j data...")
                voters_existed = False
                last_voter_mtime = 0
                from app.api.v1.endpoints import upload
                if not upload.API_UPLOAD_IN_PROGRESS:
                    try:
                        seed()
                        print("✅ Voters deletion sync complete!")
                    except Exception as e:
                        print(f"❌ Voters deletion sync failed: {e}")

        # Watch complaints.csv
        current_complaints_exists = complaints_file.exists()
        if current_complaints_exists:
            c_mtime = os.stat(complaints_file).st_mtime
            if c_mtime > last_complaint_mtime:
                print("💥 Detected change in complaints.csv! Auto-syncing to Knowledge Graph...")
                last_complaint_mtime = c_mtime
                complaints_existed = True
                from app.api.v1.endpoints import upload
                if not upload.API_UPLOAD_IN_PROGRESS:
                    try:
                        import pandas as pd
                        from app.domain.services.graph_builder import process_complaints
                        df = pd.read_csv(complaints_file)
                        process_complaints(df)
                        print("✅ Complaints auto-sync complete!")
                    except Exception as e:
                        print(f"❌ Complaints auto-sync failed: {e}")
                else:
                    print("⏭️ Skipping complaints auto-sync; API upload in progress.")
        else:
            if complaints_existed:
                print("💥 Detected deletion of complaints.csv! Clearing corresponding Neo4j data...")
                complaints_existed = False
                last_complaint_mtime = 0
                from app.api.v1.endpoints import upload
                if not upload.API_UPLOAD_IN_PROGRESS:
                    try:
                        seed()
                        print("✅ Complaints deletion sync complete!")
                    except Exception as e:
                        print(f"❌ Complaints deletion sync failed: {e}")
