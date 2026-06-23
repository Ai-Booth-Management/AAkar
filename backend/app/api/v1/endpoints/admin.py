from collections import Counter
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from pathlib import Path
import pandas as pd
from sqlmodel import Session, select
from app.core.security import get_current_user, hash_password
from app.domain.models.user import User
from app.infrastructure.db.neo4j_client import neo4j_client
from app.infrastructure.db.sqlite_client import get_session

router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────

class UserCreateRequest(BaseModel):
    email: str
    password: str
    role: str
    display_name: str | None = None
    state_id: str | None = None
    district_id: str | None = None
    constituency_id: str | None = None
    mandal_id: str | None = None
    booth_id: str | None = None


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    display_name: str | None
    state_id: str | None
    district_id: str | None
    constituency_id: str | None
    mandal_id: str | None
    booth_id: str | None
    created_at: datetime


# ── Role hierarchy ─────────────────────────────────────────────────

CAN_CREATE_ROLE = {
    "ELECTION_ADMIN": {"STATE_ADMIN", "DISTRICT_ADMIN", "CONSTITUENCY_MGR", "MANDAL_MGR", "BOOTH_PRESIDENT"},
    "STATE_ADMIN": {"DISTRICT_ADMIN"},
    "DISTRICT_ADMIN": {"CONSTITUENCY_MGR"},
    "CONSTITUENCY_MGR": {"MANDAL_MGR"},
    "MANDAL_MGR": {"BOOTH_PRESIDENT"},
}


def _require_election_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "ELECTION_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only server admin can manage users")
    return current_user


# ── User Management Endpoints ───────────────────────────────────────

@router.get("/users", response_model=List[UserOut])
def list_users(
    role: str | None = None,
    state_id: str | None = None,
    district_id: str | None = None,
    constituency_id: str | None = None,
    skip: int = 0,
    limit: int = 500,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    query = select(User)

    # Scope to current user's hierarchy
    if current_user.role == "ELECTION_ADMIN":
        pass  # can see all
    elif current_user.role == "STATE_ADMIN":
        query = query.where(User.state_id == current_user.state_id)
    elif current_user.role == "DISTRICT_ADMIN":
        query = query.where(
            User.state_id == current_user.state_id,
            User.district_id == current_user.district_id,
        )
    elif current_user.role == "CONSTITUENCY_MGR":
        query = query.where(
            User.state_id == current_user.state_id,
            User.district_id == current_user.district_id,
            User.constituency_id == current_user.constituency_id,
        )
    elif current_user.role == "MANDAL_MGR":
        query = query.where(
            User.state_id == current_user.state_id,
            User.district_id == current_user.district_id,
            User.constituency_id == current_user.constituency_id,
            User.mandal_id == current_user.mandal_id,
        )
    else:
        query = query.where(User.id == current_user.id)  # can only see self

    query = query.where(User.id != current_user.id)

    if role:
        query = query.where(User.role == role.upper())
    if state_id:
        query = query.where(User.state_id == state_id)
    if district_id:
        query = query.where(User.district_id == district_id)
    if constituency_id:
        query = query.where(User.constituency_id == constituency_id)
    query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
    users = session.exec(query).all()
    return [
        UserOut(
            id=u.id,
            email=u.email,
            role=u.role,
            display_name=u.display_name,
            state_id=u.state_id,
            district_id=u.district_id,
            constituency_id=u.constituency_id,
            mandal_id=u.mandal_id,
            booth_id=u.booth_id,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.get("/users/counts")
def user_counts(
    session: Session = Depends(get_session),
    _admin: User = Depends(_require_election_admin),
):
    rows = session.exec(select(User.role)).all()
    total = len(rows)
    counts: dict[str, int] = {}
    for r in rows:
        counts[r] = counts.get(r, 0) + 1
    return {"total": total, "by_role": counts}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    _admin: User = Depends(_require_election_admin),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role == "ELECTION_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete another server admin")
    session.delete(user)
    session.commit()


class UserUpdateRequest(BaseModel):
    state_id: str | None = None
    district_id: str | None = None
    constituency_id: str | None = None
    mandal_id: str | None = None
    booth_id: str | None = None


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdateRequest,
    session: Session = Depends(get_session),
    _admin: User = Depends(_require_election_admin),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if body.state_id is not None:
        user.state_id = body.state_id or None
    if body.district_id is not None:
        user.district_id = body.district_id or None
    if body.constituency_id is not None:
        user.constituency_id = body.constituency_id or None
    if body.mandal_id is not None:
        user.mandal_id = body.mandal_id or None
    if body.booth_id is not None:
        user.booth_id = body.booth_id or None
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        display_name=user.display_name,
        state_id=user.state_id,
        district_id=user.district_id,
        constituency_id=user.constituency_id,
        mandal_id=user.mandal_id,
        booth_id=user.booth_id,
        created_at=user.created_at,
    )


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    target_role = body.role.upper()
    allowed = CAN_CREATE_ROLE.get(current_user.role, set())
    if target_role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your role ({current_user.role}) cannot create {target_role} users",
        )

    existing = session.exec(select(User).where(User.email == body.email)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

    # Scope enforcement — creators can only create users within their own hierarchy boundary
    if current_user.role != "ELECTION_ADMIN":
        if current_user.role == "STATE_ADMIN":
            if body.state_id and body.state_id != current_user.state_id:
                raise HTTPException(status_code=403, detail="Can only create users in your state")
        elif current_user.role == "DISTRICT_ADMIN":
            if body.district_id and body.district_id != current_user.district_id:
                raise HTTPException(status_code=403, detail="Can only create users in your district")
        elif current_user.role == "CONSTITUENCY_MGR":
            if body.constituency_id and body.constituency_id != current_user.constituency_id:
                raise HTTPException(status_code=403, detail="Can only create users in your constituency")
        elif current_user.role == "MANDAL_MGR":
            if body.mandal_id and body.mandal_id != current_user.mandal_id:
                raise HTTPException(status_code=403, detail="Can only create users in your mandal")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        role=target_role,
        display_name=body.display_name,
        state_id=body.state_id or current_user.state_id,
        district_id=body.district_id or current_user.district_id,
        constituency_id=body.constituency_id or current_user.constituency_id,
        mandal_id=body.mandal_id or current_user.mandal_id,
        booth_id=body.booth_id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        display_name=user.display_name,
        state_id=user.state_id,
        district_id=user.district_id,
        constituency_id=user.constituency_id,
        mandal_id=user.mandal_id,
        booth_id=user.booth_id,
        created_at=user.created_at,
    )


