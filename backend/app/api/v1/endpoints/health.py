"""Health & Family Welfare Department Dashboard & Data Entry API using SQLite (SQLModel) as source of truth."""

import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List, Dict

from fastapi import APIRouter, Query, HTTPException, Depends
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_user
from app.domain.models.user import User
from app.infrastructure.db.sqlite_client import get_session
from app.domain.models.health import HealthReport, HealthMetric, HealthProject
from app.domain.models.department import Action, AuditLog, ProjectEvidence, ProjectApproval, ProjectDelay, ProjectProgress
from app.api.v1.schemas.health_schemas import (
    DataEntrySubmitSchema,
    DraftSaveResponse,
    SubmitResponse,
    ProjectCreateSchema,
    ProjectUpdateSchema,
    ProjectActionSchema,
    ProjectSchema,
    EvidenceSchema,
    ActionResponseSchema,
    ActionUpdateSchema,
)

router = APIRouter()

# ─── File Paths ───
DATA_DIR = Path(__file__).resolve().parents[4] / "data"
HEALTH_SEED_FILE = DATA_DIR / "health.json"

DELHI_DISTRICTS = [
    "Central Delhi",
    "East Delhi",
    "New Delhi",
    "North Delhi",
    "North East Delhi",
    "North West Delhi",
    "Shahdara",
    "South Delhi",
    "South East Delhi",
    "South West Delhi",
    "West Delhi",
]


# ─── Helpers ──────────────────────────────────────────────────

