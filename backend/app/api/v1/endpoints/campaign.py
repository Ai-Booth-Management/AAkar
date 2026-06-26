"""Campaign Management API – volunteers + constituency coverage."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.infrastructure.db.sqlite_client import engine
from app.domain.models.campaign import CampaignVolunteer, ConstituencyCoverage

router = APIRouter(prefix="/campaign", tags=["Campaign"])

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
        vol.last_location_update = datetime.utcnow().isoformat()
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
        vol.last_location_update = datetime.utcnow().isoformat()
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
                cov.covered_at = datetime.utcnow().isoformat()
                cov.updated_at = datetime.utcnow().isoformat()
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
        cov.covered_at = datetime.utcnow().isoformat() if data.covered else None
        cov.updated_at = datetime.utcnow().isoformat()
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
        
        now = datetime.utcnow().isoformat()
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