# ── Hierarchy Endpoint ──────────────────────────────────────────────

from app.domain.models.hierarchy import HierarchyNode


class HierarchyNodeOut(BaseModel):
    code: str
    name: str
    level: str
    children: list["HierarchyNodeOut"] = []


def _build_tree(nodes: list[HierarchyNode], parent_id: int | None = None) -> list[HierarchyNodeOut]:
    return [
        HierarchyNodeOut(
            code=n.code,
            name=n.name,
            level=n.level,
            children=_build_tree(nodes, n.id),
        )
        for n in nodes
        if n.parent_id == parent_id
    ]


@router.get("/hierarchy")
def get_hierarchy(
    session: Session = Depends(get_session),
    _admin: User = Depends(_require_election_admin),
):
    nodes = session.exec(select(HierarchyNode).order_by(HierarchyNode.level, HierarchyNode.name)).all()
    return _build_tree(nodes)


@router.get("/hierarchy/flat")
def get_hierarchy_flat(
    level: str | None = None,
    parent_code: str | None = None,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    query = select(HierarchyNode)
    if level:
        query = query.where(HierarchyNode.level == level)
    if parent_code:
        parent = session.exec(select(HierarchyNode).where(HierarchyNode.code == parent_code)).first()
        if parent:
            query = query.where(HierarchyNode.parent_id == parent.id)
    nodes = session.exec(query.order_by(HierarchyNode.name)).all()
    return [{"code": n.code, "name": n.name, "level": n.level} for n in nodes]


class HierarchyCreateRequest(BaseModel):
    code: str
    name: str
    level: str
    parent_code: str | None = None


@router.post("/hierarchy", status_code=status.HTTP_201_CREATED)
def create_hierarchy_node(
    body: HierarchyCreateRequest,
    session: Session = Depends(get_session),
    _admin: User = Depends(_require_election_admin),
):
    existing = session.exec(select(HierarchyNode).where(HierarchyNode.code == body.code, HierarchyNode.level == body.level)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Node with this code already exists")

    parent_id = None
    if body.parent_code:
        parent = session.exec(select(HierarchyNode).where(HierarchyNode.code == body.parent_code)).first()
        if not parent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent node not found")
        parent_id = parent.id

    node = HierarchyNode(code=body.code, name=body.name, level=body.level, parent_id=parent_id)
    session.add(node)
    session.commit()
    session.refresh(node)
    return {"id": node.id, "code": node.code, "name": node.name, "level": node.level}


@router.delete("/hierarchy/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hierarchy_node(
    node_id: int,
    session: Session = Depends(get_session),
    _admin: User = Depends(_require_election_admin),
):
    node = session.get(HierarchyNode, node_id)
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
    children = session.exec(select(HierarchyNode).where(HierarchyNode.parent_id == node_id)).all()
    if children:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete node with children. Remove child nodes first.")
    session.delete(node)
    session.commit()


COMPLAINTS_CSV = Path("data/uploads/complaints.csv")
VOTERS_CSV = Path("data/uploads/voters.csv")
SCHEME_VOTERS_CSV = Path("data/uploads/fake_scheme_voters.csv")

# ── Recommendation mapping (mirrors recommendation_engine.py) ──
_ISSUE_RECOMMENDATIONS = {
    "Water Supply": "Deploy water inspection team",
    "Power Cut": "Contact electricity board",
    "Road Repair": "Schedule road repair overview",
    "Garbage Collection": "Deploy sanitation team",
}


def _compute_booth_stats() -> list[dict]:
    """Build per-booth stats from Neo4j (falls back to CSV)."""
    try:
        # Collect all known booth_ids from voters CSV (for Neo4j booths that may have 0 issues)
        booth_ids: set[str] = set()
        if VOTERS_CSV.exists():
            try:
                df_v = pd.read_csv(VOTERS_CSV)
                col = "booth_id" if "booth_id" in df_v.columns else "Booth_id"
                if col in df_v.columns:
                    booth_ids = set(df_v[col].dropna().astype(str).str.strip().unique())
            except Exception:
                pass

        query = """
        MATCH (b:Booth)
        OPTIONAL MATCH (b)<-[:IN_BOOTH]-(c:Complaint)
        WITH b, c
        WITH b,
             count(c) AS complaint_count,
             sum(CASE WHEN c.status = 'Open' THEN 1 ELSE 0 END) AS open_count,
             sum(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved_count,
             collect(DISTINCT c.type) AS raw_types
        RETURN b.booth_id AS booth_id,
               complaint_count,
               open_count,
               resolved_count,
               [t IN raw_types WHERE t IS NOT NULL] AS issue_types
        ORDER BY b.booth_id
        """
        rows = neo4j_client.run_query(query)

        booth_map: dict[str, dict] = {}
        for row in rows:
            bid = row["booth_id"]
            total = row["complaint_count"]
            open_n = row["open_count"]
            resolved_n = row["resolved_count"]
            issue_types = row.get("issue_types", [])

            prevalent_issue = Counter(issue_types).most_common(1)[0][0] if issue_types else None

            open_ratio = open_n / total if total > 0 else 0.0
            risk_level = (
                "High" if open_ratio > 0.7
                else "Medium" if open_ratio > 0.4
                else "Low"
            )

            if prevalent_issue and prevalent_issue in _ISSUE_RECOMMENDATIONS:
                recommendation = _ISSUE_RECOMMENDATIONS[prevalent_issue]
            elif open_n > 10:
                recommendation = "Deploy general grievance team"
            elif total > 0:
                recommendation = "Monitor situation"
            else:
                recommendation = "No action required"

            booth_map[bid] = {
                "booth_id": bid,
                "complaint_count": total,
                "open_count": open_n,
                "resolved_count": resolved_n,
                "risk_level": risk_level,
                "recommendation": recommendation,
            }

        # Include booths from voters CSV that had zero complaints (not yet in Neo4j)
        for bid in booth_ids:
            if bid not in booth_map:
                booth_map[bid] = {
                    "booth_id": bid,
                    "complaint_count": 0,
                    "open_count": 0,
                    "resolved_count": 0,
                    "risk_level": "Low",
                    "recommendation": "No action required",
                }

        return sorted(booth_map.values(), key=lambda b: b["booth_id"])

    except Exception:
        pass

    # ── Fallback: CSV approach ──
    booth_ids: set[str] = set()
    if VOTERS_CSV.exists():
        try:
            df_v = pd.read_csv(VOTERS_CSV)
            col = "booth_id" if "booth_id" in df_v.columns else "Booth_id"
            if col in df_v.columns:
                booth_ids = set(df_v[col].dropna().astype(str).str.strip().unique())
        except Exception:
            pass

    booth_map: dict[str, dict] = {}

    if COMPLAINTS_CSV.exists():
        try:
            df_c = pd.read_csv(COMPLAINTS_CSV)
            df_c.columns = df_c.columns.str.strip()

            bid_col = next((c for c in df_c.columns if c.lower() == "booth_id"), None)
            status_col = next((c for c in df_c.columns if c.lower() == "status"), None)
            issue_col = next(
                (c for c in df_c.columns if c.lower() in ("type", "issue_type", "issue")), None
            )

            if bid_col:
                for bid, grp in df_c.groupby(df_c[bid_col].astype(str).str.strip()):
                    if bid not in booth_ids:
                        continue
                    total = len(grp)
                    open_n = 0
                    resolved_n = 0
                    if status_col:
                        s = grp[status_col].astype(str).str.strip()
                        open_n = int((s == "Open").sum())
                        resolved_n = int((s == "Resolved").sum())

                    prevalent_issue = None
                    if issue_col:
                        issue_counts = (
                            grp[issue_col]
                            .astype(str)
                            .str.strip()
                            .value_counts()
                        )
                        if not issue_counts.empty:
                            prevalent_issue = issue_counts.index[0]

                    open_ratio = open_n / total if total > 0 else 0.0
                    risk_level = (
                        "High" if open_ratio > 0.7
                        else "Medium" if open_ratio > 0.4
                        else "Low"
                    )

                    if prevalent_issue and prevalent_issue in _ISSUE_RECOMMENDATIONS:
                        recommendation = _ISSUE_RECOMMENDATIONS[prevalent_issue]
                    elif open_n > 10:
                        recommendation = "Deploy general grievance team"
                    elif total > 0:
                        recommendation = "Monitor situation"
                    else:
                        recommendation = "No action required"

                    booth_map[str(bid)] = {
                        "booth_id": str(bid),
                        "complaint_count": total,
                        "open_count": open_n,
                        "resolved_count": resolved_n,
                        "risk_level": risk_level,
                        "recommendation": recommendation,
                    }
        except Exception:
            pass

    for bid in booth_ids:
        if bid not in booth_map:
            booth_map[bid] = {
                "booth_id": bid,
                "complaint_count": 0,
                "open_count": 0,
                "resolved_count": 0,
                "risk_level": "Low",
                "recommendation": "No action required",
            }

    return sorted(booth_map.values(), key=lambda b: b["booth_id"])


@router.get("/overview")
def get_admin_overview():
    try:
        booths = _compute_booth_stats()
        total_booths = len(booths)
        total_complaints = sum(b["complaint_count"] for b in booths)
        total_open = sum(b["open_count"] for b in booths)
        total_resolved = sum(b["resolved_count"] for b in booths)
        avg_open_ratio = round(total_open / total_complaints, 2) if total_complaints > 0 else 0

        total_voters = 0
        try:
            result = neo4j_client.run_query("MATCH (v:Voter) RETURN count(v) AS c")
            total_voters = result[0]["c"]
        except Exception:
            if VOTERS_CSV.exists():
                try:
                    total_voters = len(pd.read_csv(VOTERS_CSV))
                except Exception:
                    pass

        return {
            "total_booths": total_booths,
            "total_complaints": total_complaints,
            "total_open_complaints": total_open,
            "total_resolved_complaints": total_resolved,
            "avg_open_ratio": avg_open_ratio,
            "total_voters": total_voters,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch overview: {str(e)}"
        )


@router.get("/booths")
def get_booths(skip: int = 0, limit: int = 100):
    booths = _compute_booth_stats()
    return booths[skip : skip + limit]


@router.get("/recommendations")
def get_recommendations():
    booths = _compute_booth_stats()
    return [
        {
            "booth_id": b["booth_id"],
            "recommendation": b["recommendation"],
            "risk_level": b["risk_level"],
        }
        for b in booths
        if b["recommendation"] != "No action required"
    ]


@router.get("/messages")
def get_messages():
    from app.domain.services.message_generator import generate_booth_messages

    return generate_booth_messages()


@router.get("/analytics/network")
def get_analytics_network():
    from app.domain.services.graph_analytics import get_network_analytics

    try:
        return get_network_analytics()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate network analytics: {str(e)}"
        )


class DriveCreate(BaseModel):
    title: str
    description: str
    type: str  # 'Drive' or 'Function'
    date: str
    booth_id: str


@router.post("/drives")
def create_official_drive(drive: DriveCreate):
    try:
        # Create Drive node and link to Booth
        query = """
        MATCH (b:Booth {booth_id: $booth_id})
        CREATE (d:Drive {
            title: $title,
            description: $description,
            type: $type,
            date: $date,
            created_at: $created_at
        })
        CREATE (b)-[:HAS_DRIVE]->(d)
        RETURN d
        """
        params = {
            "booth_id": drive.booth_id,
            "title": drive.title,
            "description": drive.description,
            "type": drive.type,
            "date": drive.date,
            "created_at": datetime.now().isoformat()
        }
        result = neo4j_client.run_query(query, params)
        if not result:
            raise HTTPException(status_code=404, detail="Booth not found")
        return {"status": "success", "message": "Drive created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/drives")
def get_all_drives():
    try:
        query = """
        MATCH (b:Booth)-[:HAS_DRIVE]->(d:Drive)
        RETURN 
            d.title AS title,
            d.description AS description,
            d.type AS type,
            d.date AS date,
            b.booth_id AS booth_id,
            d.created_at AS created_at
        ORDER BY d.created_at DESC
        """
        return neo4j_client.run_query(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voters/filter")
def filter_voters(category: str):
    if not SCHEME_VOTERS_CSV.exists():
        return []
    try:
        df = pd.read_csv(SCHEME_VOTERS_CSV)
        cols = {c.lower(): c for c in df.columns}
        
        age_col = cols.get("age", "Age")
        gender_col = cols.get("gender", "Gender")
        name_col = cols.get("name", "Name")
        
        if age_col not in df.columns: df[age_col] = 0
        if gender_col not in df.columns: df[gender_col] = ""
        if name_col not in df.columns: df[name_col] = "Unknown"
        
        age_s = pd.to_numeric(df[age_col], errors='coerce')
        if category == "Young Voters":
            filtered = df[(age_s >= 18) & (age_s <= 35)]
        elif category == "Aged or old voters":
            filtered = df[age_s >= 60]
        elif category == "Male Voters":
            filtered = df[df[gender_col].astype(str).str.upper().str.startswith("M", na=False)]
        elif category == "Female Voters":
            filtered = df[df[gender_col].astype(str).str.upper().str.startswith("F", na=False)]
        elif category == "All Voters":
            filtered = df
        else:
            filtered = pd.DataFrame()
            
        names = filtered[name_col].dropna().tolist()
        return [{"name": str(name)} for name in names]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from typing import Optional, List

class SchemeSmsRequest(BaseModel):
    category: str
    scheme_name: str
    message: str
    excluded_names: Optional[List[str]] = []

@router.post("/schemes/send_sms")
def send_scheme_sms(req: SchemeSmsRequest):
    if not SCHEME_VOTERS_CSV.exists():
        raise HTTPException(status_code=404, detail="Voters CSV not found")
    
    from app.infrastructure.sms_service import send_sms
    
    try:
        df = pd.read_csv(SCHEME_VOTERS_CSV)
        cols = {c.lower(): c for c in df.columns}
        
        age_col = cols.get("age", "Age")
        gender_col = cols.get("gender", "Gender")
        phone_col = cols.get("numbers", cols.get("phone", cols.get("contact_no", "Contact_no")))
        if phone_col not in df.columns and "Numbers" in df.columns:
            phone_col = "Numbers"
        
        if age_col not in df.columns: df[age_col] = 0
        if gender_col not in df.columns: df[gender_col] = ""
        if phone_col not in df.columns: df[phone_col] = ""
        
        age_s = pd.to_numeric(df[age_col], errors='coerce')
        if req.category == "Young Voters":
            filtered = df[(age_s >= 18) & (age_s <= 35)]
        elif req.category == "Aged or old voters":
            filtered = df[age_s >= 60]
        elif req.category == "Male Voters":
            filtered = df[df[gender_col].astype(str).str.upper().str.startswith("M", na=False)]
        elif req.category == "Female Voters":
            filtered = df[df[gender_col].astype(str).str.upper().str.startswith("F", na=False)]
        elif req.category == "All Voters":
            filtered = df
        else:
            filtered = pd.DataFrame()
            
        if req.excluded_names and not filtered.empty:
            name_col = cols.get("name", "Name")
            if name_col in filtered.columns:
                filtered = filtered[~filtered[name_col].isin(req.excluded_names)]
                
        phones = filtered[phone_col].dropna().tolist()
        
        success_count = 0
        for phone in phones:
            phone_str = str(phone).strip()
            if not phone_str or phone_str == 'nan':
                continue
            full_msg = f"{req.scheme_name}\n\n{req.message}"
            res = send_sms(phone_str, full_msg)
            # The Fast2SMS backend returns dict, typically {"return": True, ...}
            if isinstance(res, dict) and res.get("return") == True:
                success_count += 1
                
        return {"status": "success", "message": f"Sent SMS to {success_count} voters in category: {req.category}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