def _load_seed_json() -> dict:
    """Load the original seed json to extract static complaints/backlog fields."""
    if HEALTH_SEED_FILE.exists():
        with open(HEALTH_SEED_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _get_district_report_from_db(
    district_name: str,
    month: str,
    year: int,
    preview: bool,
    session: Session
) -> Optional[HealthReport]:
    """Retrieve the report for a district, month, and year from database."""
    if preview:
        report = session.exec(
            select(HealthReport)
            .where(HealthReport.district_name == district_name)
            .where(HealthReport.reporting_month == month)
            .where(HealthReport.reporting_year == year)
            .where(HealthReport.status == "draft")
        ).first()
        if report:
            return report

    return session.exec(
        select(HealthReport)
        .where(HealthReport.district_name == district_name)
        .where(HealthReport.reporting_month == month)
        .where(HealthReport.reporting_year == year)
        .where(HealthReport.status == "submitted")
    ).first()


def _sync_project_actions(
    project_uid: str,
    district_name: str,
    project_name: str,
    officer: str,
    priority: str,
    project_deadline: str,
    tasks: Optional[List[Dict]],
    session: Session
):
    if tasks is None:
        return
    
    existing_actions = session.exec(
        select(Action).where(Action.project_uid == project_uid)
    ).all()
    
    existing_map = {act.title: act for act in existing_actions}
    incoming_names = {t.get("name") for t in tasks if t.get("name")}
    
    for name, act in list(existing_map.items()):
        if name not in incoming_names:
            session.delete(act)
            
    for task in tasks:
        title = task.get("name")
        if not title:
            continue
            
        stage = task.get("stage") or task.get("status") or "Assigned"
        deadline = task.get("deadline") or project_deadline
        
        act = existing_map.get(title)
        if act:
            act.deadline = deadline
            act.assigned_to = officer or "Dr. Rajesh Sharma"
            act.priority = priority or "Medium"
            session.add(act)
        else:
            all_actions = session.exec(select(Action)).all()
            uids = [
                int(a.action_uid.split("-")[1])
                for a in all_actions
                if a.action_uid.startswith("ACT-") and a.action_uid.split("-")[1].isdigit()
            ]
            next_num = max(uids) + 1 if uids else 1
            action_uid = f"ACT-{next_num:03d}"
            
            db_action = Action(
                action_uid=action_uid,
                title=title,
                description=f"Action item for Health project: {project_name}",
                assigned_by="Health Department Headquarters",
                assigned_to=officer or "Dr. Rajesh Sharma",
                district=district_name,
                project_uid=project_uid,
                priority=priority or "Medium",
                deadline=deadline,
                status=stage,
                remarks="",
                evidence_url=""
            )
            session.add(db_action)


def _save_report_to_db(
    payload: DataEntrySubmitSchema,
    status: str,
    session: Session
) -> datetime:
    """Save or update the full payload (all districts) in SQLite database."""
    now = datetime.now(timezone.utc)
    reporting_month = payload.reporting_month
    reporting_year = payload.reporting_year

    for dist in payload.district_data:
        district_name = dist.district_name

        if status == "submitted":
            old_draft = session.exec(
                select(HealthReport)
                .where(HealthReport.district_name == district_name)
                .where(HealthReport.reporting_month == reporting_month)
                .where(HealthReport.reporting_year == reporting_year)
                .where(HealthReport.status == "draft")
            ).first()
            if old_draft:
                session.delete(old_draft)

        report = session.exec(
            select(HealthReport)
            .where(HealthReport.district_name == district_name)
            .where(HealthReport.reporting_month == reporting_month)
            .where(HealthReport.reporting_year == reporting_year)
            .where(HealthReport.status == status)
        ).first()

        if not report:
            report = HealthReport(
                district_name=district_name,
                reporting_month=reporting_month,
                reporting_year=reporting_year,
                status=status
            )

        report.achievements = dist.officer_notes.remarks
        report.challenges = dist.officer_notes.risks
        report.recommendations = dist.officer_notes.recommendations
        report.updated_at = now
        report.updated_by = "health_officer@innovateindia.gov"

        session.add(report)
        session.commit()
        session.refresh(report)

        # Update health metrics
        infra = session.exec(
            select(HealthMetric)
            .where(HealthMetric.report_id == report.id)
        ).first()

        if not infra:
            infra = HealthMetric(report_id=report.id)

        infra.hospitals_completed = dist.infrastructure.hospitals.completed
        infra.hospitals_ongoing = dist.infrastructure.hospitals.ongoing
        infra.clinics_completed = dist.infrastructure.clinics.completed
        infra.clinics_ongoing = dist.infrastructure.clinics.ongoing
        infra.icu_beds_completed = dist.infrastructure.icu_beds.completed
        infra.icu_beds_ongoing = dist.infrastructure.icu_beds.ongoing
        infra.ventilators_completed = dist.infrastructure.ventilators.completed
        infra.ventilators_ongoing = dist.infrastructure.ventilators.ongoing
        infra.medicine_stock_completed = dist.infrastructure.medicine_stock.completed
        infra.medicine_stock_ongoing = dist.infrastructure.medicine_stock.ongoing
        infra.immunization_completed = dist.infrastructure.immunization.completed
        infra.immunization_ongoing = dist.infrastructure.immunization.ongoing

        session.add(infra)

        # Update projects
        existing_projects = session.exec(
            select(HealthProject)
            .where(HealthProject.report_id == report.id)
        ).all()
        
        existing_map = {p.project_uid: p for p in existing_projects}
        incoming_uids = {p.id for p in dist.projects.list}
        
        for uid, p in existing_map.items():
            if uid not in incoming_uids:
                log = AuditLog(
                    officer="health_officer@innovateindia.gov",
                    department="Department of Health & Family Welfare",
                    district=district_name,
                    module="Projects",
                    action_type="Project Deleted",
                    project_uid=uid,
                    prev_value=p.name,
                    new_value=None,
                    remarks=f"Project '{p.name}' deleted from report."
                )
                session.add(log)
                
                project_actions = session.exec(select(Action).where(Action.project_uid == uid)).all()
                for pa in project_actions:
                    session.delete(pa)

        for proj in dist.projects.list:
            old_p = existing_map.get(proj.id)
            if old_p:
                if old_p.progress != proj.progress:
                    log = AuditLog(
                        officer="health_officer@innovateindia.gov",
                        department="Department of Health & Family Welfare",
                        district=district_name,
                        module="Projects",
                        action_type="Progress Updated",
                        project_uid=proj.id,
                        prev_value=f"{old_p.progress}%",
                        new_value=f"{proj.progress}%",
                        remarks=f"Progress updated for {proj.name}."
                    )
                    session.add(log)
                if old_p.status != proj.status:
                    log = AuditLog(
                        officer="health_officer@innovateindia.gov",
                        department="Department of Health & Family Welfare",
                        district=district_name,
                        module="Projects",
                        action_type="Status Changed",
                        project_uid=proj.id,
                        prev_value=old_p.status,
                        new_value=proj.status,
                        remarks=f"Status updated to {proj.status}."
                    )
                    session.add(log)
                
                budget_changed = False
                prev_budget_str = []
                new_budget_str = []
                if old_p.budget_allocated != proj.budget_allocated:
                    budget_changed = True
                    prev_budget_str.append(f"Allocated: ₹{old_p.budget_allocated:,.0f}")
                    new_budget_str.append(f"Allocated: ₹{proj.budget_allocated:,.0f}")
                if old_p.budget_released != proj.budget_released:
                    budget_changed = True
                    prev_budget_str.append(f"Released: ₹{old_p.budget_released:,.0f}")
                    new_budget_str.append(f"Released: ₹{proj.budget_released:,.0f}")
                if old_p.budget_utilized != proj.budget_utilized:
                    budget_changed = True
                    prev_budget_str.append(f"Utilized: ₹{old_p.budget_utilized:,.0f}")
                    new_budget_str.append(f"Utilized: ₹{proj.budget_utilized:,.0f}")
                
                if budget_changed:
                    log = AuditLog(
                        officer="health_officer@innovateindia.gov",
                        department="Department of Health & Family Welfare",
                        district=district_name,
                        module="Funds",
                        action_type="Budget Updated",
                        project_uid=proj.id,
                        prev_value=", ".join(prev_budget_str),
                        new_value=", ".join(new_budget_str),
                        remarks=f"Budgets updated for project {proj.name}."
                    )
                    session.add(log)

                metadata_changed = []
                if old_p.name != proj.name:
                    metadata_changed.append("name")
                if old_p.contractor != proj.contractor:
                    metadata_changed.append("contractor")
                if old_p.executing_agency != proj.executing_agency:
                    metadata_changed.append("executing agency")
                if old_p.category != proj.type:
                    metadata_changed.append("category")
                if old_p.deadline != proj.deadline:
                    metadata_changed.append("deadline")
                if old_p.officer_in_charge != (proj.officer or ""):
                    metadata_changed.append("officer in charge")
                if old_p.remarks != (proj.remarks or ""):
                    metadata_changed.append("remarks")

                if metadata_changed:
                    log = AuditLog(
                        officer="health_officer@innovateindia.gov",
                        department="Department of Health & Family Welfare",
                        district=district_name,
                        module="Projects",
                        action_type="Project Updated",
                        project_uid=proj.id,
                        prev_value=f"Fields: {', '.join(metadata_changed)} changed",
                        new_value="Metadata updated",
                        remarks=f"Project details updated for {proj.name}."
                    )
                    session.add(log)
            else:
                log = AuditLog(
                    officer="health_officer@innovateindia.gov",
                    department="Department of Health & Family Welfare",
                    district=district_name,
                    module="Projects",
                    action_type="Project Created",
                    project_uid=proj.id,
                    prev_value=None,
                    new_value=proj.name,
                    remarks=f"New project '{proj.name}' created/added to report."
                )
                session.add(log)

        for ep in existing_projects:
            session.delete(ep)

        for proj in dist.projects.list:
            evidence_photo_url = proj.evidence.photo_url if proj.evidence else None
            evidence_gps = proj.evidence.gps if proj.evidence else None
            evidence_timestamp = proj.evidence.timestamp if proj.evidence else None
            evidence_remarks = proj.evidence.remarks if proj.evidence else None

            calculated_progress = proj.progress

            db_proj = HealthProject(
                report_id=report.id,
                project_uid=proj.id,
                name=proj.name,
                category=proj.type,
                contractor=proj.contractor,
                executing_agency=proj.executing_agency,
                budget_allocated=proj.budget_allocated,
                budget_released=proj.budget_released,
                budget_utilized=proj.budget_utilized,
                progress=calculated_progress,
                status=proj.status,
                deadline=proj.deadline,
                officer_in_charge=proj.officer or "",
                remarks=proj.remarks or "",
                evidence_photo_url=evidence_photo_url,
                evidence_gps=evidence_gps,
                evidence_timestamp=evidence_timestamp,
                evidence_remarks=evidence_remarks
            )
            session.add(db_proj)

            _sync_project_actions(
                project_uid=proj.id,
                district_name=district_name,
                project_name=proj.name,
                officer=proj.officer or "",
                priority=proj.priority or "Medium",
                project_deadline=proj.deadline or "",
                tasks=proj.tasks,
                session=session
            )

        action_type = "Draft Saved" if status == "draft" else "Report Submitted"
        log = AuditLog(
            officer="health_officer@innovateindia.gov",
            department="Department of Health & Family Welfare",
            district=district_name,
            module="Reports",
            action_type=action_type,
            prev_value=None,
            new_value=status,
            remarks=f"{action_type} for district {district_name} ({reporting_month} {reporting_year})."
        )
        session.add(log)

    session.commit()
    return now


# ─── API Endpoints ──────────────────────────────────────────────

@router.get("/dashboard")
def get_department_dashboard(
    preview: bool = Query(False),
    month: str = Query("June"),
    year: int = Query(2026),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Compile and return the full health dashboard payload from the SQLite database."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    now_iso = datetime.now(timezone.utc).isoformat() + "Z"
    seed_data = _load_seed_json()

    dashboard_payload = {
        "department": "Department of Health & Family Welfare",
        "government": "Government of NCT of Delhi",
        "last_updated": now_iso,
        "kpi": {
            "active_projects": 0,
            "delayed_projects": 0,
            "open_tasks": 0,
            "fund_utilization_pct": 0,
            "admin_backlog": 0,
            "department_score": 0,
            "department_score_max": 100,
        },
        "projects": [],
        "complaints": [],
        "fund_management": {
            "allocated": 0,
            "released": 0,
            "utilized": 0,
            "remaining": 0,
            "monthly_spending": [],
            "district_utilization": [],
        },
        "admin_backlog": {
            "pending_approvals": 0,
            "pending_reports": 0,
            "pending_requests": 0,
            "delayed_cases": 0,
            "age_buckets": [
                {"label": "0-7 Days", "count": 0},
                {"label": "7-15 Days", "count": 0},
                {"label": "15-30 Days", "count": 0},
                {"label": "30+ Days", "count": 0},
            ],
        },
        "district_scores": [],
        "districts": DELHI_DISTRICTS,
    }

    all_projects = []
    total_fund_allocated = 0
    total_fund_released = 0
    total_fund_utilized = 0
    district_scores = []
    district_utilization = []

    all_complaints = []
    for dist in seed_data.get("district_data", []):
        dist_name = dist.get("district_name")
        comp_data = dist.get("complaints", {})
        categories = comp_data.get("categories", {})
        total = comp_data.get("total", 0)
        resolved = comp_data.get("resolved", 0)
        
        cat_list = []
        for cat_name, cat_count in categories.items():
            cat_list.extend([cat_name] * cat_count)
            
        while len(cat_list) < total:
            cat_list.append("Other")
        if len(cat_list) > total:
            cat_list = cat_list[:total]
            
        for i, cat in enumerate(cat_list):
            status = "Resolved" if i < resolved else "Pending"
            all_complaints.append({
                "district": dist_name,
                "category": cat,
                "status": status
            })
    dashboard_payload["complaints"] = all_complaints
    dashboard_payload["fund_management"]["monthly_spending"] = seed_data.get("fund_management", {}).get("monthly_spending", [])

    reports_in_db = session.exec(
        select(HealthReport)
        .options(
            selectinload(HealthReport.projects),
            selectinload(HealthReport.health_metrics)
        )
        .where(HealthReport.reporting_month == month)
        .where(HealthReport.reporting_year == year)
    ).all()

    draft_reports = {r.district_name: r for r in reports_in_db if r.status == "draft"}
    submitted_reports = {r.district_name: r for r in reports_in_db if r.status == "submitted"}

    reports_map = {}
    all_projects_db = []
    for dist_name in DELHI_DISTRICTS:
        report = None
        if preview:
            report = draft_reports.get(dist_name) or submitted_reports.get(dist_name)
        else:
            report = submitted_reports.get(dist_name)
        reports_map[dist_name] = report
        if report:
            all_projects_db.extend(report.projects)

    project_uids = [p.project_uid for p in all_projects_db]
    actions_map = {}
    if project_uids:
        all_actions = session.exec(
            select(Action).where(Action.project_uid.in_(project_uids))
        ).all()
        for act in all_actions:
            actions_map.setdefault(act.project_uid, []).append(act)

    for dist_name in DELHI_DISTRICTS:
        report = reports_map.get(dist_name)
        seed_dist = next((d for d in seed_data.get("district_data", []) if d.get("district_name") == dist_name), {})

        projects_db = report.projects if report else []

        budget_alloc = report.funds_allocated if (report and report.funds_allocated is not None) else sum(p.budget_allocated for p in projects_db)
        budget_rel = report.funds_released if (report and report.funds_released is not None) else sum(p.budget_released for p in projects_db)
        budget_spent = report.funds_spent if (report and report.funds_spent is not None) else sum(p.budget_utilized for p in projects_db)

        for p in projects_db:
            proj_actions = actions_map.get(p.project_uid, [])
            flat_proj = {
                "id": p.project_uid,
                "name": p.name,
                "district": dist_name,
                "budget": p.budget_allocated,
                "allocated": p.budget_allocated,
                "released": p.budget_released,
                "utilized": p.budget_utilized,
                "progress": p.progress,
                "deadline": p.deadline,
                "status": p.status,
                "priority": "Medium",
                "officer": p.officer_in_charge,
                "tasks": [
                    {
                        "name": act.title,
                        "stage": act.status,
                        "deadline": act.deadline,
                        "progress": 100 if act.status in ("Completed", "Verified") else 50 if act.status == "In Progress" else 20 if act.status == "Accepted" else 0
                    }
                    for act in proj_actions
                ],
            }
            all_projects.append(flat_proj)

        util_pct = round(budget_spent / budget_alloc * 100) if budget_alloc > 0 else 0
        district_utilization.append({
            "district": dist_name,
            "allocated": budget_alloc,
            "utilized": budget_spent,
            "pct": util_pct,
        })

        total_proj = len(projects_db)
        completed_proj = len([p for p in projects_db if p.status == "Completed"])
        completed_ratio = completed_proj / total_proj if total_proj > 0 else 0.0
        
        delayed_count = len([p for p in projects_db if p.status in ("Delayed", "Critical")])
        utilization_ratio = budget_spent / budget_alloc if budget_alloc > 0 else 0.0
        
        bl = seed_dist.get("administrative_backlog", {})
        backlog = (
            bl.get("pending_approvals", 0)
            + bl.get("pending_reports", 0)
            + bl.get("pending_requests", 0)
        )
        
        score_val = 70 + 15 * utilization_ratio + 15 * completed_ratio - 5 * delayed_count - 1 * backlog
        score = max(0, min(100, int(round(score_val))))
        
        district_scores.append({
            "district": dist_name,
            "score": score,
            "trend": seed_dist.get("analytics", {}).get("trend", 0),
        })

        total_fund_allocated += budget_alloc
        total_fund_released += budget_rel
        total_fund_utilized += budget_spent

        bl = seed_dist.get("administrative_backlog", {})
        dashboard_payload["admin_backlog"]["pending_approvals"] += bl.get("pending_approvals", 0)
        dashboard_payload["admin_backlog"]["pending_reports"] += bl.get("pending_reports", 0)
        dashboard_payload["admin_backlog"]["pending_requests"] += bl.get("pending_requests", 0)
        dashboard_payload["admin_backlog"]["delayed_cases"] += bl.get("delayed_cases", 0)
        for bucket in bl.get("age_buckets", []):
            label = bucket.get("label", "")
            for agg_b in dashboard_payload["admin_backlog"]["age_buckets"]:
                if agg_b["label"] == label:
                    agg_b["count"] += bucket.get("count", 0)

    active_count = len([p for p in all_projects if p["status"] != "Completed"])
    delayed_count = len([p for p in all_projects if p["status"] in ("Delayed", "Critical")])
    fund_util_pct = round(total_fund_utilized / total_fund_allocated * 100) if total_fund_allocated > 0 else 0
    avg_score = round(sum(s["score"] for s in district_scores) / len(district_scores)) if district_scores else 0
    total_backlog = (
        dashboard_payload["admin_backlog"]["pending_approvals"]
        + dashboard_payload["admin_backlog"]["pending_reports"]
        + dashboard_payload["admin_backlog"]["pending_requests"]
    )

    dashboard_payload["projects"] = all_projects
    dashboard_payload["district_scores"] = district_scores
    dashboard_payload["fund_management"]["allocated"] = total_fund_allocated
    dashboard_payload["fund_management"]["released"] = total_fund_released
    dashboard_payload["fund_management"]["utilized"] = total_fund_utilized
    dashboard_payload["fund_management"]["remaining"] = total_fund_released - total_fund_utilized
    dashboard_payload["fund_management"]["district_utilization"] = district_utilization
    dashboard_payload["kpi"] = {
        "active_projects": active_count,
        "delayed_projects": delayed_count,
        "open_tasks": len([p for p in all_projects if p["status"] != "Completed"]) * 2,
        "fund_utilization_pct": fund_util_pct,
        "admin_backlog": total_backlog,
        "department_score": avg_score,
        "department_score_max": 100,
    }

    return dashboard_payload


@router.get("/admin")
def get_admin_draft(
    month: str = Query("June"),
    year: int = Query(2026),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Return the Health monthly report draft or baseline state for data entry."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    seed_data = _load_seed_json()

    form_data = {
        "metadata": {
            "version": "1.0",
            "updated_by": "health_officer@innovateindia.gov",
            "last_updated": datetime.now(timezone.utc).isoformat() + "Z",
        },
        "department": "Department of Health & Family Welfare",
        "reporting_month": month,
        "reporting_year": year,
        "district_data": [],
    }

    reports_in_db = session.exec(
        select(HealthReport)
        .options(
            selectinload(HealthReport.projects),
            selectinload(HealthReport.health_metrics)
        )
        .where(HealthReport.reporting_month == month)
        .where(HealthReport.reporting_year == year)
    ).all()

    draft_reports = {r.district_name: r for r in reports_in_db if r.status == "draft"}
    submitted_reports = {r.district_name: r for r in reports_in_db if r.status == "submitted"}

    reports_map = {}
    all_projects_db = []
    for dist_name in DELHI_DISTRICTS:
        report = draft_reports.get(dist_name) or submitted_reports.get(dist_name)
        reports_map[dist_name] = report
        if report:
            all_projects_db.extend(report.projects)

    project_uids = [p.project_uid for p in all_projects_db]
    actions_map = {}
    if project_uids:
        all_actions = session.exec(
            select(Action).where(Action.project_uid.in_(project_uids))
        ).all()
        for act in all_actions:
            actions_map.setdefault(act.project_uid, []).append(act)

    for dist_name in DELHI_DISTRICTS:
        report = reports_map.get(dist_name)
        seed_dist = next((d for d in seed_data.get("district_data", []) if d.get("district_name") == dist_name), {})

        if report:
            projects_list = []
            for p in report.projects:
                proj_actions = actions_map.get(p.project_uid, [])
                projects_list.append({
                    "id": p.project_uid,
                    "name": p.name,
                    "type": p.category,
                    "contractor": p.contractor,
                    "executing_agency": p.executing_agency,
                    "budget_allocated": p.budget_allocated,
                    "budget_released": p.budget_released,
                    "budget_utilized": p.budget_utilized,
                    "progress": p.progress,
                    "status": p.status,
                    "deadline": p.deadline,
                    "officer": p.officer_in_charge,
                    "remarks": p.remarks or "",
                    "tasks": [
                        {
                            "name": act.title,
                            "stage": act.status,
                            "deadline": act.deadline,
                            "progress": 100 if act.status in ("Completed", "Verified") else 50 if act.status == "In Progress" else 20 if act.status == "Accepted" else 0
                        }
                        for act in proj_actions
                    ]
                })

            infra_db = report.health_metrics
            infra_data = {
                "hospitals": {"completed": infra_db.hospitals_completed if infra_db else 0.0, "ongoing": infra_db.hospitals_ongoing if infra_db else 0.0},
                "clinics": {"completed": infra_db.clinics_completed if infra_db else 0.0, "ongoing": infra_db.clinics_ongoing if infra_db else 0.0},
                "icu_beds": {"completed": infra_db.icu_beds_completed if infra_db else 0.0, "ongoing": infra_db.icu_beds_ongoing if infra_db else 0.0},
                "ventilators": {"completed": infra_db.ventilators_completed if infra_db else 0.0, "ongoing": infra_db.ventilators_ongoing if infra_db else 0.0},
                "medicine_stock": {"completed": infra_db.medicine_stock_completed if infra_db else 0.0, "ongoing": infra_db.medicine_stock_ongoing if infra_db else 0.0},
                "immunization": {"completed": infra_db.immunization_completed if infra_db else 0.0, "ongoing": infra_db.immunization_ongoing if infra_db else 0.0},
            }

            funds_allocated_val = report.funds_allocated if report.funds_allocated is not None else sum(p.budget_allocated for p in report.projects)
            funds_released_val = report.funds_released if report.funds_released is not None else sum(p.budget_released for p in report.projects)
            funds_utilized_val = report.funds_spent if report.funds_spent is not None else sum(p.budget_utilized for p in report.projects)

            funds_data = {
                "allocated": funds_allocated_val,
                "released": funds_released_val,
                "utilized": funds_utilized_val,
                "remaining": funds_released_val - funds_utilized_val
            }

            form_data["district_data"].append({
                "district_id": seed_dist.get("district_id", "DIST_01"),
                "district_name": dist_name,
                "projects": {
                    "total": len(projects_list),
                    "active": len([p for p in projects_list if p["status"] != "Completed"]),
                    "completed": len([p for p in projects_list if p["status"] == "Completed"]),
                    "delayed": len([p for p in projects_list if p["status"] == "Delayed"]),
                    "critical": len([p for p in projects_list if p["status"] == "Critical"]),
                    "list": projects_list,
                },
                "funds": funds_data,
                "infrastructure": infra_data,
                "complaints": seed_dist.get("complaints", {}),
                "administrative_backlog": seed_dist.get("administrative_backlog", {}),
                "analytics": seed_dist.get("analytics", {}),
                "officer_notes": {
                    "remarks": report.achievements or "",
                    "risks": report.challenges or "",
                    "recommendations": report.recommendations or "",
                }
            })
        else:
            form_data["district_data"].append(seed_dist)

    return {"status": "ok", "source": "db", "data": form_data}


@router.post("/draft", response_model=DraftSaveResponse)
def save_draft(
    payload: DataEntrySubmitSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Save report parameters as a draft in the database."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    try:
        now = _save_report_to_db(payload, "draft", session)
        return DraftSaveResponse(
            status="ok",
            message="Draft saved successfully in SQLite database",
            timestamp=now.isoformat() + "Z"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save draft in database: {str(e)}")


@router.post("/submit", response_model=SubmitResponse)
def submit_data(
    payload: DataEntrySubmitSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Publish/submit report parameters to the database."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    try:
        now = _save_report_to_db(payload, "submitted", session)
        return SubmitResponse(
            status="ok",
            message="Data submitted and published successfully in SQLite database",
            timestamp=now.isoformat() + "Z"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit data to database: {str(e)}")


# ─── Project Management CRUD & Action Endpoints ─────────────────────────────────────────────

@router.get("/projects")
def get_projects(
    search: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all health projects with search and filters."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    stmt = select(HealthProject).options(selectinload(HealthProject.report))
    projects = session.exec(stmt).all()
    
    if district and district != "All":
        projects = [p for p in projects if p.report and p.report.district_name == district]
        
    if status and status != "All":
        projects = [p for p in projects if p.status == status]
        
    if search:
        s = search.lower()
        projects = [
            p for p in projects
            if s in p.name.lower() or s in p.project_uid.lower() or (p.officer_in_charge and s in p.officer_in_charge.lower())
        ]
        
    project_uids = [p.project_uid for p in projects]
    evidences_map = {}
    approvals_map = {}
    delays_map = {}
    progress_map = {}
    
    if project_uids:
        all_evs = session.exec(select(ProjectEvidence).where(ProjectEvidence.project_uid.in_(project_uids))).all()
        for ev in all_evs:
            evidences_map.setdefault(ev.project_uid, []).append(ev)
            
        all_apps = session.exec(select(ProjectApproval).where(ProjectApproval.project_uid.in_(project_uids))).all()
        for app in all_apps:
            existing = approvals_map.get(app.project_uid)
            if not existing or app.id > existing.id:
                approvals_map[app.project_uid] = app
                
        all_dels = session.exec(select(ProjectDelay).where(ProjectDelay.project_uid.in_(project_uids))).all()
        for d in all_dels:
            existing = delays_map.get(d.project_uid)
            if not existing or d.id > existing.id:
                delays_map[d.project_uid] = d
                
        all_progs = session.exec(select(ProjectProgress).where(ProjectProgress.project_uid.in_(project_uids))).all()
        for prog in all_progs:
            existing = progress_map.get(prog.project_uid)
            if not existing or prog.id > existing.id:
                progress_map[prog.project_uid] = prog

    result = []
    for p in projects:
        evs = evidences_map.get(p.project_uid, [])
        ev_list = []
        for ev in evs:
            ev_list.append({
                "photo_url": ev.photo_url,
                "gps": ev.gps,
                "timestamp": ev.timestamp,
                "remarks": ev.remarks
            })
            
        app_obj = approvals_map.get(p.project_uid)
        approval_data = None
        if app_obj:
            approval_data = {
                "status": app_obj.status,
                "approver": app_obj.approver,
                "comments": app_obj.comments,
                "timestamp": app_obj.timestamp
            }
            
        del_obj = delays_map.get(p.project_uid)
        delay_data = None
        if del_obj:
            delay_data = {
                "reason": del_obj.reason,
                "revised_deadline": del_obj.revised_deadline,
                "remarks": del_obj.remarks,
                "timestamp": del_obj.timestamp
            }

        prog_obj = progress_map.get(p.project_uid)
        progress_updated_at = prog_obj.timestamp if prog_obj else None

        if not ev_list and (p.evidence_photo_url or p.evidence_gps or p.evidence_timestamp or p.evidence_remarks):
            fallback_ev = {
                "photo_url": p.evidence_photo_url or "",
                "gps": p.evidence_gps or "28.6139° N, 77.2090° E",
                "timestamp": p.evidence_timestamp or "",
                "remarks": p.evidence_remarks or ""
            }
            ev_list.append(fallback_ev)

        result.append({
            "id": p.project_uid,
            "name": p.name,
            "district": p.report.district_name if p.report else "",
            "type": p.category,
            "contractor": p.contractor,
            "executing_agency": p.executing_agency,
            "budget_allocated": p.budget_allocated,
            "budget_released": p.budget_released,
            "budget_utilized": p.budget_utilized,
            "progress": p.progress,
            "deadline": p.deadline,
            "status": p.status,
            "officer": p.officer_in_charge,
            "remarks": p.remarks or "",
            "progress_updated_at": progress_updated_at,
            "evidence": ev_list[-1] if ev_list else None,
            "evidences": ev_list,
            "approval": approval_data,
            "delay": delay_data
        })
    return result


@router.post("/projects")
def create_project(
    payload: ProjectCreateSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new health project linked to a district report, logging to AuditTrail."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    
    report = session.exec(
        select(HealthReport)
        .where(HealthReport.district_name == payload.district)
        .where(HealthReport.reporting_month == payload.reporting_month)
        .where(HealthReport.reporting_year == payload.reporting_year)
        .where(HealthReport.status == "submitted")
    ).first()
    if not report:
        report = session.exec(
            select(HealthReport)
            .where(HealthReport.district_name == payload.district)
            .where(HealthReport.reporting_month == payload.reporting_month)
            .where(HealthReport.reporting_year == payload.reporting_year)
            .where(HealthReport.status == "draft")
        ).first()
    if not report:
        report = HealthReport(
            district_name=payload.district,
            reporting_month=payload.reporting_month,
            reporting_year=payload.reporting_year,
            status="submitted",
            achievements="",
            challenges="",
            recommendations=""
        )
        session.add(report)
        session.commit()
        session.refresh(report)

        infra = HealthMetric(report_id=report.id)
        session.add(infra)
        session.commit()

    existing_p = session.exec(select(HealthProject)).all()
    max_num = 0
    for p in existing_p:
        if p.project_uid.startswith("HLT-"):
            try:
                num = int(p.project_uid.split("-")[1])
                if num > max_num:
                    max_num = num
            except Exception:
                pass
    project_uid = f"HLT-{max_num + 1:03d}"

    db_proj = HealthProject(
        report_id=report.id,
        project_uid=project_uid,
        name=payload.name,
        category=payload.type,
        contractor=payload.contractor,
        executing_agency=payload.executing_agency,
        budget_allocated=payload.budget_allocated,
        budget_released=payload.budget_released,
        budget_utilized=payload.budget_utilized,
        progress=payload.progress,
        status=payload.status,
        deadline=payload.deadline,
        officer_in_charge=payload.officer,
        remarks=payload.remarks
    )
    session.add(db_proj)

    default_tasks = [
        {"name": "Initial Infrastructure & Facility Setup", "stage": "Assigned", "deadline": payload.deadline},
        {"name": "Medical Equipment Installation & Testing", "stage": "Assigned", "deadline": payload.deadline},
        {"name": "Final Medical Compliance & Licensing", "stage": "Assigned", "deadline": payload.deadline}
    ]
    _sync_project_actions(
        project_uid=project_uid,
        district_name=payload.district,
        project_name=payload.name,
        officer=payload.officer,
        priority="Medium",
        project_deadline=payload.deadline,
        tasks=default_tasks,
        session=session
    )

    log = AuditLog(
        officer=current_user.email,
        department="Department of Health & Family Welfare",
        district=payload.district,
        module="Projects",
        action_type="Project Created",
        project_uid=project_uid,
        prev_value=None,
        new_value=payload.name,
        remarks=f"Project '{payload.name}' created/added via Project Management page."
    )
    session.add(log)
    session.commit()
    session.refresh(db_proj)

    return {"status": "ok", "project_uid": project_uid}


@router.put("/projects/{project_uid}")
def update_project(
    project_uid: str,
    payload: ProjectUpdateSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update general project information, logging to AuditTrail."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    project = session.exec(
        select(HealthProject).where(HealthProject.project_uid == project_uid)
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    changes = []
    if project.name != payload.name:
        changes.append(f"Name: {project.name} -> {payload.name}")
        project.name = payload.name
    if project.category != payload.type:
        changes.append(f"Type: {project.category} -> {payload.type}")
        project.category = payload.type
    if project.contractor != payload.contractor:
        changes.append(f"Contractor: {project.contractor} -> {payload.contractor}")
        project.contractor = payload.contractor
    if project.executing_agency != payload.executing_agency:
        changes.append(f"Agency: {project.executing_agency} -> {payload.executing_agency}")
        project.executing_agency = payload.executing_agency
    if project.budget_allocated != payload.budget_allocated:
        changes.append(f"Budget Allocated: {project.budget_allocated} -> {payload.budget_allocated}")
        project.budget_allocated = payload.budget_allocated
    if project.budget_released != payload.budget_released:
        changes.append(f"Budget Released: {project.budget_released} -> {payload.budget_released}")
        project.budget_released = payload.budget_released
    if project.budget_utilized != payload.budget_utilized:
        changes.append(f"Budget Utilized: {project.budget_utilized} -> {payload.budget_utilized}")
        project.budget_utilized = payload.budget_utilized
    if project.progress != payload.progress:
        changes.append(f"Progress: {project.progress}% -> {payload.progress}%")
        project.progress = payload.progress
    if project.status != payload.status:
        changes.append(f"Status: {project.status} -> {payload.status}")
        project.status = payload.status
    if project.deadline != payload.deadline:
        changes.append(f"Deadline: {project.deadline} -> {payload.deadline}")
        project.deadline = payload.deadline
    if project.officer_in_charge != payload.officer:
        changes.append(f"Officer: {project.officer_in_charge} -> {payload.officer}")
        project.officer_in_charge = payload.officer
    if project.remarks != payload.remarks:
        changes.append(f"Remarks: {project.remarks} -> {payload.remarks}")
        project.remarks = payload.remarks

    if payload.evidence:
        if project.evidence_photo_url != payload.evidence.photo_url:
            changes.append("Photo Evidence Updated")
            project.evidence_photo_url = payload.evidence.photo_url
        if project.evidence_gps != payload.evidence.gps:
            changes.append("GPS Coordinates Updated")
            project.evidence_gps = payload.evidence.gps
        if project.evidence_timestamp != payload.evidence.timestamp:
            changes.append("Evidence Timestamp Updated")
            project.evidence_timestamp = payload.evidence.timestamp
        if project.evidence_remarks != payload.evidence.remarks:
            changes.append(f"Evidence Remarks: {project.evidence_remarks} -> {payload.evidence.remarks}")
            project.evidence_remarks = payload.evidence.remarks

    if changes or payload.evidence:
        session.add(project)

        if project.status == "Completed" or project.progress == 100:
            actions = session.exec(select(Action).where(Action.project_uid == project_uid)).all()
            for act in actions:
                if act.status not in ("Completed", "Verified"):
                    prev_status = act.status
                    act.status = "Completed"
                    act.updated_at = datetime.now(timezone.utc)
                    session.add(act)
                    
                    log_act = AuditLog(
                        officer=current_user.email,
                        department="Department of Health & Family Welfare",
                        district=project.report.district_name,
                        module="Action Tracker",
                        action_type="Action Status Updated",
                        project_uid=project_uid,
                        prev_value=prev_status,
                        new_value="Completed",
                        remarks=f"Instruction '{act.title}' automatically set to Completed because project was completed."
                    )
                    session.add(log_act)

        log = AuditLog(
            officer=current_user.email,
            department="Department of Health & Family Welfare",
            district=project.report.district_name,
            module="Projects",
            action_type="Project Updated",
            project_uid=project_uid,
            prev_value="Changes detected",
            new_value=", ".join(changes),
            remarks=f"Project details updated: {'; '.join(changes)}"
        )
        session.add(log)
        session.commit()
        session.refresh(project)

    return {"status": "ok"}


@router.delete("/projects/{project_uid}")
def delete_project(
    project_uid: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a health project, logging to AuditTrail."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    project = session.exec(
        select(HealthProject).where(HealthProject.project_uid == project_uid)
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    district = project.report.district_name
    name = project.name
    session.delete(project)

    log = AuditLog(
        officer=current_user.email,
        department="Department of Health & Family Welfare",
        district=district,
        module="Projects",
        action_type="Project Deleted",
        project_uid=project_uid,
        prev_value=name,
        new_value=None,
        remarks=f"Project '{name}' deleted."
    )
    session.add(log)
    session.commit()

    return {"status": "ok"}


@router.post("/projects/{project_uid}/action")
def run_project_action(
    project_uid: str,
    payload: ProjectActionSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Perform action on health project (Update Progress, Upload Evidence, Request Approval, Flag Delay) and log to AuditTrail."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    project = session.exec(
        select(HealthProject).where(HealthProject.project_uid == project_uid)
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    action_type = payload.action_type
    prev_status = project.status
    prev_progress = project.progress

    if action_type == "update_progress":
        if payload.progress is None:
            raise HTTPException(status_code=400, detail="Progress value required")
        project.progress = payload.progress
        if payload.progress == 100:
            project.status = "Completed"
            actions = session.exec(select(Action).where(Action.project_uid == project_uid)).all()
            for act in actions:
                if act.status not in ("Completed", "Verified"):
                    prev_act_status = act.status
                    act.status = "Completed"
                    act.updated_at = datetime.now(timezone.utc)
                    session.add(act)
                    log_act = AuditLog(
                        officer=current_user.email,
                        department="Department of Health & Family Welfare",
                        district=project.report.district_name,
                        module="Action Tracker",
                        action_type="Action Status Updated",
                        project_uid=project_uid,
                        prev_value=prev_act_status,
                        new_value="Completed",
                        remarks=f"Instruction '{act.title}' automatically set to Completed because project progress was updated to 100%."
                    )
                    session.add(log_act)
        if payload.remarks:
            project.remarks = payload.remarks
        session.add(project)

        prog_record = ProjectProgress(
            project_uid=project_uid,
            progress=payload.progress,
            remarks=payload.remarks or "",
            timestamp=payload.timestamp or datetime.now(timezone.utc).isoformat()
        )
        session.add(prog_record)

        log = AuditLog(
            officer=current_user.email,
            department="Department of Health & Family Welfare",
            district=project.report.district_name,
            module="Projects",
            action_type="Progress Updated",
            project_uid=project_uid,
            prev_value=f"{prev_progress}%",
            new_value=f"{payload.progress}%",
            remarks=payload.remarks or f"Progress updated directly to {payload.progress}%."
        )
        session.add(log)

    elif action_type == "upload_evidence":
        project.evidence_photo_url = payload.photo_url
        project.evidence_gps = payload.gps
        project.evidence_timestamp = payload.timestamp or datetime.now(timezone.utc).isoformat()
        project.evidence_remarks = payload.remarks
        session.add(project)

        evidence_record = ProjectEvidence(
            project_uid=project_uid,
            photo_url=payload.photo_url or "",
            gps=payload.gps or "28.6139° N, 77.2090° E",
            timestamp=payload.timestamp or datetime.now(timezone.utc).isoformat(),
            remarks=payload.remarks or ""
        )
        session.add(evidence_record)

        log = AuditLog(
            officer=current_user.email,
            department="Department of Health & Family Welfare",
            district=project.report.district_name,
            module="Projects",
            action_type="Evidence Uploaded",
            project_uid=project_uid,
            prev_value=None,
            new_value="Photo, GPS: " + (payload.gps or "N/A"),
            remarks=f"Evidence uploaded. GPS: {payload.gps or 'N/A'}. Remarks: {payload.remarks or 'N/A'}."
        )
        session.add(log)

    elif action_type == "request_approval":
        app_status = payload.status or "Pending"
        approver_val = payload.approver or "Health Department Officer"
        comments_val = payload.remarks or "Officer requested project completion/milestone approval."
        ts_val = payload.timestamp or datetime.now(timezone.utc).isoformat()

        approval_record = ProjectApproval(
            project_uid=project_uid,
            status=app_status,
            approver=approver_val,
            comments=comments_val,
            timestamp=ts_val
        )
        session.add(approval_record)

        action_type_str = "Approval Requested" if app_status == "Pending" else f"Approval {app_status}"

        log = AuditLog(
            officer=current_user.email,
            department="Department of Health & Family Welfare",
            district=project.report.district_name,
            module="Projects",
            action_type=action_type_str,
            project_uid=project_uid,
            prev_value=project.status,
            new_value=f"Approval: {app_status}",
            remarks=comments_val
        )
        session.add(log)

    elif action_type == "flag_delay":
        delay_reason = payload.reason or "Supply Shortage"
        revised_deadline = payload.revised_deadline or project.deadline
        remarks_val = payload.remarks or "Delay flagged"
        
        project.status = payload.status or "Delayed"
        if payload.remarks:
            project.remarks = payload.remarks
        session.add(project)

        delay_record = ProjectDelay(
            project_uid=project_uid,
            reason=delay_reason,
            revised_deadline=revised_deadline,
            remarks=remarks_val,
            timestamp=payload.timestamp or datetime.now(timezone.utc).isoformat()
        )
        session.add(delay_record)

        log = AuditLog(
            officer=current_user.email,
            department="Department of Health & Family Welfare",
            district=project.report.district_name,
            module="Projects",
            action_type="Delay Flagged",
            project_uid=project_uid,
            prev_value=prev_status,
            new_value=project.status,
            remarks=f"Delay flagged. Reason: {delay_reason}. Revised deadline: {revised_deadline}."
        )
        session.add(log)

    else:
        raise HTTPException(status_code=400, detail="Invalid action type")

    session.commit()
    session.refresh(project)

    return {"status": "ok", "project": {
        "id": project.project_uid,
        "progress": project.progress,
        "status": project.status,
        "remarks": project.remarks or ""
    }}


# ─── AI summary & Analytics REST Endpoints ───

def _query_ollama_realtime(prompt: str) -> str:
    import requests
    import re
    try:
        res = requests.post(
            f"{settings.OLLAMA_URL}/api/generate",
            json={
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3
                }
            },
            timeout=15.0
        )
        if res.status_code == 200:
            text = res.json().get("response", "")
            text = re.sub(r"<thought>.*?</thought>", "", text, flags=re.DOTALL).strip()
            return text
    except Exception as e:
        print(f"Ollama error: {e}")
    return ""


def _fmt_currency_py(val: float) -> str:
    if val >= 10000000:
        return f"Rs. {val / 10000000:.1f} Cr"
    if val >= 100000:
        return f"Rs. {val / 100000:.1f} L"
    return f"Rs. {val:,.0f}"


@router.get("/ai-summary")
def get_ai_summary(
    month: str = Query("June"),
    year: int = Query(2026),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Generate rule-based AI executive health department summaries based on active SQLite records."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    dash = get_department_dashboard(preview=False, month=month, year=year, session=session, current_user=current_user)
    seed_data = _load_seed_json()
    all_projects = []
    district_utilization = []
    delayed_by_district = {}
    backlog_by_district = {}
    
    reports_in_db = session.exec(
        select(HealthReport)
        .options(selectinload(HealthReport.projects))
        .where(HealthReport.reporting_month == month)
        .where(HealthReport.reporting_year == year)
        .where(HealthReport.status == "submitted")
    ).all()
    reports_map = {r.district_name: r for r in reports_in_db}

    for dist_name in DELHI_DISTRICTS:
        report = reports_map.get(dist_name)
        seed_dist = next((d for d in seed_data.get("district_data", []) if d.get("district_name") == dist_name), {})
        
        if report:
            p_list = report.projects
            alloc = sum(p.budget_allocated for p in p_list)
            spent = sum(p.budget_utilized for p in p_list)
            
            bl = seed_dist.get("administrative_backlog", {})
            backlog = bl.get("pending_approvals", 0) + bl.get("pending_reports", 0) + bl.get("pending_requests", 0)
            
            district_utilization.append({
                "district": dist_name,
                "allocated": alloc,
                "utilized": spent,
                "pct": (spent / alloc * 100) if alloc > 0 else 0.0
            })
            for p in p_list:
                object.__setattr__(p, 'district_name', dist_name)
                all_projects.append(p)
                if p.status in ("Delayed", "Critical"):
                    delayed_by_district[dist_name] = delayed_by_district.get(dist_name, 0) + 1
            backlog_by_district[dist_name] = backlog
        else:
            p_list = seed_dist.get("projects", {}).get("list", [])
            funds = seed_dist.get("funds", {})
            alloc = funds.get("allocated", 0.0)
            spent = funds.get("utilized", 0.0)
            
            bl = seed_dist.get("administrative_backlog", {})
            backlog = bl.get("pending_approvals", 0) + bl.get("pending_reports", 0) + bl.get("pending_requests", 0)
            
            district_utilization.append({
                "district": dist_name,
                "allocated": alloc,
                "utilized": spent,
                "pct": (spent / alloc * 100) if alloc > 0 else 0.0
            })
            for p in p_list:
                proj_obj = HealthProject(
                    project_uid=p.get("id"),
                    name=p.get("name"),
                    category=p.get("type"),
                    budget_allocated=p.get("budget_allocated", 0),
                    budget_utilized=p.get("budget_utilized", 0),
                    progress=p.get("progress", 0),
                    status=p.get("status", "On Track"),
                    deadline=p.get("deadline"),
                    contractor=p.get("contractor"),
                    executing_agency=p.get("executing_agency"),
                    officer_in_charge=p.get("officer")
                )
                object.__setattr__(proj_obj, 'district_name', dist_name)
                all_projects.append(proj_obj)
                if p.get("status") in ("Delayed", "Critical"):
                    delayed_by_district[dist_name] = delayed_by_district.get(dist_name, 0) + 1
            backlog_by_district[dist_name] = backlog
            
    total_projects = len(all_projects)
    completed_projects = len([p for p in all_projects if p.status == "Completed"])
    delayed_projects = len([p for p in all_projects if p.status == "Delayed"])
    critical_projects = len([p for p in all_projects if p.status == "Critical"])
    
    total_allocated = sum(d["allocated"] for d in district_utilization)
    total_utilized = sum(d["utilized"] for d in district_utilization)
    utilization_pct = round(total_utilized / total_allocated * 100) if total_allocated > 0 else 0
    
    under_utilized = [d["district"] for d in district_utilization if d["pct"] < 40.0]
    high_spending = [d["district"] for d in district_utilization if d["pct"] > 75.0]
    
    delayed_list = [p for p in all_projects if p.status in ("Delayed", "Critical")]
    
    complaints = dash.get("complaints", [])
    total_c = len(complaints)
    open_c = len([c for c in complaints if c.get("status") != "Resolved"])
    resolution_rate = round(((total_c - open_c) / total_c * 100)) if total_c > 0 else 0
    
    cat_counts = {}
    for c in complaints:
        cat = c.get("category", "General")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
        
    top_cat = max(cat_counts, key=cat_counts.get) if cat_counts else "None"
    top_cat_count = cat_counts.get(top_cat, 0)
    
    delayed_projects_text = ""
    for idx, p in enumerate(delayed_list):
        delayed_projects_text += f"- {p.name} ({getattr(p, 'district_name', 'Unknown')}): Status is '{p.status}' with {p.progress}% progress. Officer: {p.officer_in_charge}.\n"
    if not delayed_projects_text:
        delayed_projects_text = "No delayed or critical projects."

    under_utilized_str = ", ".join(under_utilized) if under_utilized else "None"
    high_spending_str = ", ".join(high_spending) if high_spending else "None"

    prompt = f"""You are AAkar AI, an advanced governance AI assistant for the Government of NCT of Delhi.
Analyze the following Health & Family Welfare Department real-time data for {month} {year} and generate a concise department summary.

DATA:
1. Health Projects Overview:
- Total Projects: {total_projects}
- Completed: {completed_projects}
- Delayed: {delayed_projects}
- Critical: {critical_projects}
- Detailed Delayed/Critical Projects:
{delayed_projects_text}

2. Fund Utilization:
- Total Budget Allocated: {_fmt_currency_py(total_allocated)}
- Total Budget Spent: {_fmt_currency_py(total_utilized)}
- Utilization Rate: {utilization_pct}%
- Under-utilized Districts (utilization < 40%): {under_utilized_str}
- High-performing Districts (utilization > 75%): {high_spending_str}

3. Civic Grievances/Complaints:
- Total complaints: {total_c}
- Open complaints: {open_c}
- Resolution Rate: {resolution_rate}%
- Surging Category: {top_cat} ({top_cat_count} reports)

4. Administrative Backlog:
- Pending Approvals & Overdue Requests: {sum(d.get("pending_approvals", 0) for d in [dist.get("administrative_backlog", {}) for dist in seed_data.get("district_data", [])])}

Generate the following four sections in your response. Each section must start with its respective tag on a new line:
[DELAYED_PROJECTS_INSIGHT]
(Provide a 1-2 sentence high-level executive insight explaining the delay causes and district concentrations. Mention specific projects if critical.)

[COMPLAINT_TRENDS_INSIGHT]
(Provide a 1-2 sentence insight about complaint volume, resolution status, and the surging category. Keep it specific and concise.)

[FUND_ISSUES_INSIGHT]
(Provide a 1-2 sentence fiscal analysis explaining the under-utilization or allocation challenges.)

[RECOMMENDATIONS]
(Provide exactly 3-4 bullet points of highly specific, actionable administrative directives/interventions. Start each bullet point with '- '.)
"""

    ai_response = _query_ollama_realtime(prompt)
    
    delayed_insight = f"{len(delayed_list)} health projects are currently delayed or critical. Immediate oversight is required for {', '.join(set(getattr(p, 'district_name', 'Unknown') for p in delayed_list[:3]))}." if delayed_list else "All active health projects are on schedule."
    complaint_insight = f"Medical service grievances stand at {total_c} with {open_c} open. Surges identified in '{top_cat}' ({top_cat_count} reports)." if total_c > 0 else "No active medical grievances registered."
    fund_insight = f"Overall budget utilization is at {utilization_pct}%. Low fund deployment (<40%) in: {', '.join(under_utilized)}." if under_utilized else f"Budget deployment is optimal at {utilization_pct}% across all districts."
    
    recommendations = []
    worst_delayed_district = max(delayed_by_district, key=delayed_by_district.get) if delayed_by_district else None
    if worst_delayed_district and delayed_by_district[worst_delayed_district] > 0:
        recommendations.append(f"Increase project monitoring and allocate emergency recovery resources in {worst_delayed_district} (due to {delayed_by_district[worst_delayed_district]} delayed/critical health projects).")
    else:
        recommendations.append("All active health projects are generally on track; maintain current procurement and building pacing.")
        
    worst_backlog_district = max(backlog_by_district, key=backlog_by_district.get) if backlog_by_district else None
    if worst_backlog_district and backlog_by_district[worst_backlog_district] > 10:
        recommendations.append(f"Deploy administrative taskforce to {worst_backlog_district} to clear the pending backlog of {backlog_by_district[worst_backlog_district]} cases.")
        
    if under_utilized:
        recommendations.append(f"Audit and expedite fund utilization for under-performing projects in {', '.join(under_utilized[:2])} (utilization < 40%).")
    if high_spending:
        recommendations.append(f"Perform fiscal review and release additional contingent funds for high-performing districts: {', '.join(high_spending[:2])}.")
        
    if open_c > 0:
        recommendations.append(f"Direct pharmacy division to prioritize resolving open '{top_cat}' complaints (currently {top_cat_count} cases).")

    if ai_response:
        import re
        pattern = r"\[\s*(DELAYED[ _-]PROJECTS?[ _-]INSIGHTS?|COMPLAINTS?[ _-]TRENDS?[ _-]INSIGHTS?|FUNDS?[ _-]ISSUES?[ _-]INSIGHTS?|FUNDING[ _-]ISSUES?[ _-]INSIGHTS?|RECOMMENDATIONS?)\s*\]"
        parts = re.split(pattern, ai_response, flags=re.IGNORECASE)
        parsed_recs = []
        for i in range(1, len(parts), 2):
            tag = parts[i].upper().replace(" ", "_").replace("-", "_")
            val = parts[i+1].strip() if i+1 < len(parts) else ""
            if "DELAY" in tag and val:
                delayed_insight = val
            elif "COMPLAINT" in tag and val:
                complaint_insight = val
            elif "FUND" in tag and val:
                fund_insight = val
            elif "REC" in tag and val:
                lines = [line.strip().lstrip("-* ").strip() for line in val.split("\n") if line.strip()]
                for line in lines:
                    cleaned = re.sub(r"^\d+[\.\s\-]+", "", line).strip()
                    if cleaned:
                        parsed_recs.append(cleaned)
        if len(parsed_recs) >= 2:
            recommendations = parsed_recs

    return {
        "project_overview": {
            "total": total_projects,
            "completed": completed_projects,
            "delayed": delayed_projects,
            "critical": critical_projects
        },
        "budget_analysis": {
            "utilization_pct": utilization_pct,
            "under_utilized": under_utilized,
            "high_spending": high_spending
        },
        "admin_analysis": {
            "pending_approvals": sum(d.get("pending_approvals", 0) for d in [dist.get("administrative_backlog", {}) for dist in seed_data.get("district_data", [])]),
            "delayed_requests": sum(d.get("delayed_cases", 0) for d in [dist.get("administrative_backlog", {}) for dist in seed_data.get("district_data", [])])
        },
        "delayed_projects": {
            "count": len(delayed_list),
            "list": [{"id": p.project_uid, "name": p.name, "district": getattr(p, 'district_name', 'Unknown'), "status": p.status, "progress": p.progress} for p in delayed_list],
            "insight": delayed_insight
        },
        "complaint_trends": {
            "total": total_c,
            "open": open_c,
            "resolution_rate": resolution_rate,
            "top_category": top_cat,
            "insight": complaint_insight
        },
        "fund_issues": {
            "overall_utilization": utilization_pct,
            "under_utilized_count": len(under_utilized),
            "under_utilized_districts": under_utilized,
            "insight": fund_insight
        },
        "recommendations": recommendations
    }


@router.get("/analytics")
def get_analytics(
    month: str = Query("June"),
    year: int = Query(2026),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve compiled aggregated charts, health analytics, and district performance datasets."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    dash = get_department_dashboard(preview=False, month=month, year=year, session=session, current_user=current_user)
    
    hospitals_count = len([p for p in dash.get("projects", []) if p.get("category") == "Hospitals"])
    phc_count = len([p for p in dash.get("projects", []) if p.get("category") == "Primary Health Centers"])
    icu_count = len([p for p in dash.get("projects", []) if p.get("category") == "ICU Units"])
    maternity_count = len([p for p in dash.get("projects", []) if p.get("category") == "Maternity Centers"])
    diag_count = len([p for p in dash.get("projects", []) if p.get("category") == "Diagnostics Centers"])
    procurement_count = len([p for p in dash.get("projects", []) if p.get("category") == "Ambulance Procurement"])
    specialty_count = len([p for p in dash.get("projects", []) if p.get("category") == "Specialty Clinics"])
    
    staff_availability = {
        "doctors_on_duty": 154,
        "doctors_total": 160,
        "nurses_on_duty": 340,
        "nurses_total": 355,
        "paramedical_active": 112,
        "paramedical_total": 118,
        "overall_rate": 96.2
    }
    
    material_stock = [
        {"item": "Essential Antibiotics", "stock": 85, "status": "Good", "unit": "vials"},
        {"item": "Oxygen Cylinders", "stock": 15, "status": "Critical", "unit": "cylinders"},
        {"item": "Surgical Kits", "stock": 40, "status": "Moderate", "unit": "kits"},
        {"item": "PPE Kits", "stock": 68, "status": "Good", "unit": "packs"},
        {"item": "Vaccine Vials (Universal)", "stock": 92, "status": "Good", "unit": "doses"},
    ]
    
    machinery_availability = [
        {"type": "Ambulances", "operational": 24, "maintenance": 2, "total": 26},
        {"type": "Ventilators", "operational": 45, "maintenance": 3, "total": 48},
        {"type": "MRI Scanners", "operational": 12, "maintenance": 1, "total": 13},
        {"type": "Ultrasound Machines", "operational": 38, "maintenance": 2, "total": 40},
        {"type": "Defibrillators", "operational": 55, "maintenance": 5, "total": 60},
    ]

    seed_data = _load_seed_json()
    
    reports = session.exec(select(HealthReport).options(selectinload(HealthReport.health_metrics)).where(HealthReport.status == "submitted")).all()
    if not reports:
        infra_list = [d.get("infrastructure", {}) for d in seed_data.get("district_data", [])]
        hosp_c = sum(i.get("hospitals", {}).get("completed", 0.0) for i in infra_list)
        hosp_o = sum(i.get("hospitals", {}).get("ongoing", 0.0) for i in infra_list)
        clinics_c = sum(i.get("clinics", {}).get("completed", 0.0) for i in infra_list)
        clinics_o = sum(i.get("clinics", {}).get("ongoing", 0.0) for i in infra_list)
        beds_c = sum(i.get("icu_beds", {}).get("completed", 0.0) for i in infra_list)
        beds_o = sum(i.get("icu_beds", {}).get("ongoing", 0.0) for i in infra_list)
        vents_c = sum(i.get("ventilators", {}).get("completed", 0.0) for i in infra_list)
        vents_o = sum(i.get("ventilators", {}).get("ongoing", 0.0) for i in infra_list)
        med_c = sum(i.get("medicine_stock", {}).get("completed", 0.0) for i in infra_list) / len(infra_list) if infra_list else 0.0
        med_o = 0.0
        imm_c = sum(i.get("immunization", {}).get("completed", 0.0) for i in infra_list) / len(infra_list) if infra_list else 0.0
        imm_o = 0.0
    else:
        hosp_c = sum(r.health_metrics.hospitals_completed for r in reports if r.health_metrics)
        hosp_o = sum(r.health_metrics.hospitals_ongoing for r in reports if r.health_metrics)
        clinics_c = sum(r.health_metrics.clinics_completed for r in reports if r.health_metrics)
        clinics_o = sum(r.health_metrics.clinics_ongoing for r in reports if r.health_metrics)
        beds_c = sum(r.health_metrics.icu_beds_completed for r in reports if r.health_metrics)
        beds_o = sum(r.health_metrics.icu_beds_ongoing for r in reports if r.health_metrics)
        vents_c = sum(r.health_metrics.ventilators_completed for r in reports if r.health_metrics)
        vents_o = sum(r.health_metrics.ventilators_ongoing for r in reports if r.health_metrics)
        med_c = sum(r.health_metrics.medicine_stock_completed for r in reports if r.health_metrics) / len(reports)
        med_o = sum(r.health_metrics.medicine_stock_ongoing for r in reports if r.health_metrics) / len(reports)
        imm_c = sum(r.health_metrics.immunization_completed for r in reports if r.health_metrics) / len(reports)
        imm_o = sum(r.health_metrics.immunization_ongoing for r in reports if r.health_metrics) / len(reports)

    infra_progress = [
        {"category": "Hospitals (no)", "completed": hosp_c, "ongoing": hosp_o},
        {"category": "Clinics (no)", "completed": clinics_c, "ongoing": clinics_o},
        {"category": "ICU Beds (no)", "completed": beds_c, "ongoing": beds_o},
        {"category": "Ventilators (no)", "completed": vents_c, "ongoing": vents_o},
        {"category": "Medicine Stock (%)", "completed": round(med_c, 1), "ongoing": round(med_o, 1)},
        {"category": "Immunization (%)", "completed": round(imm_c, 1), "ongoing": round(imm_o, 1)},
    ]

    return {
        "projects_by_district": dash["fund_management"]["district_utilization"],
        "budget_utilization": dash["fund_management"]["district_utilization"],
        "district_ranking": dash["district_scores"],
        "facilities": [
            {"category": "Hospitals", "count": hospitals_count if hospitals_count > 0 else 6, "metric": "assets"},
            {"category": "Clinics", "count": phc_count + specialty_count if (phc_count + specialty_count) > 0 else 18, "metric": "active"},
            {"category": "ICU Units", "count": icu_count if icu_count > 0 else 8, "metric": "equipped"},
            {"category": "Maternity", "count": maternity_count if maternity_count > 0 else 10, "metric": "centers"},
            {"category": "Diagnostics", "count": diag_count if diag_count > 0 else 12, "metric": "labs"},
            {"category": "Ambulances", "count": procurement_count if procurement_count > 0 else 24, "metric": "procured"},
        ],
        "staff_availability": staff_availability,
        "material_stock": material_stock,
        "machinery_availability": machinery_availability,
        "monthly_completion": [
            {"month": "Jan", "completed": 3},
            {"month": "Feb", "completed": 5},
            {"month": "Mar", "completed": 4},
            {"month": "Apr", "completed": 7},
            {"month": "May", "completed": 9},
            {"month": "Jun", "completed": 11},
        ],
        "delayed_projects": [
            {"district": d["district"], "delayed": len([p for p in dash["projects"] if p["district"] == d["district"] and p["status"] in ("Delayed", "Critical")])}
            for d in dash["district_scores"]
        ],
        "infrastructure_progress": infra_progress
    }


class DistrictMetricsUpdatePayload(BaseModel):
    district: str
    month: str
    year: int
    
    funds_allocated: float
    funds_released: float
    funds_spent: float
    
    hospitals_completed: float
    hospitals_ongoing: float
    clinics_completed: float
    clinics_ongoing: float
    icu_beds_completed: float
    icu_beds_ongoing: float
    ventilators_completed: float
    ventilators_ongoing: float
    medicine_stock_completed: float
    medicine_stock_ongoing: float
    immunization_completed: float
    immunization_ongoing: float


@router.get("/district-metrics")
def get_district_metrics(
    district: str = Query(...),
    month: str = Query("June"),
    year: int = Query(2026),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve dynamic health infrastructure metrics and fund management budgets for a district."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    if district == "All":
        total_allocated = 0.0
        total_released = 0.0
        total_spent = 0.0
        
        hosp_c = 0.0
        hosp_o = 0.0
        clinics_c = 0.0
        clinics_o = 0.0
        beds_c = 0.0
        beds_o = 0.0
        vents_c = 0.0
        vents_o = 0.0
        med_c = 0.0
        med_o = 0.0
        imm_c = 0.0
        imm_o = 0.0
        
        reports_in_db = session.exec(
            select(HealthReport)
            .options(
                selectinload(HealthReport.projects),
                selectinload(HealthReport.health_metrics)
            )
            .where(HealthReport.reporting_month == month)
            .where(HealthReport.reporting_year == year)
        ).all()
        draft_reports = {r.district_name: r for r in reports_in_db if r.status == "draft"}
        submitted_reports = {r.district_name: r for r in reports_in_db if r.status == "submitted"}

        count_reports = 0
        for d_name in DELHI_DISTRICTS:
            report = submitted_reports.get(d_name) or draft_reports.get(d_name)
            projects_db = report.projects if report else []
            funds_allocated = report.funds_allocated if (report and report.funds_allocated is not None) else sum(p.budget_allocated for p in projects_db)
            funds_released = report.funds_released if (report and report.funds_released is not None) else sum(p.budget_released for p in projects_db)
            funds_spent = report.funds_spent if (report and report.funds_spent is not None) else sum(p.budget_utilized for p in projects_db)
            
            infra = report.health_metrics if report else None
            
            total_allocated += funds_allocated
            total_released += funds_released
            total_spent += funds_spent
            
            if report:
                count_reports += 1
            hosp_c += infra.hospitals_completed if infra else 0.0
            hosp_o += infra.hospitals_ongoing if infra else 0.0
            clinics_c += infra.clinics_completed if infra else 0.0
            clinics_o += infra.clinics_ongoing if infra else 0.0
            beds_c += infra.icu_beds_completed if infra else 0.0
            beds_o += infra.icu_beds_ongoing if infra else 0.0
            vents_c += infra.ventilators_completed if infra else 0.0
            vents_o += infra.ventilators_ongoing if infra else 0.0
            med_c += infra.medicine_stock_completed if infra else 0.0
            med_o += infra.medicine_stock_ongoing if infra else 0.0
            imm_c += infra.immunization_completed if infra else 0.0
            imm_o += infra.immunization_ongoing if infra else 0.0
            
        div = count_reports if count_reports > 0 else len(DELHI_DISTRICTS)
        return {
            "district": "All",
            "funds_allocated": total_allocated,
            "funds_released": total_released,
            "funds_spent": total_spent,
            "funds_remaining": total_released - total_spent,
            "hospitals_completed": hosp_c,
            "hospitals_ongoing": hosp_o,
            "clinics_completed": clinics_c,
            "clinics_ongoing": clinics_o,
            "icu_beds_completed": beds_c,
            "icu_beds_ongoing": beds_o,
            "ventilators_completed": vents_c,
            "ventilators_ongoing": vents_o,
            "medicine_stock_completed": med_c / div,
            "medicine_stock_ongoing": med_o / div,
            "immunization_completed": imm_c / div,
            "immunization_ongoing": imm_o / div,
        }
    else:
        return _get_single_district_metrics(district, month, year, session)


def _get_single_district_metrics(district: str, month: str, year: int, session: Session):
    report = session.exec(
        select(HealthReport)
        .where(HealthReport.district_name == district)
        .where(HealthReport.reporting_month == month)
        .where(HealthReport.reporting_year == year)
        .where(HealthReport.status == "submitted")
    ).first()
    if not report:
        report = session.exec(
            select(HealthReport)
            .where(HealthReport.district_name == district)
            .where(HealthReport.reporting_month == month)
            .where(HealthReport.reporting_year == year)
            .where(HealthReport.status == "draft")
        ).first()

    projects_db = report.projects if report else []
    
    funds_allocated = report.funds_allocated if (report and report.funds_allocated is not None) else sum(p.budget_allocated for p in projects_db)
    funds_released = report.funds_released if (report and report.funds_released is not None) else sum(p.budget_released for p in projects_db)
    funds_spent = report.funds_spent if (report and report.funds_spent is not None) else sum(p.budget_utilized for p in projects_db)
    
    infra = report.health_metrics if report else None
    
    def get_infra_metrics(category):
        completed = len([p for p in projects_db if p.category == category and p.status == "Completed"])
        ongoing = len([p for p in projects_db if p.category == category and p.status != "Completed"])
        return completed, ongoing

    hosp_c, hosp_o = get_infra_metrics("Hospitals")
    clinics_c, clinics_o = get_infra_metrics("Primary Health Centers")
    beds_c, beds_o = get_infra_metrics("ICU Units")
    vents_c, vents_o = get_infra_metrics("Specialty Clinics")
    
    return {
        "district": district,
        "funds_allocated": funds_allocated,
        "funds_released": funds_released,
        "funds_spent": funds_spent,
        "funds_remaining": funds_released - funds_spent,
        
        "hospitals_completed": infra.hospitals_completed if (infra and infra.hospitals_completed is not None) else hosp_c,
        "hospitals_ongoing": infra.hospitals_ongoing if (infra and infra.hospitals_ongoing is not None) else hosp_o,
        
        "clinics_completed": infra.clinics_completed if (infra and infra.clinics_completed is not None) else clinics_c,
        "clinics_ongoing": infra.clinics_ongoing if (infra and infra.clinics_ongoing is not None) else clinics_o,
        
        "icu_beds_completed": infra.icu_beds_completed if (infra and infra.icu_beds_completed is not None) else beds_c,
        "icu_beds_ongoing": infra.icu_beds_ongoing if (infra and infra.icu_beds_ongoing is not None) else beds_o,
        
        "ventilators_completed": infra.ventilators_completed if (infra and infra.ventilators_completed is not None) else vents_c,
        "ventilators_ongoing": infra.ventilators_ongoing if (infra and infra.ventilators_ongoing is not None) else vents_o,
        
        "medicine_stock_completed": infra.medicine_stock_completed if (infra and infra.medicine_stock_completed is not None) else 80.0,
        "medicine_stock_ongoing": infra.medicine_stock_ongoing if (infra and infra.medicine_stock_ongoing is not None) else 0.0,
        
        "immunization_completed": infra.immunization_completed if (infra and infra.immunization_completed is not None) else 85.0,
        "immunization_ongoing": infra.immunization_ongoing if (infra and infra.immunization_ongoing is not None) else 0.0,
    }


@router.post("/district-metrics")
def update_district_metrics(
    payload: DistrictMetricsUpdatePayload,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Save manually updated health metrics and fund management override values to the database, logging to AuditTrail."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    district = payload.district
    month = payload.month
    year = payload.year
    
    report = session.exec(
        select(HealthReport)
        .where(HealthReport.district_name == district)
        .where(HealthReport.reporting_month == month)
        .where(HealthReport.reporting_year == year)
        .where(HealthReport.status == "submitted")
    ).first()
    if not report:
        report = session.exec(
            select(HealthReport)
            .where(HealthReport.district_name == district)
            .where(HealthReport.reporting_month == month)
            .where(HealthReport.reporting_year == year)
            .where(HealthReport.status == "draft")
        ).first()
        
    if not report:
        report = HealthReport(
            district_name=district,
            reporting_month=month,
            reporting_year=year,
            status="submitted",
            achievements="",
            challenges="",
            recommendations=""
        )
        session.add(report)
        session.commit()
        session.refresh(report)

    changes = []
    
    if report.funds_allocated != payload.funds_allocated:
        changes.append(f"Allocated Funds: {report.funds_allocated} -> {payload.funds_allocated}")
        report.funds_allocated = payload.funds_allocated
    if report.funds_released != payload.funds_released:
        changes.append(f"Released Funds: {report.funds_released} -> {payload.funds_released}")
        report.funds_released = payload.funds_released
    if report.funds_spent != payload.funds_spent:
        changes.append(f"Spent Funds: {report.funds_spent} -> {payload.funds_spent}")
        report.funds_spent = payload.funds_spent
        
    infra = report.health_metrics
    if not infra:
        infra = HealthMetric(report_id=report.id)
        session.add(infra)
        session.commit()
        session.refresh(infra)
        
    def check_and_update(field_name, new_val):
        old_val = getattr(infra, field_name)
        if old_val != new_val:
            changes.append(f"{field_name.replace('_', ' ').title()}: {old_val} -> {new_val}")
            setattr(infra, field_name, new_val)
            
    check_and_update("hospitals_completed", payload.hospitals_completed)
    check_and_update("hospitals_ongoing", payload.hospitals_ongoing)
    check_and_update("clinics_completed", payload.clinics_completed)
    check_and_update("clinics_ongoing", payload.clinics_ongoing)
    check_and_update("icu_beds_completed", payload.icu_beds_completed)
    check_and_update("icu_beds_ongoing", payload.icu_beds_ongoing)
    check_and_update("ventilators_completed", payload.ventilators_completed)
    check_and_update("ventilators_ongoing", payload.ventilators_ongoing)
    check_and_update("medicine_stock_completed", payload.medicine_stock_completed)
    check_and_update("medicine_stock_ongoing", payload.medicine_stock_ongoing)
    check_and_update("immunization_completed", payload.immunization_completed)
    check_and_update("immunization_ongoing", payload.immunization_ongoing)
    
    report.updated_at = datetime.now(timezone.utc)
    session.add(report)
    session.add(infra)
    
    if changes:
        log = AuditLog(
            officer=current_user.email,
            department="Department of Health & Family Welfare",
            district=district,
            module="Reports",
            action_type="Metrics Updated",
            remarks=f"Overridden metrics and funds updated: {', '.join(changes)}"
        )
        session.add(log)
        
    session.commit()
    return {"status": "ok", "message": "District metrics updated successfully"}


@router.get("/district-summary")
def get_district_summary(
    month: str = Query("June"),
    year: int = Query(2026),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Expose district-wise aggregated project records dynamically generated from database reports."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    try:
        stmt = select(HealthProject, HealthReport).join(HealthReport)
        results = session.exec(stmt).all()
        
        stmt_districts = select(HealthReport.district_name).distinct()
        db_districts = sorted(list(set(session.exec(stmt_districts).all())))
        if not db_districts:
            db_districts = DELHI_DISTRICTS
            
        projects_by_district = {name: [] for name in db_districts}
        for proj, report in results:
            dist_name = report.district_name
            if dist_name in projects_by_district:
                projects_by_district[dist_name].append(proj)
                
        reports_in_db = session.exec(
            select(HealthReport)
            .where(HealthReport.reporting_month == month)
            .where(HealthReport.reporting_year == year)
        ).all()
        draft_reports = {r.district_name: r for r in reports_in_db if r.status == "draft"}
        submitted_reports = {r.district_name: r for r in reports_in_db if r.status == "submitted"}

        district_data_list = []
        for i, dist_name in enumerate(db_districts):
            dist_id = f"DIST_{i+1:02d}"
            projs = projects_by_district.get(dist_name, [])
            
            report = submitted_reports.get(dist_name) or draft_reports.get(dist_name)
                
            funds_allocated = report.funds_allocated if (report and report.funds_allocated is not None) else sum(p.budget_allocated for p in projs)
            funds_released = report.funds_released if (report and report.funds_released is not None) else sum(p.budget_released for p in projs)
            funds_spent = report.funds_spent if (report and report.funds_spent is not None) else sum(p.budget_utilized for p in projs)
            
            total_projects = len(projs)
            projects_completed = sum(1 for p in projs if p.status == "Completed")
            projects_delayed = sum(1 for p in projs if p.status in ("Delayed", "Critical"))
            
            district_data_list.append({
                "district_id": dist_id,
                "district_name": dist_name,
                "funds_allocated": int(funds_allocated),
                "funds_released": int(funds_released),
                "funds_spent": int(funds_spent),
                "total_projects": total_projects,
                "projects_completed": projects_completed,
                "projects_delayed": projects_delayed,
                "status": report.status if report else "no_report"
            })
            
        stmt_report = select(HealthReport.updated_at)
        updated_times = session.exec(stmt_report).all()
        if updated_times:
            last_updated = max(updated_times).strftime("%Y-%m-%dT%H:%M:%SZ")
        else:
            last_updated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            
        return {
            "department": "Department of Health & Family Welfare",
            "last_updated": last_updated,
            "district_data": district_data_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate district summary: {str(e)}")


@router.get("/actions", response_model=List[ActionResponseSchema])
def get_actions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all action tracker instructions, joined with health project name."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    actions = session.exec(select(Action)).all()
    
    project_uids = [act.project_uid for act in actions]
    projects_map = {}
    if project_uids:
        projects_db = session.exec(select(HealthProject).where(HealthProject.project_uid.in_(project_uids))).all()
        projects_map = {p.project_uid: p.name for p in projects_db}

    response = []
    for act in actions:
        if not act.project_uid.startswith("HLT-"):
            continue  # Filter health-specific actions
        proj_name = projects_map.get(act.project_uid, "Unknown Project")
        response.append(
            ActionResponseSchema(
                action_uid=act.action_uid,
                title=act.title,
                description=act.description,
                assigned_by=act.assigned_by,
                assigned_to=act.assigned_to,
                district=act.district,
                project_uid=act.project_uid,
                project_name=proj_name,
                priority=act.priority,
                deadline=act.deadline,
                status=act.status,
                remarks=act.remarks,
                evidence_url=act.evidence_url,
                updated_at=act.updated_at
            )
        )
    return response


@router.put("/actions/{action_uid}", response_model=ActionResponseSchema)
def update_action(
    action_uid: str,
    payload: ActionUpdateSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update an action's status and details, and log the action status change to AuditLog."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    act = session.exec(select(Action).where(Action.action_uid == action_uid)).first()
    if not act:
        raise HTTPException(status_code=404, detail="Action not found")
    
    allowed_statuses = ["Assigned", "Accepted", "In Progress", "Completed", "Verified"]
    if payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {allowed_statuses}")
    
    prev_status = act.status
    act.status = payload.status
    if payload.remarks is not None:
        act.remarks = payload.remarks
    if payload.evidence_url is not None:
        act.evidence_url = payload.evidence_url
    
    act.updated_at = datetime.now(timezone.utc)
    session.add(act)
    
    log = AuditLog(
        officer=current_user.email,
        department="Department of Health & Family Welfare",
        district=act.district,
        module="Action Tracker",
        action_type="Action Status Updated",
        project_uid=act.project_uid,
        prev_value=prev_status,
        new_value=payload.status,
        remarks=f"Instruction '{act.title}' updated status from '{prev_status}' to '{payload.status}'."
    )
    session.add(log)
    
    session.commit()
    session.refresh(act)
    
    proj = session.exec(select(HealthProject).where(HealthProject.project_uid == act.project_uid)).first()
    proj_name = proj.name if proj else "Unknown Project"
    
    return ActionResponseSchema(
        action_uid=act.action_uid,
        title=act.title,
        description=act.description,
        assigned_by=act.assigned_by,
        assigned_to=act.assigned_to,
        district=act.district,
        project_uid=act.project_uid,
        project_name=proj_name,
        priority=act.priority,
        deadline=act.deadline,
        status=act.status,
        remarks=act.remarks,
        evidence_url=act.evidence_url,
        updated_at=act.updated_at
    )


@router.get("/audit-logs")
def get_audit_logs(
    officer: Optional[str] = Query(None),
    project_uid: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve health audit logs with search, filtering and pagination."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    
    stmt = select(AuditLog).where(AuditLog.department == "Department of Health & Family Welfare")
    
    if officer:
        stmt = stmt.where(AuditLog.officer.like(f"%{officer}%"))
    if project_uid:
        stmt = stmt.where(AuditLog.project_uid == project_uid)
    if date:
        try:
            dt = datetime.strptime(date, "%Y-%m-%d")
            start_dt = datetime(dt.year, dt.month, dt.day, 0, 0, 0, tzinfo=timezone.utc)
            end_dt = datetime(dt.year, dt.month, dt.day, 23, 59, 59, 999999, tzinfo=timezone.utc)
            stmt = stmt.where(AuditLog.timestamp >= start_dt).where(AuditLog.timestamp <= end_dt)
        except ValueError:
            pass
    if action_type and action_type != "All":
        stmt = stmt.where(AuditLog.action_type == action_type)
    if module and module != "All":
        stmt = stmt.where(AuditLog.module == module)
    if district and district != "All":
        stmt = stmt.where(AuditLog.district == district)
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            (AuditLog.officer.like(search_pattern)) |
            (AuditLog.project_uid.like(search_pattern)) |
            (AuditLog.remarks.like(search_pattern)) |
            (AuditLog.action_type.like(search_pattern)) |
            (AuditLog.module.like(search_pattern))
        )
        
    stmt = stmt.order_by(AuditLog.timestamp.desc())
    
    all_logs = session.exec(stmt).all()
    total = len(all_logs)
    
    offset = (page - 1) * limit
    paginated_logs = all_logs[offset : offset + limit]
    
    import math
    pages = math.ceil(total / limit) if limit > 0 else 1
    
    return {
        "logs": paginated_logs,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
    }
