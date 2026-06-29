import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from app.core.security import get_current_user
from app.infrastructure.db.sqlite_client import get_session
from app.domain.models.user import User
from app.domain.models.complaint import Complaint
from app.domain.models.volunteer import Volunteer
from app.domain.models.campaign import ConstituencyCoverage

router = APIRouter()

def iter_to_csv(data: list[list[str]]):
    output = io.StringIO()
    writer = csv.writer(output)
    for row in data:
        writer.writerow(row)
    return output.getvalue()

from fastapi.responses import Response

@router.get("/complaints")
def export_complaints(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    jurisdiction = None if current_user.role in ["ELECTION_ADMIN", "SUPER_ADMIN", "STATE_ADMIN"] else (current_user.booth_id or current_user.mandal_id or current_user.constituency_id or current_user.district_id or current_user.state_id)
    q = select(Complaint).where(Complaint.booth_id.like(f"{jurisdiction}%")) if jurisdiction else select(Complaint)
    complaints = session.exec(q).all()
    
    data = [["ID", "Type", "Description", "Status", "Phone", "Booth ID", "Timestamp"]]
    data.extend([[c.id, c.type, c.description, c.status, c.phone, c.booth_id, c.timestamp] for c in complaints])
    
    csv_str = iter_to_csv(data)
    return Response(content=csv_str, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=complaints_export.csv"})

@router.get("/volunteers")
def export_volunteers(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    jurisdiction = None if current_user.role in ["ELECTION_ADMIN", "SUPER_ADMIN", "STATE_ADMIN"] else (current_user.booth_id or current_user.mandal_id or current_user.constituency_id or current_user.district_id or current_user.state_id)
    q = select(Volunteer).where(Volunteer.booth_id.like(f"{jurisdiction}%")) if jurisdiction else select(Volunteer)
    volunteers = session.exec(q).all()
    
    data = [["ID", "Name", "Phone", "Status", "Booth ID", "District", "Constituency"]]
    data.extend([[v.id, v.name, v.phone, v.status, v.booth_id, v.district, v.constituency] for v in volunteers])
    
    csv_str = iter_to_csv(data)
    return Response(content=csv_str, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=volunteers_export.csv"})

@router.get("/coverage")
def export_coverage(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    jurisdiction = None if current_user.role in ["ELECTION_ADMIN", "SUPER_ADMIN", "STATE_ADMIN"] else (current_user.booth_id or current_user.mandal_id or current_user.constituency_id or current_user.district_id or current_user.state_id)
    q = select(ConstituencyCoverage).where(ConstituencyCoverage.district.like(f"{jurisdiction}%")) if jurisdiction else select(ConstituencyCoverage)
    coverage = session.exec(q).all()
    
    data = [["District", "Constituency", "Covered", "Covered By", "Covered At"]]
    for c in coverage:
        data.append([c.district, c.constituency, str(c.covered), c.covered_by, c.covered_at])
        
    csv_str = iter_to_csv(data)
    return Response(content=csv_str, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=campaign_coverage_export.csv"})
