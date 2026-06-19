"""Add booth data: 2 booths per mandal in Delhi, plus BOOTH_PRESIDENT users."""
import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlmodel import Session, create_engine, select
from app.domain.models.hierarchy import HierarchyNode
from app.domain.models.user import User
from app.core.security import hash_password

sqlite_url = "sqlite:///./data/app.db"
engine = create_engine(sqlite_url)


def seed():
    with Session(engine) as session:
        existing_booth_codes = {
            n.code for n in session.exec(
                select(HierarchyNode).where(HierarchyNode.level == "booth")
            ).all()
        }

        delhi_state = session.exec(
            select(HierarchyNode).where(
                HierarchyNode.code == "DL", HierarchyNode.level == "state"
            )
        ).first()
        if not delhi_state:
            print("ERROR: Delhi state (DL) not found in hierarchy. Run seed_hierarchy.py or seed_delhi_mandals.py first.")
            return

        delhi_districts = session.exec(
            select(HierarchyNode).where(
                HierarchyNode.level == "district",
                HierarchyNode.parent_id == delhi_state.id,
            )
        ).all()
        delhi_district_ids = [d.id for d in delhi_districts]

        delhi_constituencies = session.exec(
            select(HierarchyNode).where(
                HierarchyNode.level == "constituency",
                HierarchyNode.parent_id.in_(delhi_district_ids),
            )
        ).all()
        delhi_constituency_ids = [c.id for c in delhi_constituencies]

        mandals = session.exec(
            select(HierarchyNode).where(
                HierarchyNode.level == "mandal",
                HierarchyNode.parent_id.in_(delhi_constituency_ids),
            )
            .order_by(HierarchyNode.code)
        ).all()

        print(f"Found {len(mandals)} mandals in Delhi")

        added_booths = 0
        skipped_booths = 0
        booth_map = {}

        for mandal in mandals:
            parent_id = mandal.id
            for i in (1, 2):
                bcode = f"{mandal.code}-B{i}"
                bname = f"{mandal.name} Booth {i}"
                if bcode in existing_booth_codes:
                    skipped_booths += 1
                    node = session.exec(
                        select(HierarchyNode).where(
                            HierarchyNode.code == bcode,
                            HierarchyNode.level == "booth",
                        )
                    ).first()
                    if node:
                        booth_map[bcode] = node
                    continue
                node = HierarchyNode(
                    code=bcode, name=bname, level="booth", parent_id=parent_id
                )
                session.add(node)
                session.flush()
                booth_map[bcode] = node
                existing_booth_codes.add(bcode)
                added_booths += 1

        session.commit()
        print(f"Added {added_booths} booths, skipped {skipped_booths} existing")

        pwd = hash_password("123456")
        created_users = 0
        skipped_users = 0

        for bcode, node in booth_map.items():
            email = f"booth.{bcode.lower()}@aakar.gov.in"
            existing_user = session.exec(
                select(User).where(User.email == email)
            ).first()
            if existing_user:
                skipped_users += 1
                continue

            mandal = session.exec(
                select(HierarchyNode).where(HierarchyNode.id == node.parent_id)
            ).first()
            constituency = session.exec(
                select(HierarchyNode).where(HierarchyNode.id == mandal.parent_id)
            ).first()
            district = session.exec(
                select(HierarchyNode).where(HierarchyNode.id == constituency.parent_id)
            ).first()
            state = session.exec(
                select(HierarchyNode).where(HierarchyNode.id == district.parent_id)
            ).first()

            user = User(
                email=email,
                hashed_password=pwd,
                role="BOOTH_PRESIDENT",
                display_name=node.name,
                state_id=state.code,
                district_id=district.code,
                constituency_id=constituency.code,
                mandal_id=mandal.code,
                booth_id=bcode,
            )
            session.add(user)
            created_users += 1

        session.commit()
        print(f"Created {created_users} BOOTH_PRESIDENT users, skipped {skipped_users} existing")
        print("Done seeding booths")


if __name__ == "__main__":
    seed()
