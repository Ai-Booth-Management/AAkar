import sys
import os
from sqlmodel import Session, select

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.infrastructure.db.sqlite_client import engine
from app.domain.models.hierarchy import HierarchyNode

with Session(engine) as session:
    # Find all nodes of level "district"
    districts = session.exec(select(HierarchyNode).where(HierarchyNode.level == "district")).all()
    for d in districts:
        print(f"District ID: {d.id}, Code: {d.code}, Name: {d.name}")
        constits = session.exec(select(HierarchyNode).where(HierarchyNode.parent_id == d.id)).all()
        print(f"  Constituencies ({len(constits)}): {[c.name for c in constits]}")
