from app.core.security import create_access_token
from app.infrastructure.db.sqlite_client import get_session
from app.domain.models.user import User
from sqlmodel import select
from fastapi.testclient import TestClient
from app.main import app

def test():
    with next(get_session()) as session:
        user = session.exec(select(User).limit(1)).first()
        if not user:
            print("No user found")
            return
        token = create_access_token(user.id)
        
    client = TestClient(app)
    res = client.get("/api/v1/export/volunteers", headers={"Authorization": f"Bearer {token}"})
    print(res.status_code)
    print(res.text)

test()
