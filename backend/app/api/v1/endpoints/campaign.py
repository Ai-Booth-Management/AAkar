"""Campaign Management API – campaigns, volunteers, constituency coverage."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.infrastructure.db.sqlite_client import engine, get_session
from app.infrastructure.db.neo4j_client import neo4j_client
from app.domain.models.campaign import Campaign, CampaignVolunteer, ConstituencyCoverage
from app.domain.models.user import User as AppUser
from app.core.security import get_current_user
from app.domain.services.whatsapp_service import send_text

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Campaign"])

# ─── Hierarchy helpers ──────────────────────────────────────────────────────────

ROLE_HIERARCHY = [
    "ELECTION_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN",
    "CONSTITUENCY_MGR", "MANDAL_MGR", "BOOTH_PRESIDENT", "VOLUNTEER",
]

SUBORDINATE_ROLES = {
    "ELECTION_ADMIN": ["STATE_ADMIN", "DISTRICT_ADMIN", "CONSTITUENCY_MGR", "MANDAL_MGR", "BOOTH_PRESIDENT", "VOLUNTEER"],
    "STATE_ADMIN": ["DISTRICT_ADMIN", "CONSTITUENCY_MGR", "MANDAL_MGR", "BOOTH_PRESIDENT", "VOLUNTEER"],
    "DISTRICT_ADMIN": ["CONSTITUENCY_MGR", "MANDAL_MGR", "BOOTH_PRESIDENT", "VOLUNTEER"],
    "CONSTITUENCY_MGR": ["MANDAL_MGR", "BOOTH_PRESIDENT", "VOLUNTEER"],
    "MANDAL_MGR": ["BOOTH_PRESIDENT", "VOLUNTEER"],
    "BOOTH_PRESIDENT": ["VOLUNTEER"],
    "VOLUNTEER": [],
}

SUBORDINATE_ROLE_MAP = {
    "ELECTION_ADMIN": "STATE_ADMIN",
    "STATE_ADMIN": "DISTRICT_ADMIN",
    "DISTRICT_ADMIN": "CONSTITUENCY_MGR",
    "CONSTITUENCY_MGR": "MANDAL_MGR",
    "MANDAL_MGR": "BOOTH_PRESIDENT",
    "BOOTH_PRESIDENT": "VOLUNTEER",
}


def get_all_subordinate_users(current_user: AppUser, session: Session) -> list[AppUser]:
    """Get ALL users under the current user in the hierarchy (recursive).

    For location scoping, we check ALL relevant ID fields (state_id,
    district_id, constituency_id, mandal_id, booth_id) because the seed
    data only populates the role-specific field for each user (e.g. a
    CONSTITUENCY_MGR only has constituency_id, not district_id).  We use
    prefix matching on hierarchical codes (e.g. district "ND" → mandal
    "ND-CN") so the query catches every subordinate regardless of which
    field is populated.
    """
    user_role = current_user.role.upper()
    target_roles = SUBORDINATE_ROLES.get(user_role, [])
    if not target_roles:
        return []

    queries = []
    for role in target_roles:
        query = select(AppUser).where(AppUser.role == role)

        if user_role == "ELECTION_ADMIN":
            pass
        elif user_role == "STATE_ADMIN":
            loc = current_user.state_id
            query = query.where(
                (AppUser.state_id == loc)
                | (AppUser.district_id.startswith(loc))
                | (AppUser.constituency_id.startswith(loc))
                | (AppUser.mandal_id.startswith(loc))
                | (AppUser.booth_id.startswith(loc))
            )
        elif user_role == "DISTRICT_ADMIN":
            loc = current_user.district_id
            query = query.where(
                (AppUser.district_id == loc)
                | (AppUser.constituency_id.startswith(loc))
                | (AppUser.mandal_id.startswith(loc))
                | (AppUser.booth_id.startswith(loc))
            )
        elif user_role == "CONSTITUENCY_MGR":
            loc = current_user.constituency_id
            query = query.where(
                (AppUser.district_id == loc)
                | (AppUser.constituency_id == loc)
                | (AppUser.mandal_id.startswith(loc))
                | (AppUser.booth_id.startswith(loc))
            )
        elif user_role == "MANDAL_MGR":
            loc = current_user.mandal_id
            query = query.where(
                (AppUser.mandal_id == loc)
                | (AppUser.booth_id.startswith(loc))
            )
        elif user_role == "BOOTH_PRESIDENT":
            query = query.where(AppUser.booth_id == current_user.booth_id)

        queries.append(query)

    users = []
    for q in queries:
        users.extend(session.exec(q).all())
    return users

# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class VolunteerCreate(BaseModel):
    name: str
    phone: str
    district: str
    constituency: str = ""
    assigned_area: str
    assigned_task: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: str = "inactive"
    task_status: str = "unassigned"

class VolunteerUpdate(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = None
    coverage_status: Optional[str] = None
    task_status: Optional[str] = None
    constituency: Optional[str] = None
    assigned_area: Optional[str] = None
    assigned_task: Optional[str] = None

class CoverageUpdate(BaseModel):
    covered: bool
    covered_by: Optional[str] = None

# ─── Seed helpers ──────────────────────────────────────────────────────────────

CONSTITUENCIES_OLD = {
    "Central": ['Ballimaran', 'Burari', 'Chandni Chowk', 'Karol Bagh', 'Matia Mahal', 'Patel Nagar', 'Sadar Bazar'],
    "East": ['Kondli', 'Krishna Nagar', 'Laxmi Nagar', 'Patparganj', 'Trilokpuri'],
    "New Delhi": ['Bijwasan', 'Delhi Cantt', 'Jangpura', 'Mehrauli', 'New Delhi', 'R.K. Puram'],
    "North": ['Adarsh Nagar', 'Badli', 'Bawana', 'Model Town', 'Nerela', 'Rohini', 'Timarpur'],
    "North East": ['Ghonda', 'Karawal Nagar', 'Mustafabad'],
    "North West": ['Kirari', 'Mangol Puri', 'Mundka', 'Rithala', 'Shalimar Bagh', 'Sultan Pur Majra', 'Wazirpur'],
    "Shahdara": ['Babarpur', 'Gandhi Nagar', 'Gokalpur', 'Rohtas Nagar', 'Seelam Pur', 'Seemapuri', 'Shahdara', 'Vishwas Nagar'],
    "South": ['Ambedkar Nagar', 'Chhatarpur', 'Deoli', 'Malviya Nagar'],
    "South East": ['Badarpur', 'Greater Kailash', 'Kalkaji', 'Kasturba Nagar', 'Okhla', 'Sangam Vihar', 'Tughlakabad'],
    "South West": ['Dwarka', 'Matiala', 'Najafgarh', 'Palam', 'Uttam Nagar'],
    "West": ['Hari Nagar', 'Janakpuri', 'Madipur', 'Moti Nagar', 'Nangloi Jat', 'Rajinder Nagar', 'Rajouri Garden', 'Shakur Basti', 'Tilak Nagar', 'Tri Nagar', 'Vikaspuri'],
}

CONSTITUENCIES_NEW = {
    "Central": ['Ballimaran', 'Chandni Chowk', 'Karol Bagh', 'Matia Mahal', 'Patel Nagar', 'Sadar Bazar'],
    "East": ['Gandhi Nagar', 'Kondli', 'Krishna Nagar', 'Laxmi Nagar', 'Patparganj', 'Trilokpuri'],
    "New Delhi": ['Delhi Cantt', 'Jangpura', 'New Delhi', 'Rajinder Nagar'],
    "North": ['Adarsh Nagar', 'Badli', 'Burari', 'Model Town', 'Nerela', 'Timarpur'],
    "North East": ['Ghonda', 'Gokalpur', 'Karawal Nagar', 'Mustafabad', 'Seelam Pur'],
    "North West": ['Bawana', 'Kirari', 'Mangol Puri', 'Mundka', 'Nangloi Jat', 'Rithala', 'Rohini', 'Shakur Basti', 'Shalimar Bagh', 'Sultan Pur Majra', 'Tri Nagar', 'Wazirpur'],
    "Shahdara": ['Babarpur', 'Rohtas Nagar', 'Seemapuri', 'Shahdara', 'Vishwas Nagar'],
    "South": ['Ambedkar Nagar', 'Chhatarpur', 'Deoli', 'Malviya Nagar', 'Mehrauli', 'R.K. Puram'],
    "South East": ['Badarpur', 'Greater Kailash', 'Kalkaji', 'Kasturba Nagar', 'Okhla', 'Sangam Vihar', 'Tughlakabad'],
    "South West": ['Bijwasan', 'Dwarka', 'Matiala', 'Najafgarh', 'Palam', 'Uttam Nagar'],
    "West": ['Hari Nagar', 'Janakpuri', 'Madipur', 'Moti Nagar', 'Rajouri Garden', 'Tilak Nagar', 'Vikaspuri'],
}

def normalize_ac_name(name: str) -> str:
    n = name.replace(' (SC)', '').replace('(SC)', '').replace('-', ' ').replace('.', '').strip().lower()
    return "".join(n.split())

NORM_TO_DISTRICT_OLD = {}
for dist, consts in CONSTITUENCIES_OLD.items():
    for c in consts:
        NORM_TO_DISTRICT_OLD[normalize_ac_name(c)] = dist

NORM_TO_DISTRICT_NEW = {}
for dist, consts in CONSTITUENCIES_NEW.items():
    for c in consts:
        NORM_TO_DISTRICT_NEW[normalize_ac_name(c)] = dist

def get_resolved_district(vol, mode: str):
    mapping = NORM_TO_DISTRICT_NEW if mode in ("new", "abs") else NORM_TO_DISTRICT_OLD
    c = vol.constituency
    if not c:
        return vol.district
    norm = normalize_ac_name(c)
    return mapping.get(norm, vol.district)

def _ensure_coverage_rows(session: Session):
    """Idempotently create constituency_coverage rows if not present."""
    all_consts = set()
    for consts in CONSTITUENCIES_OLD.values():
        all_consts.update(consts)
    for consts in CONSTITUENCIES_NEW.values():
        all_consts.update(consts)
        
    for c in all_consts:
        existing = session.exec(
            select(ConstituencyCoverage)
            .where(ConstituencyCoverage.constituency == c)
        ).first()
        if not existing:
            # find new mapping default, else fallback
            dist = next((d for d, cs in CONSTITUENCIES_NEW.items() if c in cs), "Central")
            session.add(ConstituencyCoverage(district=dist, constituency=c))
    session.commit()

# ─── Volunteer Endpoints ───────────────────────────────────────────────────────

@router.get("/volunteers")
def list_volunteers(
    district: Optional[str] = Query(None),
    constituency: Optional[str] = Query(None),
    mode: str = Query("abs"),
):
    with Session(engine) as session:
        stmt = select(CampaignVolunteer)
        volunteers = session.exec(stmt).all()
        
        result = []
        for v in volunteers:
            resolved_dist = get_resolved_district(v, mode)
            if district and resolved_dist != district:
                continue
            if constituency and v.constituency != constituency:
                continue
            
            v_dict = v.model_dump()
            v_dict["district"] = resolved_dist
            result.append(v_dict)
            
        return {"volunteers": result}


@router.post("/volunteers")
def create_volunteer(data: VolunteerCreate):
    with Session(engine) as session:
        vol = CampaignVolunteer(**data.model_dump())
        session.add(vol)
        session.commit()
        session.refresh(vol)
        return vol.model_dump()


@router.patch("/volunteers/{volunteer_id}")
def update_volunteer(volunteer_id: int, data: VolunteerUpdate):
    with Session(engine) as session:
        vol = session.get(CampaignVolunteer, volunteer_id)
        if not vol:
            raise HTTPException(status_code=404, detail="Volunteer not found")
        updates = data.model_dump(exclude_none=True)
        for k, v in updates.items():
            setattr(vol, k, v)
        vol.last_location_update = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        session.add(vol)
        session.commit()
        session.refresh(vol)
        return vol.model_dump()


@router.patch("/volunteers/{volunteer_id}/location")
def update_location(volunteer_id: int, lat: float, lng: float):
    with Session(engine) as session:
        vol = session.get(CampaignVolunteer, volunteer_id)
        if not vol:
            raise HTTPException(status_code=404, detail="Volunteer not found")
        vol.lat = lat
        vol.lng = lng
        vol.status = "active"
        vol.last_location_update = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        session.add(vol)
        session.commit()
        session.refresh(vol)
        return vol.model_dump()


@router.patch("/volunteers/{volunteer_id}/mark-covered")
def mark_volunteer_covered(volunteer_id: int, mode: str = Query("abs")):
    with Session(engine) as session:
        vol = session.get(CampaignVolunteer, volunteer_id)
        if not vol:
            raise HTTPException(status_code=404, detail="Volunteer not found")
        vol.coverage_status = "covered"
        session.add(vol)
        session.commit()
        
        # Also update constituency coverage if volunteer has one
        if vol.constituency:
            resolved_dist = get_resolved_district(vol, mode)
            cov = session.exec(
                select(ConstituencyCoverage)
                .where(ConstituencyCoverage.constituency == vol.constituency)
            ).first()
            if cov:
                cov.covered = True
                cov.covered_by = vol.name
                cov.covered_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                cov.updated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                session.add(cov)
                session.commit()
        return {"status": "ok", "volunteer_id": volunteer_id}


@router.delete("/volunteers/{volunteer_id}")
def delete_volunteer(volunteer_id: int):
    with Session(engine) as session:
        vol = session.get(CampaignVolunteer, volunteer_id)
        if not vol:
            raise HTTPException(status_code=404, detail="Volunteer not found")
        session.delete(vol)
        session.commit()
        return {"status": "deleted"}

# ─── Coverage Endpoints ────────────────────────────────────────────────────────

@router.get("/coverage")
def get_coverage(district: Optional[str] = Query(None), mode: str = Query("abs")):
    with Session(engine) as session:
        _ensure_coverage_rows(session)
        rows = session.exec(select(ConstituencyCoverage)).all()
        
        result = []
        for r in rows:
            mapping = NORM_TO_DISTRICT_NEW if mode in ("new", "abs") else NORM_TO_DISTRICT_OLD
            c_clean = normalize_ac_name(r.constituency)
            resolved_dist = mapping.get(c_clean, r.district)
            
            if district and resolved_dist != district:
                continue
                
            r_dict = r.model_dump()
            r_dict["district"] = resolved_dist
            result.append(r_dict)
            
        return {"coverage": result}


@router.patch("/coverage/{district}/{constituency}")
def update_coverage(district: str, constituency: str, data: CoverageUpdate, mode: str = Query("abs")):
    with Session(engine) as session:
        _ensure_coverage_rows(session)
        cov = session.exec(
            select(ConstituencyCoverage)
            .where(ConstituencyCoverage.constituency == constituency)
        ).first()
        if not cov:
            raise HTTPException(status_code=404, detail="Constituency not found")
        cov.covered = data.covered
        if data.covered_by:
            cov.covered_by = data.covered_by
        cov.covered_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z") if data.covered else None
        cov.updated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        session.add(cov)
        session.commit()
        session.refresh(cov)
        
        r_dict = cov.model_dump()
        mapping = NORM_TO_DISTRICT_NEW if mode in ("new", "abs") else NORM_TO_DISTRICT_OLD
        c_clean = normalize_ac_name(constituency)
        r_dict["district"] = mapping.get(c_clean, cov.district)
        return r_dict


@router.post("/coverage/mark-all/{district}")
def mark_all_covered(district: str, covered_by: Optional[str] = Query(None), mode: str = Query("abs")):
    with Session(engine) as session:
        _ensure_coverage_rows(session)
        mapping = CONSTITUENCIES_NEW if mode in ("new", "abs") else CONSTITUENCIES_OLD
        constits_in_dist = mapping.get(district, [])
        
        rows = session.exec(
            select(ConstituencyCoverage).where(ConstituencyCoverage.constituency.in_(constits_in_dist))
        ).all()
        
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        for row in rows:
            row.covered = True
            row.covered_by = covered_by or "Admin"
            row.covered_at = now
            row.updated_at = now
            session.add(row)
            
        # Also mark all volunteers in district as covered
        vols = session.exec(select(CampaignVolunteer)).all()
        vols_marked = 0
        for v in vols:
            resolved_dist = get_resolved_district(v, mode)
            if resolved_dist == district:
                v.coverage_status = "covered"
                session.add(v)
                vols_marked += 1
                
        session.commit()
        return {"status": "ok", "district": district, "updated": len(rows), "volunteers_updated": vols_marked}


@router.get("/summary")
def campaign_summary(mode: str = Query("abs")):
    """District-level coverage summary for state admin view."""
    with Session(engine) as session:
        _ensure_coverage_rows(session)
        result = {}
        
        mapping = CONSTITUENCIES_NEW if mode in ("new", "abs") else CONSTITUENCIES_OLD
        all_vols = session.exec(select(CampaignVolunteer)).all()
        all_covs = session.exec(select(ConstituencyCoverage)).all()
        
        cov_by_constit = {normalize_ac_name(r.constituency): r for r in all_covs}
        
        for district, constits in mapping.items():
            covered = 0
            for c in constits:
                cov_row = cov_by_constit.get(normalize_ac_name(c))
                if cov_row and cov_row.covered:
                    covered += 1
                    
            vols_in_dist = []
            for v in all_vols:
                if get_resolved_district(v, mode) == district:
                    vols_in_dist.append(v)
                    
            result[district] = {
                "total_constituencies": len(constits),
                "covered_constituencies": covered,
                "total_volunteers": len(vols_in_dist),
                "active_volunteers": sum(1 for v in vols_in_dist if v.status == "active"),
            }
        return {"summary": result}


# ─── Campaign Endpoints ─────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    title: str
    description: str = ""
    lat: float
    lng: float
    address: str = ""
    assigned_role: str = "VOLUNTEER"
    district: Optional[str] = None
    constituency: Optional[str] = None
    broadcast_message: Optional[str] = None
    scheduled_at: Optional[str] = None


class CampaignResponse(BaseModel):
    id: int
    title: str
    description: str
    lat: float
    lng: float
    address: str
    created_by: Optional[int]
    created_by_name: Optional[str]
    created_by_role: Optional[str]
    assigned_role: str
    status: str
    district: Optional[str]
    constituency: Optional[str]
    created_at: str
    scheduled_at: Optional[str] = None


@router.get("/subordinates/all")
def get_all_subordinates(
    current_user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get ALL subordinate users recursively down the hierarchy."""
    users = get_all_subordinate_users(current_user, session)
    return [
        {
            "id": u.id,
            "email": u.email,
            "display_name": u.display_name or u.email,
            "role": u.role,
            "district_id": u.district_id,
            "constituency_id": u.constituency_id,
            "mandal_id": u.mandal_id,
            "booth_id": u.booth_id,
        }
        for u in users
    ]


