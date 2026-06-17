"""Seed Neo4j with CSV data from the uploads directory."""

import sys
from pathlib import Path

# Ensure the backend root is on the path
backend_root = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(backend_root))

import pandas as pd
from app.domain.services.graph_builder import process_voters, process_complaints, clear_database

UPLOADS_DIR = backend_root / "data" / "uploads"


def seed():
    print("Clearing existing data...")
    clear_database()
    
    voters_csv = UPLOADS_DIR / "voters.csv"
    complaints_csv = UPLOADS_DIR / "complaints.csv"

    if voters_csv.exists():
        print(f"Loading voters from {voters_csv}...")
        df = pd.read_csv(voters_csv)
        result = process_voters(df)
        print(f"  Success: {result}")
    else:
        print(f"  Warning: {voters_csv} not found, skipping.")

    if complaints_csv.exists():
        print(f"Loading complaints from {complaints_csv}...")
        df = pd.read_csv(complaints_csv)
        result = process_complaints(df)
        print(f"  Success: {result}")
    else:
        print(f"  Warning: {complaints_csv} not found, skipping.")

    print("Done! Graph seeded.")


if __name__ == "__main__":
    seed()
