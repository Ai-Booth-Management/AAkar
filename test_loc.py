import sys
import os
sys.path.append('/home/lev/repo/AAkar/backend')
from app.db.session import SessionLocal
from app.domain.models.hierarchy import HierarchyNode
from sqlmodel import select

with SessionLocal() as session:
    node = session.exec(select(HierarchyNode).where(HierarchyNode.code == 'ND-NDL-M1-B1')).first()
    print("Node:", node)
    if node:
        print("Lat:", node.latitude, "Lng:", node.longitude)
