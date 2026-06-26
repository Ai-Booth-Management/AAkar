import datetime
from sqlmodel import Session
from app.domain.models.audit_log import AuditLog


def log_event(
    session: Session,
    action_type: str,
    project_name: str | None,
    department: str | None,
    officer: str | None,
    details: str
):
    """Log an audit event to the database."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = AuditLog(
        action_type=action_type,
        project_name=project_name,
        department=department,
        officer=officer,
        details=details,
        timestamp=timestamp
    )
    session.add(log_entry)