@router.get("/subordinates/count")
def get_subordinates_count(
    current_user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get count of all subordinates, broken down by role."""
    users = get_all_subordinate_users(current_user, session)
    count_by_role = {}
    for u in users:
        role = u.role
        count_by_role[role] = count_by_role.get(role, 0) + 1
    return {
        "total": len(users),
        "by_role": count_by_role,
    }


@router.post("/campaigns", response_model=CampaignResponse)
def create_campaign(
    data: CampaignCreate,
    background_tasks: BackgroundTasks,
    current_user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a new campaign, broadcast to all subordinates, and notify volunteers via WhatsApp."""
    campaign = Campaign(
        title=data.title,
        description=data.description,
        lat=data.lat,
        lng=data.lng,
        address=data.address,
        created_by=current_user.id,
        created_by_name=current_user.display_name or current_user.email,
        created_by_role=current_user.role,
        assigned_role=data.assigned_role.upper(),
        status="active",
        district=data.district,
        constituency=data.constituency,
        scheduled_at=data.scheduled_at,
    )
    session.add(campaign)
    session.commit()
    session.refresh(campaign)

    # 1. Broadcast to all subordinates via Neo4j (always, even without custom message)
    broadcast_msg = data.broadcast_message.strip() if data.broadcast_message and data.broadcast_message.strip() else f"📢 New campaign launched: {data.title}"
    subordinates = get_all_subordinate_users(current_user, session)
    sent_count = 0
    if subordinates:
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        user_role = current_user.role.upper()
        for r in subordinates:
            try:
                query = """
                CREATE (b:Broadcast {
                    message: $message,
                    subject: $subject,
                    media_urls: $media_urls,
                    type: $type,
                    sender_id: $sender_id,
                    sender_role: $sender_role,
                    sender_name: $sender_name,
                    recipient_id: $recipient_id,
                    recipient_role: $recipient_role,
                    recipient_name: $recipient_name,
                    created_at: $created_at,
                    is_read: false
                })
                RETURN elementId(b) AS id
                """
                params = {
                    "message": broadcast_msg,
                    "subject": f"Campaign: {data.title}",
                    "media_urls": [],
                    "type": "broadcast",
                    "sender_id": current_user.id,
                    "sender_role": user_role,
                    "sender_name": current_user.display_name or current_user.email,
                    "recipient_id": r.id,
                    "recipient_role": r.role,
                    "recipient_name": r.display_name or r.email,
                    "created_at": now,
                }
                neo4j_client.run_query(query, params)
                sent_count += 1
            except Exception:
                pass
    campaign.broadcast_sent_to = sent_count

    # 2. Send WhatsApp to CampaignVolunteers in the area
    background_tasks.add_task(_notify_volunteers_whatsapp, campaign, data.district, data.constituency, data.title, data.description)

    return campaign


async def _notify_volunteers_whatsapp(campaign: Campaign, district: Optional[str], constituency: Optional[str], title: str, description: str):
    """Fire-and-forget WhatsApp notifications to CampaignVolunteers in the area."""
    try:
        loop = asyncio.get_running_loop()

        def _get_volunteers():
            with Session(engine) as s:
                stmt = select(CampaignVolunteer)
                if constituency:
                    stmt = stmt.where(CampaignVolunteer.constituency == constituency)
                elif district:
                    stmt = stmt.where(CampaignVolunteer.district == district)
                return s.exec(stmt).all()

        volunteers = await loop.run_in_executor(None, _get_volunteers)

        if not volunteers:
            return

        message = (
            f"📢 New Campaign: {title}\n"
            f"{description}\n"
            f"📍 {campaign.address}\n"
            f"Check the campaign dashboard for more details."
        )

        for vol in volunteers:
            if vol.phone:
                try:
                    await send_text(vol.phone, message)
                except Exception as e:
                    logger.warning(f"WhatsApp send failed for {vol.phone}: {e}")
    except Exception as e:
        logger.error(f"WhatsApp notification error: {e}")


@router.get("/campaigns")
def list_campaigns(
    status: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    current_user: AppUser = Depends(get_current_user),
):
    """List campaigns, optionally filtered by status or district."""
    with Session(engine) as session:
        stmt = select(Campaign).order_by(Campaign.created_at.desc())
        if status:
            stmt = stmt.where(Campaign.status == status)
        if district:
            stmt = stmt.where(Campaign.district == district)
        campaigns = session.exec(stmt).all()
        return {"campaigns": [c.model_dump() for c in campaigns]}


@router.get("/campaigns/active")
def get_active_campaigns(
    current_user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get all active campaigns visible to the user and their subordinates."""
    stmt = select(Campaign).where(Campaign.status == "active").order_by(Campaign.created_at.desc())
    campaigns = session.exec(stmt).all()
    return {"campaigns": [c.model_dump() for c in campaigns]}


@router.get("/campaigns/{campaign_id}")
def get_campaign(campaign_id: int):
    with Session(engine) as session:
        campaign = session.get(Campaign, campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return campaign.model_dump()


@router.patch("/campaigns/{campaign_id}")
def update_campaign_status(
    campaign_id: int,
    status: str = Query(...),
    current_user: AppUser = Depends(get_current_user),
):
    with Session(engine) as session:
        campaign = session.get(Campaign, campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        campaign.status = status
        session.add(campaign)
        session.commit()
        session.refresh(campaign)
        return campaign.model_dump()


@router.post("/campaigns/{campaign_id}/broadcast")
def broadcast_campaign(
    campaign_id: int,
    message: str = Query(...),
    current_user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Broadcast a campaign update to ALL subordinates."""
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    subordinates = get_all_subordinate_users(current_user, session)
    if not subordinates:
        raise HTTPException(status_code=400, detail="No subordinates found to broadcast to")

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    user_role = current_user.role.upper()
    sent_count = 0
    for r in subordinates:
        try:
            query = """
            CREATE (b:Broadcast {
                message: $message,
                subject: $subject,
                media_urls: $media_urls,
                type: $type,
                sender_id: $sender_id,
                sender_role: $sender_role,
                sender_name: $sender_name,
                recipient_id: $recipient_id,
                recipient_role: $recipient_role,
                recipient_name: $recipient_name,
                created_at: $created_at,
                is_read: false
            })
            RETURN elementId(b) AS id
            """
            params = {
                "message": message.strip(),
                "subject": f"Campaign Update: {campaign.title}",
                "media_urls": [],
                "type": "broadcast",
                "sender_id": current_user.id,
                "sender_role": user_role,
                "sender_name": current_user.display_name or current_user.email,
                "recipient_id": r.id,
                "recipient_role": r.role,
                "recipient_name": r.display_name or r.email,
                "created_at": now,
            }
            neo4j_client.run_query(query, params)
            sent_count += 1
        except Exception:
            pass

    return {
        "status": "success",
        "campaign_id": campaign_id,
        "broadcast_sent_to": sent_count,
        "total_subordinates": len(subordinates),
    }

