"""Database engine and session management via SQLModel.
Supports both SQLite and PostgreSQL based on DATABASE_URL config."""

from pathlib import Path
from sqlmodel import SQLModel, Session, create_engine
from app.core.config import settings

RAW_URL = settings.DATABASE_URL

if RAW_URL.startswith("sqlite"):
    DB_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
    DB_DIR.mkdir(parents=True, exist_ok=True)
    if ":///" in RAW_URL:
        # url like sqlite:///./data/app.db – resolve relative path
        url_path = RAW_URL.replace("sqlite:///", "")
        p = Path(url_path)
        if not p.is_absolute():
            p = Path(__file__).resolve().parent.parent.parent.parent / p
        p.parent.mkdir(parents=True, exist_ok=True)
        DATABASE_URL = f"sqlite:///{p}"
    else:
        DATABASE_URL = RAW_URL
    engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})
else:
    DATABASE_URL = RAW_URL
    engine = create_engine(DATABASE_URL, echo=False, pool_size=10, max_overflow=20)


def init_db():
    """Create all SQLModel tables (idempotent) and add missing columns."""
    SQLModel.metadata.create_all(engine)
    # Add latitude/longitude columns if missing (for existing databases)
    from sqlmodel import text
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE hierarchy_node ADD COLUMN latitude FLOAT"))
    except Exception:
        pass
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE hierarchy_node ADD COLUMN longitude FLOAT"))
    except Exception:
        pass
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE campaign ADD COLUMN scheduled_at VARCHAR"))
    except Exception:
        pass

    # Ensure merged campaign-volunteer columns exist on the volunteer table
    _volunteer_cols = [
        ("constituency", "VARCHAR NOT NULL DEFAULT ''"),
        ("assigned_area", "VARCHAR NOT NULL DEFAULT ''"),
        ("assigned_task", "VARCHAR NOT NULL DEFAULT ''"),
        ("lat", "FLOAT"),
        ("lng", "FLOAT"),
        ("coverage_status", "VARCHAR NOT NULL DEFAULT 'pending'"),
        ("task_status", "VARCHAR NOT NULL DEFAULT 'unassigned'"),
        ("campaign_status", "VARCHAR NOT NULL DEFAULT 'inactive'"),
        ("last_location_update", "VARCHAR"),
    ]
    for col_name, col_type in _volunteer_cols:
        try:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE volunteer ADD COLUMN {col_name} {col_type}"))
        except Exception:
            pass

    # Ensure all complaint columns exist (migration-safe ADD COLUMN)
    _complaint_cols = [
        ("constituency",    "VARCHAR NOT NULL DEFAULT ''"),
        ("epic",            "VARCHAR NOT NULL DEFAULT ''"),
        ("district_id",     "VARCHAR NOT NULL DEFAULT ''"),
        ("constituency_id", "VARCHAR NOT NULL DEFAULT ''"),
        ("mandal_id",       "VARCHAR NOT NULL DEFAULT ''"),
        ("state_id",        "VARCHAR NOT NULL DEFAULT ''"),
        ("priority",        "VARCHAR NOT NULL DEFAULT 'LOW'"),
    ]
    for col_name, col_type in _complaint_cols:
        try:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE complaint ADD COLUMN {col_name} {col_type}"))
        except Exception:
            pass  # column already exists — safe to ignore


def get_session():
    """FastAPI dependency that yields a SQLModel Session."""
    with Session(engine) as session:
        yield session
