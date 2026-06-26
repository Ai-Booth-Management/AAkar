import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from pathlib import Path
import pandas as pd
from app.infrastructure.db.neo4j_client import neo4j_client
from app.domain.services.graph_builder import process_voters, process_complaints

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "uploads"


def main():
    print("Clearing database...")
    neo4j_client.run_query("MATCH (n) DETACH DELETE n")
    print("Database cleared.")

    voters_csv = UPLOADS_DIR / "voters.csv"
    complaints_csv = UPLOADS_DIR / "complaints.csv"

    if voters_csv.exists():
        print("Loading voters...")
        voters_df = pd.read_csv(voters_csv)
        process_voters(voters_df)
    else:
        print(f"⚠️  {voters_csv} not found, skipping voters.")

    if complaints_csv.exists():
        print("Loading complaints...")
        complaints_df = pd.read_csv(complaints_csv)
        process_complaints(complaints_df)
    else:
        print(f"⚠️  {complaints_csv} not found, skipping complaints.")

    print("Database reset complete!")


if __name__ == "__main__":
    main()
