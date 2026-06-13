import sys
import os
import pandas as pd
from pathlib import Path

# Add backend to path
backend_dir = "/home/lev/repos/AAkar/backend"
sys.path.append(backend_dir)
from app.infrastructure.db.neo4j_client import neo4j_client
from app.domain.services.graph_enrichment import update_booth_metrics

def sweep_phantom_issues():
    csv_path = Path(backend_dir) / "data" / "uploads" / "complaints.csv"
    if not csv_path.exists():
        print("Complaints CSV not found.")
        return
        
    df = pd.read_csv(csv_path)
    valid_ids = df['complaint_id'].dropna().astype(int).tolist()
    
    print(f"Valid IDs in CSV: {valid_ids}")
    
    query = """
    MATCH (c:Complaint)
    WHERE NOT c.complaint_id IN $valid_ids
    DETACH DELETE c
    RETURN count(c) AS deleted_count
    """
    
    result = neo4j_client.run_query(query, {"valid_ids": valid_ids})
    deleted = result[0]['deleted_count'] if result else 0
    print(f"Deleted {deleted} phantom Complaint nodes.")
    
    # Update booth tallies after deletion
    update_booth_metrics()

if __name__ == "__main__":
    sweep_phantom_issues()
