from sqlmodel import Session, create_engine, select
from app.domain.models.user import User
from app.domain.models.hierarchy import HierarchyNode

engine = create_engine('sqlite:///./data/app.db')
with Session(engine) as session:
    # 1. Fix Users
    users = session.exec(select(User)).all()
    for u in users:
        if u.booth_id == 'DL_ND_CP_B1': u.booth_id = 'ND-CN-B1'
        if u.mandal_id == 'DL_ND_CP': u.mandal_id = 'ND-CN'
        session.add(u)
    session.commit()
    print("Users synced.")

    # 2. Fix Hierarchy (Ensure ND-CN exists and is parent of ND-CN-B1)
    # The counts I saw earlier: [('DL', 'state'), ('ND', 'district'), ('ND-01', 'constituency'), ('ND-CN', 'mandal'), ('ND-CN-B1', 'booth')]
    # This looks correct already. Just ensure Booth 1 has total_voters = 1151
    booth = session.exec(select(HierarchyNode).where(HierarchyNode.code == 'ND-CN-B1')).first()
    if booth:
        booth.total_voters = 1151
        session.add(booth)
    session.commit()
    print("Hierarchy confirmed.")
