import requests
import json
from app.infrastructure.db.sqlite_client import get_session
from app.domain.models.user import User
from sqlmodel import select
from app.core.security import create_access_token

def test():
    with next(get_session()) as session:
        user = session.exec(select(User).first())
        if not user:
            print("No user found")
            return
        
        token = create_access_token(user.id)
        print(f"Token: {token}")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        payload = {
            "question": "What should I focus on in the election right now?",
            "shortcut": None
        }

        res = requests.post("http://127.0.0.1:8000/api/v1/ask-election", headers=headers, json=payload)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")

if __name__ == "__main__":
    test()
