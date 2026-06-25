"""Department Dashboard & Data Entry API using SQLite (SQLModel) as source of truth.

Endpoints:
  GET  /dashboard           – Live dashboard data  (?preview=true → draft data)
  GET  /admin               – Load draft / submitted data for form
  POST /draft               – Save draft data
  POST /submit              – Promote draft → live
"""

import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List, Dict

from fastapi import APIRouter, Query, HTTPException, Depends
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import get_current_user
from app.domain.models.user import User
from app.infrastructure.db.sqlite_client import get_session
from app.domain.models.department import DepartmentReport, InfrastructureMetric, Project, Action, AuditLog, ProjectEvidence, ProjectApproval, ProjectDelay, ProjectProgress
from app.api.v1.schemas.department_schemas import (
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

# ─── File Paths (Used for reading static/complaints layout metadata) ───
DATA_DIR = Path(__file__).resolve().parents[4] / "data"
PWD_SEED_FILE = DATA_DIR / "pwd.json"

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
    if PWD_SEED_FILE.exists():
        with open(PWD_SEED_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _get_district_report_from_db(
    district_name: str,
    month: str,
    year: int,
    preview: bool,
    session: Session
) -> Optional[DepartmentReport]:
    """Retrieve the report for a district, month, and year from database.
    If preview=True, prioritize draft status over submitted status.
    """
    if preview:
        # Check draft first
        report = session.exec(
            select(DepartmentReport)
            .where(DepartmentReport.district_name == district_name)
            .where(DepartmentReport.reporting_month == month)
            .where(DepartmentReport.reporting_year == year)
            .where(DepartmentReport.status == "draft")
        ).first()
        if report:
            return report

    # Check submitted
    return session.exec(
        select(DepartmentReport)
        .where(DepartmentReport.district_name == district_name)
        .where(DepartmentReport.reporting_month == month)
        .where(DepartmentReport.reporting_year == year)
        .where(DepartmentReport.status == "submitted")
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
    
    # Query existing actions for this project
    existing_actions = session.exec(
        select(Action).where(Action.project_uid == project_uid)
    ).all()
    
    existing_map = {act.title: act for act in existing_actions}
    incoming_names = {t.get("name") for t in tasks if t.get("name")}
    
    # 1. Delete actions that are no longer in the incoming tasks list
    for name, act in list(existing_map.items()):
        if name not in incoming_names:
            session.delete(act)
            
    # 2. Add or update incoming tasks
    for task in tasks:
        title = task.get("name")
        if not title:
            continue
            
        stage = task.get("stage") or task.get("status") or "Assigned"
        deadline = task.get("deadline") or project_deadline
        
        act = existing_map.get(title)
        if act:
            # Update metadata but preserve workflow status and details
            act.deadline = deadline
            act.assigned_to = officer or "Er. Rajesh Kumar"
            act.priority = priority or "Medium"
            session.add(act)
        else:
            # Create new action with a unique action_uid
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
                description=f"Action item for PWD project: {project_name}",
                assigned_by="PWD Headquarters",
                assigned_to=officer or "Er. Rajesh Kumar",
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

        # If we are submitting, we promote/overwrite. Let's delete the corresponding
        # draft report if it exists so we don't have dangling drafts.
        if status == "submitted":
            old_draft = session.exec(
                select(DepartmentReport)
                .where(DepartmentReport.district_name == district_name)
                .where(DepartmentReport.reporting_month == reporting_month)
                .where(DepartmentReport.reporting_year == reporting_year)
                .where(DepartmentReport.status == "draft")
            ).first()
            if old_draft:
                session.delete(old_draft)

        # Check if a report with target status already exists
        report = session.exec(
            select(DepartmentReport)
            .where(DepartmentReport.district_name == district_name)
            .where(DepartmentReport.reporting_month == reporting_month)
            .where(DepartmentReport.reporting_year == reporting_year)
            .where(DepartmentReport.status == status)
        ).first()

        if not report:
            report = DepartmentReport(
                district_name=district_name,
                reporting_month=reporting_month,
                reporting_year=reporting_year,
                status=status
            )

        # Update core report fields
        report.achievements = dist.officer_notes.remarks
        report.challenges = dist.officer_notes.risks
        report.recommendations = dist.officer_notes.recommendations
        report.updated_at = now
        report.updated_by = "officer@innovateindia.gov"

        session.add(report)
        session.commit()
        session.refresh(report)

        # Update infrastructure metrics
        infra = session.exec(
            select(InfrastructureMetric)
            .where(InfrastructureMetric.report_id == report.id)
        ).first()

        if not infra:
            infra = InfrastructureMetric(report_id=report.id)

        infra.roads_completed = dist.infrastructure.roads.completed
        infra.roads_ongoing = dist.infrastructure.roads.ongoing
        infra.flyovers_completed = dist.infrastructure.flyovers.completed
        infra.flyovers_ongoing = dist.infrastructure.flyovers.ongoing
        infra.bridges_completed = dist.infrastructure.bridges.completed
        infra.bridges_ongoing = dist.infrastructure.bridges.ongoing
        infra.buildings_completed = dist.infrastructure.buildings.completed
        infra.buildings_ongoing = dist.infrastructure.buildings.ongoing
        infra.drainage_completed = dist.infrastructure.drainage.completed
        infra.drainage_ongoing = dist.infrastructure.drainage.ongoing
        infra.lighting_completed = dist.infrastructure.lighting.completed
        infra.lighting_ongoing = dist.infrastructure.lighting.ongoing

        session.add(infra)

        # Update projects (delete existing and replace, but track changes first)
        existing_projects = session.exec(
            select(Project)
            .where(Project.report_id == report.id)
        ).all()
        
        existing_map = {p.project_uid: p for p in existing_projects}
        incoming_uids = {p.id for p in dist.projects.list}
        
        # Log deletions
        for uid, p in existing_map.items():
            if uid not in incoming_uids:
                log = AuditLog(
                    officer="officer@innovateindia.gov",
                    department="Public Works Department (PWD)",
                    district=district_name,
                    module="Projects",
                    action_type="Project Deleted",
                    project_uid=uid,
                    prev_value=p.name,
                    new_value=None,
                    remarks=f"Project '{p.name}' deleted from report."
                )
                session.add(log)
                
                # Delete actions associated with the deleted project
                project_actions = session.exec(select(Action).where(Action.project_uid == uid)).all()
                for pa in project_actions:
                    session.delete(pa)

        for proj in dist.projects.list:
            old_p = existing_map.get(proj.id)
            if old_p:
                # Compare fields and write AuditLog if changed
                if old_p.progress != proj.progress:
                    log = AuditLog(
                        officer="officer@innovateindia.gov",
                        department="Public Works Department (PWD)",
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
                        officer="officer@innovateindia.gov",
                        department="Public Works Department (PWD)",
                        district=district_name,
                        module="Projects",
                        action_type="Status Changed",
                        project_uid=proj.id,
                        prev_value=old_p.status,
                        new_value=proj.status,
                        remarks=f"Status updated to {proj.status}."
                    )
                    session.add(log)
                
                # Check for budget changes
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
                        officer="officer@innovateindia.gov",
                        department="Public Works Department (PWD)",
                        district=district_name,
                        module="Funds",
                        action_type="Budget Updated",
                        project_uid=proj.id,
                        prev_value=", ".join(prev_budget_str),
                        new_value=", ".join(new_budget_str),
                        remarks=f"Budgets updated for project {proj.name}."
                    )
                    session.add(log)

                # Check general metadata changes
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
                        officer="officer@innovateindia.gov",
                        department="Public Works Department (PWD)",
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
                # New project added
                log = AuditLog(
                    officer="officer@innovateindia.gov",
                    department="Public Works Department (PWD)",
                    district=district_name,
                    module="Projects",
                    action_type="Project Created",
                    project_uid=proj.id,
                    prev_value=None,
                    new_value=proj.name,
                    remarks=f"New project '{proj.name}' created/added to report."
                )
                session.add(log)

        # Clear old projects and write new
        for ep in existing_projects:
            session.delete(ep)

        for proj in dist.projects.list:
            evidence_photo_url = proj.evidence.photo_url if proj.evidence else None
            evidence_gps = proj.evidence.gps if proj.evidence else None
            evidence_timestamp = proj.evidence.timestamp if proj.evidence else None
            evidence_remarks = proj.evidence.remarks if proj.evidence else None

            # Keep manual progress value when saving draft/submitting report
            calculated_progress = proj.progress

            db_proj = Project(
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

            # Sync Actions table for this project
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

        # Log Draft Saved or Report Submitted (one per district report)
        action_type = "Draft Saved" if status == "draft" else "Report Submitted"
        log = AuditLog(
            officer="officer@innovateindia.gov",
            department="Public Works Department (PWD)",
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
    """Compile and return the full dashboard payload from the SQLite database."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    now_iso = datetime.now(timezone.utc).isoformat() + "Z"
    seed_data = _load_seed_json()

    # Base shell matching dashboard expectation
    dashboard_payload = {
        "department": "Public Works Department (PWD)",
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

    # Aggregate lists
    all_projects = []
    total_fund_allocated = 0
    total_fund_released = 0
    total_fund_utilized = 0
    district_scores = []
    district_utilization = []

    # Map static complaints / backlog / monthly spending trends from seed
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

    # Batch retrieve all reports for the given month and year to avoid N+1 query loops
    reports_in_db = session.exec(
        select(DepartmentReport)
        .options(
            selectinload(DepartmentReport.projects),
            selectinload(DepartmentReport.infra_metrics)
        )
        .where(DepartmentReport.reporting_month == month)
        .where(DepartmentReport.reporting_year == year)
    ).all()

    draft_reports = {r.district_name: r for r in reports_in_db if r.status == "draft"}
    submitted_reports = {r.district_name: r for r in reports_in_db if r.status == "submitted"}

    # Map each district to its active report (respecting preview mode)
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

    # Batch retrieve all Actions for the collected projects to prevent N+1 query loops
    project_uids = [p.project_uid for p in all_projects_db]
    actions_map = {}
    if project_uids:
        all_actions = session.exec(
            select(Action).where(Action.project_uid.in_(project_uids))
        ).all()
        for act in all_actions:
            actions_map.setdefault(act.project_uid, []).append(act)

    # Retrieve reports for each district
    for dist_name in DELHI_DISTRICTS:
        report = reports_map.get(dist_name)
        seed_dist = next((d for d in seed_data.get("district_data", []) if d.get("district_name") == dist_name), {})

        # Load projects dynamically from DB associated with this specific report
        projects_db = report.projects if report else []

        # Calculate budgets from report overrides if set, otherwise from projects_db
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

        # Calculate score
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

        # Merge administrative backlog
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

    # Compile Final KPIs
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
        "open_tasks": len([p for p in all_projects if p["status"] != "Completed"]) * 2,  # Mocked count
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
    """Return the PWD monthly report draft or baseline state for data entry."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    seed_data = _load_seed_json()

    # Form expects the full PWDDataFileSchema layout
    form_data = {
        "metadata": {
            "version": "1.0",
            "updated_by": "officer@innovateindia.gov",
            "last_updated": datetime.now(timezone.utc).isoformat() + "Z",
        },
        "department": "Public Works Department (PWD)",
        "reporting_month": month,
        "reporting_year": year,
        "district_data": [],
    }

    # Batch retrieve all reports for the given month and year to avoid N+1 query loops
    reports_in_db = session.exec(
        select(DepartmentReport)
        .options(
            selectinload(DepartmentReport.projects),
            selectinload(DepartmentReport.infra_metrics)
        )
        .where(DepartmentReport.reporting_month == month)
        .where(DepartmentReport.reporting_year == year)
    ).all()

    draft_reports = {r.district_name: r for r in reports_in_db if r.status == "draft"}
    submitted_reports = {r.district_name: r for r in reports_in_db if r.status == "submitted"}

    # Map each district to its active report (prefer draft for admin view)
    reports_map = {}
    all_projects_db = []
    for dist_name in DELHI_DISTRICTS:
        report = draft_reports.get(dist_name) or submitted_reports.get(dist_name)
        reports_map[dist_name] = report
        if report:
            all_projects_db.extend(report.projects)

    # Batch retrieve Actions
    project_uids = [p.project_uid for p in all_projects_db]
    actions_map = {}
    if project_uids:
        all_actions = session.exec(
            select(Action).where(Action.project_uid.in_(project_uids))
        ).all()
        for act in all_actions:
            actions_map.setdefault(act.project_uid, []).append(act)

    # Fetch district data from SQLite, fall back to seed JSON if not in database
    for dist_name in DELHI_DISTRICTS:
        report = reports_map.get(dist_name)
        seed_dist = next((d for d in seed_data.get("district_data", []) if d.get("district_name") == dist_name), {})

        if report:
            # Map report from DB
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

            infra_db = report.infra_metrics
            infra_data = {
                "roads": {"completed": infra_db.roads_completed if infra_db else 0.0, "ongoing": infra_db.roads_ongoing if infra_db else 0.0},
                "flyovers": {"completed": infra_db.flyovers_completed if infra_db else 0.0, "ongoing": infra_db.flyovers_ongoing if infra_db else 0.0},
                "bridges": {"completed": infra_db.bridges_completed if infra_db else 0.0, "ongoing": infra_db.bridges_ongoing if infra_db else 0.0},
                "buildings": {"completed": infra_db.buildings_completed if infra_db else 0.0, "ongoing": infra_db.buildings_ongoing if infra_db else 0.0},
                "drainage": {"completed": infra_db.drainage_completed if infra_db else 0.0, "ongoing": infra_db.drainage_ongoing if infra_db else 0.0},
                "lighting": {"completed": infra_db.lighting_completed if infra_db else 0.0, "ongoing": infra_db.lighting_ongoing if infra_db else 0.0},
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
            # Use seed JSON data
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


# ─────────────────────────────────────────────
# Project Management CRUD & Action Endpoints
# ─────────────────────────────────────────────

@router.get("/projects")
def get_projects(
    search: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all projects with search and filters."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    stmt = select(Project).options(selectinload(Project.report))
    projects = session.exec(stmt).all()
    
    # Filter by district
    if district and district != "All":
        projects = [p for p in projects if p.report and p.report.district_name == district]
        
    # Filter by status
    if status and status != "All":
        projects = [p for p in projects if p.status == status]
        
    # Search filter
    if search:
        s = search.lower()
        projects = [
            p for p in projects
            if s in p.name.lower() or s in p.project_uid.lower() or (p.officer_in_charge and s in p.officer_in_charge.lower())
        ]
        
    # Batch query evidences, approvals, delays, and progress updates to resolve N+1 queries
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

    # Convert database models to response format
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

        # Build fallback evidence if evidence list is empty but project has fields
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
    """Create a new project linked to a district report, logging to AuditTrail."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    # Find or create report
    report = session.exec(
        select(DepartmentReport)
        .where(DepartmentReport.district_name == payload.district)
        .where(DepartmentReport.reporting_month == payload.reporting_month)
        .where(DepartmentReport.reporting_year == payload.reporting_year)
        .where(DepartmentReport.status == "submitted")
    ).first()
    if not report:
        report = session.exec(
            select(DepartmentReport)
            .where(DepartmentReport.district_name == payload.district)
            .where(DepartmentReport.reporting_month == payload.reporting_month)
            .where(DepartmentReport.reporting_year == payload.reporting_year)
            .where(DepartmentReport.status == "draft")
        ).first()
    if not report:
        # Create a submitted report
        report = DepartmentReport(
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

        # Create infrastructure metrics
        infra = InfrastructureMetric(report_id=report.id)
        session.add(infra)
        session.commit()

    # Generate sequential project UID (PWD-XXX)
    existing_p = session.exec(select(Project)).all()
    max_num = 0
    for p in existing_p:
        if p.project_uid.startswith("PWD-"):
            try:
                num = int(p.project_uid.split("-")[1])
                if num > max_num:
                    max_num = num
            except Exception:
                pass
    project_uid = f"PWD-{max_num + 1:03d}"

    db_proj = Project(
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

    # Seed default actions for the newly created project
    default_tasks = [
        {"name": "Initial Site Inspection & Survey", "stage": "Assigned", "deadline": payload.deadline},
        {"name": "Civil Construction Work", "stage": "Assigned", "deadline": payload.deadline},
        {"name": "Final Quality Control Inspection", "stage": "Assigned", "deadline": payload.deadline}
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

    # Log to Audit Trail
    log = AuditLog(
        officer=current_user.email,
        department="Public Works Department (PWD)",
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
        select(Project).where(Project.project_uid == project_uid)
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Record changes
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

    if changes or payload.evidence:  # Commit if changes list is not empty or evidence payload was sent
        session.add(project)

        # If project is marked Completed or progress is 100%, update all actions to Completed
        if project.status == "Completed" or project.progress == 100:
            actions = session.exec(select(Action).where(Action.project_uid == project_uid)).all()
            for act in actions:
                if act.status not in ("Completed", "Verified"):
                    prev_status = act.status
                    act.status = "Completed"
                    act.updated_at = datetime.now(timezone.utc)
                    session.add(act)
                    
                    # Add Audit Log entry for the action status update
                    log_act = AuditLog(
                        officer=current_user.email,
                        department="Public Works Department (PWD)",
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
            department="Public Works Department (PWD)",
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
    """Delete a project, logging to AuditTrail."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    project = session.exec(
        select(Project).where(Project.project_uid == project_uid)
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    district = project.report.district_name
    name = project.name
    session.delete(project)

    # Log to Audit Trail
    log = AuditLog(
        officer=current_user.email,
        department="Public Works Department (PWD)",
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
    """Perform action on project (Update Progress, Upload Evidence, Request Approval, Flag Delay) and log to AuditTrail."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    project = session.exec(
        select(Project).where(Project.project_uid == project_uid)
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
            # Auto-complete associated actions
            actions = session.exec(select(Action).where(Action.project_uid == project_uid)).all()
            for act in actions:
                if act.status not in ("Completed", "Verified"):
                    prev_act_status = act.status
                    act.status = "Completed"
                    act.updated_at = datetime.now(timezone.utc)
                    session.add(act)
                    # Log action update
                    log_act = AuditLog(
                        officer=current_user.email,
                        department="Public Works Department (PWD)",
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

        # Store progress history
        prog_record = ProjectProgress(
            project_uid=project_uid,
            progress=payload.progress,
            remarks=payload.remarks or "",
            timestamp=payload.timestamp or datetime.now(timezone.utc).isoformat()
        )
        session.add(prog_record)

        log = AuditLog(
            officer=current_user.email,
            department="Public Works Department (PWD)",
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
        # Keep project-level fields updated for backward compatibility
        project.evidence_photo_url = payload.photo_url
        project.evidence_gps = payload.gps
        project.evidence_timestamp = payload.timestamp or datetime.now(timezone.utc).isoformat()
        project.evidence_remarks = payload.remarks
        session.add(project)

        # Store to ProjectEvidence table (multiple allowed)
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
            department="Public Works Department (PWD)",
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
        approver_val = payload.approver or "Department Officer"
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
            department="Public Works Department (PWD)",
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
        delay_reason = payload.reason or "Labour Shortage"
        revised_deadline = payload.revised_deadline or project.deadline
        remarks_val = payload.remarks or "Delay flagged"
        
        project.status = payload.status or "Delayed"
        if payload.remarks:
            project.remarks = payload.remarks
        session.add(project)

        # Store to ProjectDelay table
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
            department="Public Works Department (PWD)",
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



# ─────────────────────────────────────────────
# Phase 3 REST API Endpoints
# ─────────────────────────────────────────────

from pydantic import BaseModel


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
            # Remove DeepSeek thinking block if present
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
    """Generate rule-based AI executive department summaries based on active SQLite records."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    dash = get_department_dashboard(preview=False, month=month, year=year, session=session, current_user=current_user)
    seed_data = _load_seed_json()
    all_projects = []
    district_utilization = []
    delayed_by_district = {}
    backlog_by_district = {}
    
    # Batch retrieve all submitted reports for this month and year to avoid N+1 query loop
    reports_in_db = session.exec(
        select(DepartmentReport)
        .options(selectinload(DepartmentReport.projects))
        .where(DepartmentReport.reporting_month == month)
        .where(DepartmentReport.reporting_year == year)
        .where(DepartmentReport.status == "submitted")
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
                proj_obj = Project(
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
    
    # Delayed projects list details
    delayed_list = [p for p in all_projects if p.status in ("Delayed", "Critical")]
    
    # Complaints trends calculation
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
    
    # Generate recommendations and run local LLM
    delayed_projects_text = ""
    for idx, p in enumerate(delayed_list):
        delayed_projects_text += f"- {p.name} ({getattr(p, 'district_name', 'Unknown')}): Status is '{p.status}' with {p.progress}% progress. Officer: {p.officer_in_charge}.\n"
    if not delayed_projects_text:
        delayed_projects_text = "No delayed or critical projects."

    under_utilized_str = ", ".join(under_utilized) if under_utilized else "None"
    high_spending_str = ", ".join(high_spending) if high_spending else "None"

    prompt = f"""You are AAkar AI, an advanced governance AI assistant for the Government of NCT of Delhi.
Analyze the following Public Works Department (PWD) real-time data for {month} {year} and generate a concise department summary.

DATA:
1. Projects Overview:
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
    
    # Defaults / Rule-based Fallbacks
    delayed_insight = f"{len(delayed_list)} PWD projects are currently delayed or critical. Immediate oversight is required for {', '.join(set(getattr(p, 'district_name', 'Unknown') for p in delayed_list[:3]))}." if delayed_list else "All active PWD projects are on schedule."
    complaint_insight = f"Civic complaints stand at {total_c} with {open_c} open. Surges identified in '{top_cat}' ({top_cat_count} reports)." if total_c > 0 else "No active civic complaints registered."
    fund_insight = f"Overall budget utilization is at {utilization_pct}%. Low fund deployment (<40%) in: {', '.join(under_utilized)}." if under_utilized else f"Budget deployment is optimal at {utilization_pct}% across all districts."
    
    recommendations = []
    worst_delayed_district = max(delayed_by_district, key=delayed_by_district.get) if delayed_by_district else None
    if worst_delayed_district and delayed_by_district[worst_delayed_district] > 0:
        recommendations.append(f"Increase project monitoring and allocate emergency recovery resources in {worst_delayed_district} (due to {delayed_by_district[worst_delayed_district]} delayed/critical projects).")
    else:
        recommendations.append("All active PWD projects are generally on track; maintain current construction pacing.")
        
    worst_backlog_district = max(backlog_by_district, key=backlog_by_district.get) if backlog_by_district else None
    if worst_backlog_district and backlog_by_district[worst_backlog_district] > 10:
        recommendations.append(f"Deploy administrative taskforce to {worst_backlog_district} to clear the pending backlog of {backlog_by_district[worst_backlog_district]} cases.")
        
    if under_utilized:
        recommendations.append(f"Audit and expedite fund utilization for under-performing projects in {', '.join(under_utilized[:2])} (utilization < 40%).")
    if high_spending:
        recommendations.append(f"Perform fiscal review and release additional contingent funds for high-performing districts: {', '.join(high_spending[:2])}.")
        
    if open_c > 0:
        recommendations.append(f"Direct maintenance division to prioritize resolving open '{top_cat}' complaints (currently {top_cat_count} cases).")

    # If LLM response succeeded, parse and overwrite
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
                    # Strip leading numbers or list bullets
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
    """Retrieve compiled aggregated charts, PWD analytics, and district performance datasets."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    dash = get_department_dashboard(preview=False, month=month, year=year, session=session, current_user=current_user)
    
    # 1. PWD Facilities / Work Sites
    # Roads, Flyovers, Bridges, Buildings, Drainage, Lighting
    roads_count = len([p for p in dash.get("projects", []) if p.get("category") == "Roads"])
    flyovers_count = len([p for p in dash.get("projects", []) if p.get("category") == "Flyovers"])
    bridges_count = len([p for p in dash.get("projects", []) if p.get("category") == "Bridges"])
    buildings_count = len([p for p in dash.get("projects", []) if p.get("category") == "Buildings"])
    drainage_count = len([p for p in dash.get("projects", []) if p.get("category") == "Drainage"])
    lighting_count = len([p for p in dash.get("projects", []) if p.get("category") == "Lighting"])
    
    # 2. Officer/Staff Availability
    staff_availability = {
        "engineers_on_duty": 42,
        "engineers_total": 45,
        "inspectors_on_duty": 88,
        "inspectors_total": 95,
        "contractors_active": 24,
        "contractors_total": 26,
        "overall_rate": 93.4
    }
    
    # 3. Material Stock Level (%)
    material_stock = [
        {"item": "Asphalt / Bitumen", "stock": 82, "status": "Good", "unit": "metric tons"},
        {"item": "Portland Cement", "stock": 18, "status": "Critical", "unit": "bags"},
        {"item": "Reinforced Steel Bars", "stock": 45, "status": "Moderate", "unit": "metric tons"},
        {"item": "Drainage Pipes (HPDE)", "stock": 64, "status": "Good", "unit": "meters"},
        {"item": "LED Streetlight Luminaires", "stock": 35, "status": "Moderate", "unit": "units"},
    ]
    
    # 4. Machinery & Fleet Availability
    machinery_availability = [
        {"type": "Road Rollers", "operational": 18, "maintenance": 2, "total": 20},
        {"type": "Excavators", "operational": 14, "maintenance": 1, "total": 15},
        {"type": "Asphalt Pavers", "operational": 8, "maintenance": 2, "total": 10},
        {"type": "Dumper Trucks", "operational": 29, "maintenance": 3, "total": 32},
        {"type": "Mobile Cranes", "operational": 6, "maintenance": 0, "total": 6},
    ]

    seed_data = _load_seed_json()
    
    # Get from DB reports (eager load infra_metrics to avoid N+1 query loop)
    reports = session.exec(select(DepartmentReport).options(selectinload(DepartmentReport.infra_metrics)).where(DepartmentReport.status == "submitted")).all()
    if not reports:
        # Fall back to seed data
        infra_list = [d.get("infrastructure", {}) for d in seed_data.get("district_data", [])]
        roads_c = sum(i.get("roads", {}).get("completed", 0.0) for i in infra_list)
        roads_o = sum(i.get("roads", {}).get("ongoing", 0.0) for i in infra_list)
        flyovers_c = sum(i.get("flyovers", {}).get("completed", 0.0) for i in infra_list)
        flyovers_o = sum(i.get("flyovers", {}).get("ongoing", 0.0) for i in infra_list)
        bridges_c = sum(i.get("bridges", {}).get("completed", 0.0) for i in infra_list)
        bridges_o = sum(i.get("bridges", {}).get("ongoing", 0.0) for i in infra_list)
        buildings_c = sum(i.get("buildings", {}).get("completed", 0.0) for i in infra_list)
        buildings_o = sum(i.get("buildings", {}).get("ongoing", 0.0) for i in infra_list)
        drainage_c = sum(i.get("drainage", {}).get("completed", 0.0) for i in infra_list)
        drainage_o = sum(i.get("drainage", {}).get("ongoing", 0.0) for i in infra_list)
        lighting_c = sum(i.get("lighting", {}).get("completed", 0.0) for i in infra_list)
        lighting_o = sum(i.get("lighting", {}).get("ongoing", 0.0) for i in infra_list)
    else:
        roads_c = sum(r.infra_metrics.roads_completed for r in reports if r.infra_metrics)
        roads_o = sum(r.infra_metrics.roads_ongoing for r in reports if r.infra_metrics)
        flyovers_c = sum(r.infra_metrics.flyovers_completed for r in reports if r.infra_metrics)
        flyovers_o = sum(r.infra_metrics.flyovers_ongoing for r in reports if r.infra_metrics)
        bridges_c = sum(r.infra_metrics.bridges_completed for r in reports if r.infra_metrics)
        bridges_o = sum(r.infra_metrics.bridges_ongoing for r in reports if r.infra_metrics)
        buildings_c = sum(r.infra_metrics.buildings_completed for r in reports if r.infra_metrics)
        buildings_o = sum(r.infra_metrics.buildings_ongoing for r in reports if r.infra_metrics)
        drainage_c = sum(r.infra_metrics.drainage_completed for r in reports if r.infra_metrics)
        drainage_o = sum(r.infra_metrics.drainage_ongoing for r in reports if r.infra_metrics)
        lighting_c = sum(r.infra_metrics.lighting_completed for r in reports if r.infra_metrics)
        lighting_o = sum(r.infra_metrics.lighting_ongoing for r in reports if r.infra_metrics)

    infra_progress = [
        {"category": "Roads (km)", "completed": roads_c, "ongoing": roads_o},
        {"category": "Flyovers (no)", "completed": flyovers_c, "ongoing": flyovers_o},
        {"category": "Bridges (no)", "completed": bridges_c, "ongoing": bridges_o},
        {"category": "Buildings (no)", "completed": buildings_c, "ongoing": buildings_o},
        {"category": "Drainage (km)", "completed": drainage_c, "ongoing": drainage_o},
        {"category": "Lighting (pts)", "completed": lighting_c, "ongoing": lighting_o},
    ]

    return {
        "projects_by_district": dash["fund_management"]["district_utilization"],
        "budget_utilization": dash["fund_management"]["district_utilization"],
        "district_ranking": dash["district_scores"],
        "facilities": [
            {"category": "Roads", "count": roads_count if roads_count > 0 else 12, "metric": "km maintained"},
            {"category": "Flyovers", "count": flyovers_count if flyovers_count > 0 else 5, "metric": "active"},
            {"category": "Bridges", "count": bridges_count if bridges_count > 0 else 3, "metric": "active"},
            {"category": "Buildings", "count": buildings_count if buildings_count > 0 else 8, "metric": "public assets"},
            {"category": "Drainage", "count": drainage_count if drainage_count > 0 else 14, "metric": "km network"},
            {"category": "Lighting", "count": lighting_count if lighting_count > 0 else 20, "metric": "points"},
        ],
        "staff_availability": staff_availability,
        "material_stock": material_stock,
        "machinery_availability": machinery_availability,
        "monthly_completion": [
            {"month": "Jan", "completed": 2},
            {"month": "Feb", "completed": 4},
            {"month": "Mar", "completed": 6},
            {"month": "Apr", "completed": 8},
            {"month": "May", "completed": 10},
            {"month": "Jun", "completed": 12},
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
    
    roads_completed: float
    roads_ongoing: float
    flyovers_completed: float
    flyovers_ongoing: float
    bridges_completed: float
    bridges_ongoing: float
    buildings_completed: float
    buildings_ongoing: float
    drainage_completed: float
    drainage_ongoing: float
    lighting_completed: float
    lighting_ongoing: float


@router.get("/district-metrics")
def get_district_metrics(
    district: str = Query(...),
    month: str = Query("June"),
    year: int = Query(2026),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve overridden or dynamic infrastructure metrics and fund management budgets for a district."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    # If district is "All", aggregate values of all districts
    if district == "All":
        total_allocated = 0.0
        total_released = 0.0
        total_spent = 0.0
        
        roads_c = 0.0
        roads_o = 0.0
        flyovers_c = 0.0
        flyovers_o = 0.0
        bridges_c = 0.0
        bridges_o = 0.0
        buildings_c = 0.0
        buildings_o = 0.0
        drainage_c = 0.0
        drainage_o = 0.0
        lighting_c = 0.0
        lighting_o = 0.0
        
        # Batch query reports with projects and infra_metrics to avoid N+1 query loop
        reports_in_db = session.exec(
            select(DepartmentReport)
            .options(
                selectinload(DepartmentReport.projects),
                selectinload(DepartmentReport.infra_metrics)
            )
            .where(DepartmentReport.reporting_month == month)
            .where(DepartmentReport.reporting_year == year)
        ).all()
        draft_reports = {r.district_name: r for r in reports_in_db if r.status == "draft"}
        submitted_reports = {r.district_name: r for r in reports_in_db if r.status == "submitted"}

        for d_name in DELHI_DISTRICTS:
            report = submitted_reports.get(d_name) or draft_reports.get(d_name)
            projects_db = report.projects if report else []
            funds_allocated = report.funds_allocated if (report and report.funds_allocated is not None) else sum(p.budget_allocated for p in projects_db)
            funds_released = report.funds_released if (report and report.funds_released is not None) else sum(p.budget_released for p in projects_db)
            funds_spent = report.funds_spent if (report and report.funds_spent is not None) else sum(p.budget_utilized for p in projects_db)
            
            infra = report.infra_metrics if report else None
            
            total_allocated += funds_allocated
            total_released += funds_released
            total_spent += funds_spent
            
            roads_c += infra.roads_completed if infra else 0.0
            roads_o += infra.roads_ongoing if infra else 0.0
            flyovers_c += infra.flyovers_completed if infra else 0.0
            flyovers_o += infra.flyovers_ongoing if infra else 0.0
            bridges_c += infra.bridges_completed if infra else 0.0
            bridges_o += infra.bridges_ongoing if infra else 0.0
            buildings_c += infra.buildings_completed if infra else 0.0
            buildings_o += infra.buildings_ongoing if infra else 0.0
            drainage_c += infra.drainage_completed if infra else 0.0
            drainage_o += infra.drainage_ongoing if infra else 0.0
            lighting_c += infra.lighting_completed if infra else 0.0
            lighting_o += infra.lighting_ongoing if infra else 0.0
            
        return {
            "district": "All",
            "funds_allocated": total_allocated,
            "funds_released": total_released,
            "funds_spent": total_spent,
            "funds_remaining": total_released - total_spent,
            "roads_completed": roads_c,
            "roads_ongoing": roads_o,
            "flyovers_completed": flyovers_c,
            "flyovers_ongoing": flyovers_o,
            "bridges_completed": bridges_c,
            "bridges_ongoing": bridges_o,
            "buildings_completed": buildings_c,
            "buildings_ongoing": buildings_o,
            "drainage_completed": drainage_c,
            "drainage_ongoing": drainage_o,
            "lighting_completed": lighting_c,
            "lighting_ongoing": lighting_o,
        }
    else:
        return _get_single_district_metrics(district, month, year, session)


def _get_single_district_metrics(district: str, month: str, year: int, session: Session):
    # Find report
    report = session.exec(
        select(DepartmentReport)
        .where(DepartmentReport.district_name == district)
        .where(DepartmentReport.reporting_month == month)
        .where(DepartmentReport.reporting_year == year)
        .where(DepartmentReport.status == "submitted")
    ).first()
    if not report:
        report = session.exec(
            select(DepartmentReport)
            .where(DepartmentReport.district_name == district)
            .where(DepartmentReport.reporting_month == month)
            .where(DepartmentReport.reporting_year == year)
            .where(DepartmentReport.status == "draft")
        ).first()

    projects_db = report.projects if report else []
    
    # Funds calculation
    funds_allocated = report.funds_allocated if (report and report.funds_allocated is not None) else sum(p.budget_allocated for p in projects_db)
    funds_released = report.funds_released if (report and report.funds_released is not None) else sum(p.budget_released for p in projects_db)
    funds_spent = report.funds_spent if (report and report.funds_spent is not None) else sum(p.budget_utilized for p in projects_db)
    
    # Infrastructure
    infra = report.infra_metrics if report else None
    
    def get_infra_metrics(category):
        type_match = lambda p: p.category == category
        if category == "Buildings":
            type_match = lambda p: p.category in ("Buildings", "Government Buildings")
        elif category == "Lighting":
            type_match = lambda p: p.category in ("Lighting", "Street Lighting")
            
        completed = len([p for p in projects_db if type_match(p) and p.status == "Completed"])
        ongoing = len([p for p in projects_db if type_match(p) and p.status != "Completed"])
        return completed, ongoing

    roads_c, roads_o = get_infra_metrics("Roads")
    flyovers_c, flyovers_o = get_infra_metrics("Flyovers")
    bridges_c, bridges_o = get_infra_metrics("Bridges")
    buildings_c, buildings_o = get_infra_metrics("Buildings")
    drainage_c, drainage_o = get_infra_metrics("Drainage")
    lighting_c, lighting_o = get_infra_metrics("Lighting")
    
    return {
        "district": district,
        "funds_allocated": funds_allocated,
        "funds_released": funds_released,
        "funds_spent": funds_spent,
        "funds_remaining": funds_released - funds_spent,
        
        "roads_completed": infra.roads_completed if (infra and infra.roads_completed is not None) else roads_c,
        "roads_ongoing": infra.roads_ongoing if (infra and infra.roads_ongoing is not None) else roads_o,
        
        "flyovers_completed": infra.flyovers_completed if (infra and infra.flyovers_completed is not None) else flyovers_c,
        "flyovers_ongoing": infra.flyovers_ongoing if (infra and infra.flyovers_ongoing is not None) else flyovers_o,
        
        "bridges_completed": infra.bridges_completed if (infra and infra.bridges_completed is not None) else bridges_c,
        "bridges_ongoing": infra.bridges_ongoing if (infra and infra.bridges_ongoing is not None) else bridges_o,
        
        "buildings_completed": infra.buildings_completed if (infra and infra.buildings_completed is not None) else buildings_c,
        "buildings_ongoing": infra.buildings_ongoing if (infra and infra.buildings_ongoing is not None) else buildings_o,
        
        "drainage_completed": infra.drainage_completed if (infra and infra.drainage_completed is not None) else drainage_c,
        "drainage_ongoing": infra.drainage_ongoing if (infra and infra.drainage_ongoing is not None) else drainage_o,
        
        "lighting_completed": infra.lighting_completed if (infra and infra.lighting_completed is not None) else lighting_c,
        "lighting_ongoing": infra.lighting_ongoing if (infra and infra.lighting_ongoing is not None) else lighting_o,
    }


@router.post("/district-metrics")
def update_district_metrics(
    payload: DistrictMetricsUpdatePayload,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Save manually updated infrastructure metrics and fund management override values to the database, logging to AuditTrail."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    district = payload.district
    month = payload.month
    year = payload.year
    
    # Find or create report
    report = session.exec(
        select(DepartmentReport)
        .where(DepartmentReport.district_name == district)
        .where(DepartmentReport.reporting_month == month)
        .where(DepartmentReport.reporting_year == year)
        .where(DepartmentReport.status == "submitted")
    ).first()
    if not report:
        report = session.exec(
            select(DepartmentReport)
            .where(DepartmentReport.district_name == district)
            .where(DepartmentReport.reporting_month == month)
            .where(DepartmentReport.reporting_year == year)
            .where(DepartmentReport.status == "draft")
        ).first()
        
    if not report:
        report = DepartmentReport(
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

    # Track changes
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
        
    infra = report.infra_metrics
    if not infra:
        infra = InfrastructureMetric(report_id=report.id)
        session.add(infra)
        session.commit()
        session.refresh(infra)
        
    def check_and_update(field_name, new_val):
        old_val = getattr(infra, field_name)
        if old_val != new_val:
            changes.append(f"{field_name.replace('_', ' ').title()}: {old_val} -> {new_val}")
            setattr(infra, field_name, new_val)
            
    check_and_update("roads_completed", payload.roads_completed)
    check_and_update("roads_ongoing", payload.roads_ongoing)
    check_and_update("flyovers_completed", payload.flyovers_completed)
    check_and_update("flyovers_ongoing", payload.flyovers_ongoing)
    check_and_update("bridges_completed", payload.bridges_completed)
    check_and_update("bridges_ongoing", payload.bridges_ongoing)
    check_and_update("buildings_completed", payload.buildings_completed)
    check_and_update("buildings_ongoing", payload.buildings_ongoing)
    check_and_update("drainage_completed", payload.drainage_completed)
    check_and_update("drainage_ongoing", payload.drainage_ongoing)
    check_and_update("lighting_completed", payload.lighting_completed)
    check_and_update("lighting_ongoing", payload.lighting_ongoing)
    
    report.updated_at = datetime.now(timezone.utc)
    session.add(report)
    session.add(infra)
    
    if changes:
        log = AuditLog(
            officer=current_user.email,
            department="Public Works Department (PWD)",
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
    """Expose district-wise aggregated project records dynamically generated from database reports and overridden fund details."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    try:
        # Get all projects joined with DepartmentReport
        stmt = select(Project, DepartmentReport).join(DepartmentReport)
        results = session.exec(stmt).all()
        
        # Get unique district names dynamically from database reports
        stmt_districts = select(DepartmentReport.district_name).distinct()
        db_districts = sorted(list(set(session.exec(stmt_districts).all())))
        if not db_districts:
            db_districts = DELHI_DISTRICTS
            
        projects_by_district = {name: [] for name in db_districts}
        for proj, report in results:
            dist_name = report.district_name
            if dist_name in projects_by_district:
                projects_by_district[dist_name].append(proj)
                
        # Batch retrieve all reports for this month and year to avoid N+1 query loop
        reports_in_db = session.exec(
            select(DepartmentReport)
            .where(DepartmentReport.reporting_month == month)
            .where(DepartmentReport.reporting_year == year)
        ).all()
        draft_reports = {r.district_name: r for r in reports_in_db if r.status == "draft"}
        submitted_reports = {r.district_name: r for r in reports_in_db if r.status == "submitted"}

        district_data_list = []
        for i, dist_name in enumerate(db_districts):
            dist_id = f"DIST_{i+1:02d}"
            projs = projects_by_district.get(dist_name, [])
            
            # Fetch report for this district to see if override values exist from memory
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
            
        # Determine last updated timestamp from DepartmentReport
        stmt_report = select(DepartmentReport.updated_at)
        updated_times = session.exec(stmt_report).all()
        if updated_times:
            last_updated = max(updated_times).strftime("%Y-%m-%dT%H:%M:%SZ")
        else:
            last_updated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            
        return {
            "department": "Public Works Department (PWD)",
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
    """Get all action tracker instructions, joined with project name."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")

    actions = session.exec(select(Action)).all()
    
    # Batch query projects to avoid N+1 query loops
    project_uids = [act.project_uid for act in actions]
    projects_map = {}
    if project_uids:
        projects_db = session.exec(select(Project).where(Project.project_uid.in_(project_uids))).all()
        projects_map = {p.project_uid: p.name for p in projects_db}

    response = []
    for act in actions:
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
    
    # Log change to AuditTrail
    log = AuditLog(
        officer=current_user.email,
        department="Public Works Department (PWD)",
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
    
    proj = session.exec(select(Project).where(Project.project_uid == act.project_uid)).first()
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
    date: Optional[str] = Query(None),  # Format: YYYY-MM-DD
    action_type: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve audit logs with search, filtering and pagination."""
    if current_user.role.upper() not in ("CM", "DM", "OFFICIAL"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
    stmt = select(AuditLog)
    
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
        
    # Order by timestamp descending
    stmt = stmt.order_by(AuditLog.timestamp.desc())
    
    # Execute query to get total matching records
    all_logs = session.exec(stmt).all()
    total = len(all_logs)
    
    # Paginate
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



