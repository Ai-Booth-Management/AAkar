"""One-time script: assign every complaint to a constituency code round-robin across all 74 constituencies."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, select, func
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.hierarchy import HierarchyNode
from app.domain.models.complaint import Complaint

def main():
    with Session(engine) as s:
        constit_codes = s.exec(
            select(HierarchyNode.code).where(HierarchyNode.level == "constituency").order_by(HierarchyNode.code)
        ).all()
        print(f"Found {len(constit_codes)} constituencies")

        complaint_ids = s.exec(
            select(Complaint.id).order_by(Complaint.id)
        ).all()
        print(f"Found {len(complaint_ids)} complaints")

        if not constit_codes or not complaint_ids:
            print("Nothing to do")
            return

        updated = 0
        for i, cid in enumerate(complaint_ids):
            cc = constit_codes[i % len(constit_codes)]
            r = s.get(Complaint, cid)
            if r:
                r.constituency = cc
                updated += 1

        s.commit()
        print(f"Updated {updated} complaints with constituency codes")

        # Verify
        counts = s.exec(
            select(Complaint.constituency, func.count(Complaint.id)).group_by(Complaint.constituency)
        ).all()
        print(f"\nDistribution ({len(counts)} constituencies):")
        for cc, cnt in sorted(counts):
            print(f"  {cc}: {cnt}")

if __name__ == "__main__":
    main()
