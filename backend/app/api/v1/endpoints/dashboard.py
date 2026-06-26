from fastapi import APIRouter, Depends, HTTPException
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


def _booth_voter_stats(booth_code: str) -> dict:
    try:
        query = """
        MATCH (v:Voter {booth_id: $booth_id})
        WITH count(v) as total,
             sum(CASE WHEN v.gender =~ '(?i)Male' THEN 1 ELSE 0 END) as male,
             sum(CASE WHEN v.gender =~ '(?i)Female' THEN 1 ELSE 0 END) as female,
             sum(CASE WHEN toInteger(v.age) < 35 THEN 1 ELSE 0 END) as youth,
             sum(CASE WHEN toInteger(v.age) > 60 THEN 1 ELSE 0 END) as seniors,
             count(DISTINCT v.house_no) as households
        RETURN total, male, female, youth, seniors, households
        """
        result = neo4j_client.run_query(query, {"booth_id": booth_code})
        if result:
            r = result[0]
            return {
                "total": r["total"],
                "male": r["male"],
                "female": r["female"],
                "youth": r["youth"],
                "seniors": r["seniors"],
                "households": r["households"]
            }
        return {"total": 0, "male": 0, "female": 0, "youth": 0, "seniors": 0, "households": 0}
    except Exception:
        return {"total": 0, "male": 0, "female": 0, "youth": 0, "seniors": 0, "households": 0}


def _mandal_voter_stats(session: Session, mandal_code: str) -> dict:
    try:
        mandal = session.exec(select(HierarchyNode).where(HierarchyNode.code == mandal_code, HierarchyNode.level == "mandal")).first()
        if not mandal: return {"total": 0, "male": 0, "female": 0, "youth": 0, "seniors": 0, "households": 0}
        
        booth_codes = session.exec(select(HierarchyNode.code).where(HierarchyNode.parent_id == mandal.id, HierarchyNode.level == "booth")).all()
        if not booth_codes: return {"total": 0, "male": 0, "female": 0, "youth": 0, "seniors": 0, "households": 0}

        query = """
        MATCH (v:Voter)
        WHERE v.booth_id IN $booth_ids
        WITH count(v) as total,
             sum(CASE WHEN v.gender =~ '(?i)Male' THEN 1 ELSE 0 END) as male,
             sum(CASE WHEN v.gender =~ '(?i)Female' THEN 1 ELSE 0 END) as female,
             sum(CASE WHEN toInteger(v.age) < 35 THEN 1 ELSE 0 END) as youth,
             sum(CASE WHEN toInteger(v.age) > 60 THEN 1 ELSE 0 END) as seniors,
             count(DISTINCT v.house_no) as households
        RETURN total, male, female, youth, seniors, households
        """
        result = neo4j_client.run_query(query, {"booth_ids": list(booth_codes)})
        if result:
            r = result[0]
            return {
                "total": r["total"],
                "male": r["male"],
                "female": r["female"],
                "youth": r["youth"],
                "seniors": r["seniors"],
                "households": r["households"]
            }
        return {"total": 0, "male": 0, "female": 0, "youth": 0, "seniors": 0, "households": 0}
    except Exception:
        return {"total": 0, "male": 0, "female": 0, "youth": 0, "seniors": 0, "households": 0}


