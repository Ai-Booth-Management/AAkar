from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from pathlib import Path
import pandas as pd
from app.infrastructure.db.neo4j_client import neo4j_client

router = APIRouter()

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
    """Build per-booth stats purely from CSVs."""
    # Collect all known booth_ids from voters CSV
    booth_ids: set[str] = set()
    if VOTERS_CSV.exists():
        try:
            df_v = pd.read_csv(VOTERS_CSV)
            col = "booth_id" if "booth_id" in df_v.columns else "Booth_id"
            if col in df_v.columns:
                booth_ids = set(df_v[col].dropna().astype(str).str.strip().unique())
        except Exception:
            pass

    # Per-booth complaint aggregation
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

                    # Most frequent issue type for recommendation
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

    # Booths from voters CSV that had zero complaints
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

        # ── Complaint stats from CSV (single source of truth) ──
        total_complaints = 0
        total_open = 0
        total_resolved = 0

        if COMPLAINTS_CSV.exists():
            df = pd.read_csv(COMPLAINTS_CSV)
            total_complaints = len(df)
            status_col = "Status" if "Status" in df.columns else "status"
            if status_col in df.columns:
                total_open = int((df[status_col] == "Open").sum())
                total_resolved = int((df[status_col] == "Resolved").sum())

        avg_open_ratio = 0
        if total_complaints > 0:
            avg_open_ratio = total_open / total_complaints

        total_voters = 0
        if VOTERS_CSV.exists():
            try:
                df_voters = pd.read_csv(VOTERS_CSV)
                total_voters = len(df_voters)
            except Exception:
                total_voters = 0

        return {
            "total_booths": total_booths,
            "total_complaints": total_complaints,
            "total_open_complaints": total_open,
            "total_resolved_complaints": total_resolved,
            "avg_open_ratio": round(avg_open_ratio, 2),
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
