from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from app.core.security import get_current_user
from app.domain.models.user import User
from app.domain.models.hierarchy import HierarchyNode
from app.infrastructure.db.sqlite_client import get_session
from app.infrastructure.db.neo4j_client import neo4j_client

router = APIRouter()

LEVEL_ORDER = ["state", "district", "constituency", "mandal", "booth"]


def _require_auth(current_user: User = Depends(get_current_user)):
    return current_user


def _count_descendants(session: Session, parent_code: str, target_level: str) -> int:
    parent = session.exec(
        select(HierarchyNode).where(HierarchyNode.code == parent_code)
    ).first()
    if not parent:
        return 0

    try:
        parent_idx = LEVEL_ORDER.index(parent.level)
        target_idx = LEVEL_ORDER.index(target_level)
    except ValueError:
        return 0

    if target_idx <= parent_idx:
        return 0

    current_ids = list(
        session.exec(
            select(HierarchyNode.id).where(HierarchyNode.parent_id == parent.id)
        ).all()
    )

    # Direct children — current_ids are already at target level
    if target_idx == parent_idx + 1:
        return len(current_ids)

    # Walk down to the level just above target
    for _ in range(parent_idx + 1, target_idx - 1):
        if not current_ids:
            return 0
        current_ids = list(
            session.exec(
                select(HierarchyNode.id).where(HierarchyNode.parent_id.in_(current_ids))
            ).all()
        )

    if not current_ids:
        return 0
    result = session.exec(
        select(func.count(HierarchyNode.id)).where(HierarchyNode.parent_id.in_(current_ids))
    ).one()
    return result or 0


def _count_users(session: Session, role: str, state_id: str = None,
                 district_id: str = None, constituency_id: str = None,
                 mandal_id: str = None, booth_id: str = None) -> int:
    query = select(func.count(User.id)).where(User.role == role)
    if state_id:
        query = query.where(User.state_id == state_id)
    if district_id:
        query = query.where(User.district_id == district_id)
    if constituency_id:
        query = query.where(User.constituency_id == constituency_id)
    if mandal_id:
        query = query.where(User.mandal_id == mandal_id)
    if booth_id:
        query = query.where(User.booth_id == booth_id)
    result = session.exec(query).one()
    return result or 0


def _booth_voter_count(booth_code: str) -> int:
    try:
        result = neo4j_client.run_query(
            "MATCH (v:Voter {booth_id: $booth_id}) RETURN count(v) AS c",
            {"booth_id": booth_code}
        )
        return result[0]["c"] if result else 0
    except Exception:
        return 0


@router.get("/dashboard/stats")
def get_dashboard_stats(
    level: str,
    code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    if level == "state":
        return {
            "districts": _count_descendants(session, code, "district"),
            "constituencies": _count_descendants(session, code, "constituency"),
            "booths": _count_descendants(session, code, "booth"),
            "volunteers": _count_users(session, "VOLUNTEER", state_id=code),
            "district_admins": _count_users(session, "DISTRICT_ADMIN", state_id=code),
            "constituency_managers": _count_users(session, "CONSTITUENCY_MGR", state_id=code),
        }

    if level == "district":
        return {
            "constituencies": _count_descendants(session, code, "constituency"),
            "mandals": _count_descendants(session, code, "mandal"),
            "booths": _count_descendants(session, code, "booth"),
            "volunteers": _count_users(session, "VOLUNTEER", district_id=code),
            "constituency_managers": _count_users(session, "CONSTITUENCY_MGR", district_id=code),
        }

    if level == "constituency":
        return {
            "booths": _count_descendants(session, code, "booth"),
            "mandals": _count_descendants(session, code, "mandal"),
            "volunteers": _count_users(session, "VOLUNTEER", constituency_id=code),
        }

    if level == "mandal":
        return {
            "booths": _count_descendants(session, code, "booth"),
            "volunteers": _count_users(session, "VOLUNTEER", mandal_id=code),
        }

    if level == "booth":
        return {
            "volunteers": _count_users(session, "VOLUNTEER", booth_id=code),
            "voters": _booth_voter_count(code),
        }

    return {}