@router.get("/dashboard/districts")
def get_state_districts_analytics(
    state_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Returns a list of districts within a state with their metrics."""
    from app.domain.services.bosi_service import BOSIEngine
    return BOSIEngine.get_state_district_scores(state_code, session)


@router.get("/dashboard/district/constituencies")
def get_district_constituencies_analytics(
    district_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Returns a list of constituencies within a district with their metrics."""
    from app.domain.services.bosi_service import BOSIEngine
    return BOSIEngine.get_district_constituency_scores(district_code, session)


@router.get("/dashboard/households")
def get_booth_households(
    booth_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Returns coverage metrics and a list of households for a booth."""
    # 1. Fetch Metrics
    metrics_query = """
    MATCH (h:Household {booth_id: $booth_id})
    RETURN count(h) AS total,
           sum(CASE WHEN h.covered = true THEN 1 ELSE 0 END) AS covered,
           sum(CASE WHEN h.covered = false OR h.covered IS NULL THEN 1 ELSE 0 END) AS left
    """
    
    # 2. Fetch Detailed List
    list_query = """
    MATCH (h:Household {booth_id: $booth_id})
    OPTIONAL MATCH (v:Voter)-[:MEMBER_OF]->(h)
    RETURN h.house_no AS house_no, 
           h.address_id AS id, 
           count(v) AS members, 
           coalesce(h.covered, false) AS covered
    ORDER BY h.house_no ASC
    """
    
    try:
        metrics = neo4j_client.run_query(metrics_query, {"booth_id": booth_code})[0]
        households = neo4j_client.run_query(list_query, {"booth_id": booth_code})
        return {
            "metrics": {
                "total": metrics["total"],
                "covered": metrics["covered"],
                "left": metrics["left"]
            },
            "households": households
        }
    except Exception as e:
        print(f"Household API Error: {e}")
        return {"metrics": {"total": 0, "covered": 0, "left": 0}, "households": []}


from pydantic import BaseModel

class StatusToggleRequest(BaseModel):
    address_id: str
    covered: bool

@router.post("/dashboard/households/toggle-status")
def toggle_household_status(
    req: StatusToggleRequest,
    _user: User = Depends(_require_auth),
):
    """Toggles the covered status of a specific household."""
    query = """
    MATCH (h:Household {address_id: $address_id})
    SET h.covered = $covered
    RETURN h.address_id AS id, h.covered AS covered
    """
    try:
        result = neo4j_client.run_query(query, {"address_id": req.address_id, "covered": req.covered})
        if not result:
            raise HTTPException(status_code=404, detail="Household not found")
        return result[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard/mandals")
def get_constituency_mandals_analytics(
    constituency_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Returns analytics for all mandals in a constituency."""
    from app.domain.services.bosi_service import BOSIEngine
    return BOSIEngine.get_constituency_mandal_scores(constituency_code, session)


@router.get("/dashboard/constituency/booths")
def get_constituency_booths_directory(
    constituency_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Returns detailed booth directory grouped by mandal for a constituency."""
    from app.domain.services.bosi_service import BOSIEngine
    return BOSIEngine.get_constituency_booth_directory(constituency_code, session)


@router.get("/dashboard/booths")
def get_mandal_booth_analytics(
    mandal_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Returns analytics for all booths in a mandal."""
    from app.domain.services.bosi_service import BOSIEngine
    return BOSIEngine.get_mandal_booth_scores(mandal_code, session)


@router.get("/dashboard/complaints/analytics")
def get_mandal_complaints_analytics(
    mandal_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Aggregates complaint stats for a mandal."""
    mandal = session.exec(select(HierarchyNode).where(HierarchyNode.code == mandal_code, HierarchyNode.level == "mandal")).first()
    if not mandal: raise HTTPException(status_code=404, detail="Mandal not found")
    
    booth_codes = session.exec(select(HierarchyNode.code).where(HierarchyNode.parent_id == mandal.id, HierarchyNode.level == "booth")).all()
    if not booth_codes: return {"total": 0, "resolved": 0}

    # Query Neo4j
    query = """
    MATCH (c:Complaint)
    WHERE c.booth_id IN $booth_ids
    RETURN 
        count(c) as total,
        sum(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved
    """
    result = neo4j_client.run_query(query, {"booth_ids": list(booth_codes)})
    if result:
        r = result[0]
        return {"total": r["total"], "resolved": r["resolved"]}
    return {"total": 0, "resolved": 0}


@router.get("/dashboard/district/complaints/analytics")
def get_district_complaints_analytics(
    district_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Aggregates complaint stats for a district."""
    district = session.exec(select(HierarchyNode).where(HierarchyNode.code == district_code, HierarchyNode.level == "district")).first()
    if not district: raise HTTPException(status_code=404, detail="District not found")
    
    # Get all booth codes under this district (District -> Constituency -> Mandal -> Booth)
    booth_codes = session.exec(
        select(HierarchyNode.code).where(HierarchyNode.level == "booth", HierarchyNode.parent_id.in_(
            select(HierarchyNode.id).where(HierarchyNode.parent_id.in_(
                select(HierarchyNode.id).where(HierarchyNode.parent_id.in_(
                    select(HierarchyNode.id).where(HierarchyNode.parent_id == district.id)
                ))
            ))
        ))
    ).all()
    
    if not booth_codes: return {"total": 0, "resolved": 0}

    # Query Neo4j
    query = """
    MATCH (c:Complaint)
    WHERE c.booth_id IN $booth_ids
    RETURN 
        count(c) as total,
        sum(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved
    """
    result = neo4j_client.run_query(query, {"booth_ids": list(booth_codes)})
    if result:
        r = result[0]
        return {"total": r["total"], "resolved": r["resolved"]}
    return {"total": 0, "resolved": 0}


@router.get("/dashboard/complaints/directory")
def get_mandal_complaints_directory(
    mandal_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Returns complaints grouped by booth."""
    mandal = session.exec(select(HierarchyNode).where(HierarchyNode.code == mandal_code, HierarchyNode.level == "mandal")).first()
    if not mandal: return []
    
    booths = session.exec(select(HierarchyNode).where(HierarchyNode.parent_id == mandal.id, HierarchyNode.level == "booth")).all()
    
    results = []
    for b in booths:
        query = """
        MATCH (c:Complaint)
        WHERE c.booth_id = $booth_id
        RETURN 
            c.complaint_id as id,
            c.type as type,
            c.status as status,
            c.description as description,
            c.timestamp as timestamp
        ORDER BY c.timestamp DESC
        """
        complaints = neo4j_client.run_query(query, {"booth_id": b.code})
        results.append({
            "booth_code": b.code,
            "booth_name": b.name,
            "complaints": complaints
        })
    return results


@router.get("/dashboard/volunteers/analytics")
def get_mandal_volunteer_analytics(
    mandal_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Aggregates volunteer stats for a mandal."""
    mandal = session.exec(select(HierarchyNode).where(HierarchyNode.code == mandal_code, HierarchyNode.level == "mandal")).first()
    if not mandal: raise HTTPException(status_code=404, detail="Mandal not found")
    
    booth_codes = session.exec(select(HierarchyNode.code).where(HierarchyNode.parent_id == mandal.id, HierarchyNode.level == "booth")).all()
    if not booth_codes: return {"active": 0, "pending_tasks": 0, "completed_tasks": 0}

    from app.domain.models.volunteer import Volunteer, Task
    active_count = session.exec(select(func.count(Volunteer.id)).where(Volunteer.booth_id.in_(list(booth_codes)), Volunteer.status == "active")).one()
    pending_tasks = session.exec(select(func.count(Task.id)).where(Task.booth_id.in_(list(booth_codes)), Task.status == "assigned")).one()
    completed_tasks = session.exec(select(func.count(Task.id)).where(Task.booth_id.in_(list(booth_codes)), Task.status == "completed")).one()
    
    return {
        "active": active_count,
        "pending_tasks": pending_tasks,
        "completed_tasks": completed_tasks
    }


@router.get("/dashboard/volunteers/directory")
def get_mandal_volunteer_directory(
    mandal_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Returns a booth-wise list of volunteers with contact info."""
    mandal = session.exec(select(HierarchyNode).where(HierarchyNode.code == mandal_code, HierarchyNode.level == "mandal")).first()
    if not mandal: return []
    
    booths = session.exec(select(HierarchyNode).where(HierarchyNode.parent_id == mandal.id, HierarchyNode.level == "booth")).all()
    
    from app.domain.models.volunteer import Volunteer
    results = []
    for b in booths:
        volunteers = session.exec(select(Volunteer).where(Volunteer.booth_id == b.code)).all()
        results.append({
            "booth_code": b.code,
            "booth_name": b.name,
            "volunteers": [{"name": v.name or "Unknown", "phone": v.phone} for v in volunteers]
        })
    return results


@router.post("/dashboard/mandal/reset")
def reset_mandal_data(
    mandal_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Erases stats and ground data for a mandal and all its booths."""
    mandal = session.exec(select(HierarchyNode).where(HierarchyNode.code == mandal_code, HierarchyNode.level == "mandal")).first()
    if not mandal:
        raise HTTPException(status_code=404, detail="Mandal not found")
    
    booth_codes = session.exec(select(HierarchyNode.code).where(HierarchyNode.parent_id == mandal.id, HierarchyNode.level == "booth")).all()
    
    # 1. Reset SQLite (total_voters = 0)
    for code in booth_codes:
        booth = session.exec(select(HierarchyNode).where(HierarchyNode.code == code)).first()
        if booth:
            booth.total_voters = 0
            session.add(booth)
    session.commit()
    
    # 2. Reset Neo4j (Voters, Households, Coverage state)
    # We delete voters and households for these booths
    delete_query = """
    MATCH (n)
    WHERE (n:Voter OR n:Household) AND n.booth_id IN $booth_ids
    DETACH DELETE n
    """
    try:
        neo4j_client.run_query(delete_query, {"booth_ids": list(booth_codes)})
        return {"status": "success", "message": f"Data erased for mandal {mandal_code} and its {len(booth_codes)} booths"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dashboard/booth/reset")
def reset_booth_data(
    booth_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Erases all ingested voter and household data for a specific booth."""
    booth = session.exec(select(HierarchyNode).where(HierarchyNode.code == booth_code, HierarchyNode.level == "booth")).first()
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")

    # 1. Reset SQLite voter count
    booth.total_voters = 0
    session.add(booth)
    session.commit()

    # 2. Delete all Voters, Households, and Booth node from Neo4j for this booth
    delete_query = """
    MATCH (n)
    WHERE (n:Voter OR n:Household OR n:Booth OR n:Area) AND n.booth_id = $booth_id
    DETACH DELETE n
    """
    try:
        neo4j_client.run_query(delete_query, {"booth_id": booth_code})
        return {"status": "success", "message": f"All ingested data cleared for booth {booth_code}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard/state/complaints")
def get_state_complaints_analytics(
    state_code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    """Aggregates complaints across all districts in a state."""
    from app.domain.services.bosi_service import BOSIEngine
    booth_codes = BOSIEngine._get_booth_codes_for_node(state_code, "state", session)
    if not booth_codes:
        return {"total": 0, "resolved": 0, "pending": 0, "critical": 0}

    q = """
    MATCH (c:Complaint)
    WHERE c.booth_id IN $booth_ids
    RETURN count(c) as total,
           sum(CASE WHEN c.status = 'resolved' THEN 1 ELSE 0 END) as resolved,
           sum(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END) as pending,
           sum(CASE WHEN c.severity = 'critical' AND c.status <> 'resolved' THEN 1 ELSE 0 END) as critical
    """
    res = neo4j_client.run_query(q, {"booth_ids": booth_codes})
    if res:
        return res[0]
    return {"total": 0, "resolved": 0, "pending": 0, "critical": 0}


@router.get("/dashboard/stats")
def get_dashboard_stats(
    level: str,
    code: str,
    session: Session = Depends(get_session),
    _user: User = Depends(_require_auth),
):
    if level == "state":
        from app.domain.services.bosi_service import BOSIEngine
        h_stats = BOSIEngine.get_state_household_stats(code, session)
        coverage_pct = round((h_stats["covered"] / h_stats["total"]) * 100, 1) if h_stats["total"] > 0 else 0
        complaints = get_state_complaints_analytics(code, session, _user)

        return {
            "districts": _count_descendants(session, code, "district"),
            "constituencies": _count_descendants(session, code, "constituency"),
            "booths": _count_descendants(session, code, "booth"),
            "volunteers": _count_users(session, "VOLUNTEER", state_id=code),
            "district_admins": _count_users(session, "DISTRICT_ADMIN", state_id=code),
            "constituency_managers": _count_users(session, "CONSTITUENCY_MGR", state_id=code),
            "coverage_pct": coverage_pct,
            "bosi_avg": BOSIEngine.get_state_bosi_average(code, session),
            "complaints": complaints,
            "districts_scores": BOSIEngine.get_state_district_scores(code, session)
        }

    if level == "district":
        from app.domain.services.bosi_service import BOSIEngine
        h_stats = BOSIEngine.get_district_household_stats(code, session)
        coverage_pct = round((h_stats["covered"] / h_stats["total"]) * 100, 1) if h_stats["total"] > 0 else 0
        complaints = get_district_complaints_analytics(code, session, _user)
        
        return {
            "constituencies": _count_descendants(session, code, "constituency"),
            "mandals": _count_descendants(session, code, "mandal"),
            "booths": _count_descendants(session, code, "booth"),
            "volunteers": _count_users(session, "VOLUNTEER", district_id=code),
            "constituency_managers": _count_users(session, "CONSTITUENCY_MGR", district_id=code),
            "coverage_pct": coverage_pct,
            "bosi_avg": BOSIEngine.get_district_bosi_average(code, session),
            "complaints": complaints
        }

    if level == "constituency":
        from app.domain.services.bosi_service import BOSIEngine
        h_stats = BOSIEngine.get_constituency_household_stats(code, session)
        coverage_pct = round((h_stats["covered"] / h_stats["total"]) * 100, 1) if h_stats["total"] > 0 else 0
        return {
            "booths": _count_descendants(session, code, "booth"),
            "mandals": _count_descendants(session, code, "mandal"),
            "volunteers": _count_users(session, "VOLUNTEER", constituency_id=code),
            "coverage_pct": coverage_pct,
            "bosi_avg": BOSIEngine.get_constituency_bosi_average(code, session)
        }

    if level == "mandal":
        from app.domain.services.bosi_service import BOSIEngine
        v_stats = _mandal_voter_stats(session, code)
        return {
            "booths": _count_descendants(session, code, "booth"),
            "volunteers": _count_users(session, "VOLUNTEER", mandal_id=code),
            "voters": v_stats["total"],
            "demographics": v_stats,
            "bosi_avg": BOSIEngine.get_mandal_bosi_average(code, session)
        }

    if level == "booth":
        v_stats = _booth_voter_stats(code)
        return {
            "volunteers": _count_users(session, "VOLUNTEER", booth_id=code),
            "voters": v_stats["total"],
            "demographics": v_stats
        }

    return {}
