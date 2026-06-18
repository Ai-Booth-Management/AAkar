import pytest
import pandas as pd
from app.infrastructure.db.sqlite_client import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Import main to register all models in SQLModel.metadata
    import app.main
    init_db()

@pytest.fixture
def sample_voters_df():
    return pd.DataFrame([
        {
            "epic": "ABC1234567",
            "name": "Test User One",
            "age": 30,
            "gender": "Male",
            "relation_name": "Father One",
            "relation_type": "F",
            "house_no": "12",
            "assembly": "Assembly A",
            "section": "Section 1",
            "booth_id": "MH_123_001"
        },
        {
            "epic": "XYZ7890123",
            "name": "Test User Two",
            "age": 45,
            "gender": "Female",
            "relation_name": "Husband Two",
            "relation_type": "H",
            "house_no": "34",
            "assembly": "Assembly A",
            "section": "Section 2",
            "booth_id": "MH_123_002"
        }
    ])

@pytest.fixture
def sample_complaints_df():
    return pd.DataFrame([
        {
            "complaint_id": 1,
            "epic": "ABC1234567",
            "contact_no": "9876543210",
            "issue_type": "Water Supply",
            "status": "Open",
            "timestamp": "2026-03-24T12:00:00",
            "booth_id": "MH_123_001"
        },
        {
            "complaint_id": 2,
            "epic": "XYZ7890123",
            "contact_no": "8765432109",
            "issue_type": "Power Cut",
            "status": "Resolved",
            "timestamp": "2026-03-25T14:30:00",
            "booth_id": "MH_123_002"
        }
    ])

