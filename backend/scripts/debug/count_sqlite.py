import sys
import os
from sqlmodel import Session, select, func

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.infrastructure.db.sqlite_client import engine

from app.domain.models.user import User
from app.domain.models.project import Project, ProjectJustification
from app.domain.models.district_metric import DistrictMetric
from app.domain.models.task import Task
from app.domain.models.file_tracker import FileTracker, FileTimelineEntry
from app.domain.models.system_config import SystemConfig
from app.domain.models.audit_log import AuditLog
from app.domain.models.cm_instruction import CmInstruction
from app.domain.models.ai_summary import AiSummary
from app.domain.models.campaign import CampaignVolunteer, ConstituencyCoverage
from app.domain.models.volunteer import Volunteer, VolunteerTask, ConversationState
from app.domain.models.hierarchy import HierarchyNode

tables = [
    User, Project, ProjectJustification, DistrictMetric, Task, FileTracker, FileTimelineEntry,
    SystemConfig, AuditLog, CmInstruction, AiSummary, CampaignVolunteer, ConstituencyCoverage,
    Volunteer, VolunteerTask, ConversationState, HierarchyNode
]

with Session(engine) as session:
    print("Row counts in SQLite tables:")
    for table in tables:
        try:
            count = session.exec(select(func.count()).select_from(table)).one()
            print(f"Table {table.__name__}: {count}")
        except Exception as e:
            print(f"Table {table.__name__}: ERROR {e}")
