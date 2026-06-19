from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.core.security import get_current_user
from app.domain.models.user import User
from app.infrastructure.db.neo4j_client import neo4j_client

router = APIRouter()

class BroadcastCreate(BaseModel):
    message: str
    target_type: str  # 'GLOBAL', 'STATE', 'DISTRICT', 'CONSTITUENCY'
    target_id: Optional[str] = None  # e.g., 'UP', 'LUCKNOW'

@router.post("/")
def create_broadcast(req: BroadcastCreate, current_user: User = Depends(get_current_user)):
    try:
        user_role = current_user.role.upper()

        if user_role == 'DISTRICT_ADMIN' and req.target_type in ['GLOBAL', 'STATE']:
            raise HTTPException(status_code=403, detail="District Admin cannot broadcast at State or Global level")

        query = """
        CREATE (b:Broadcast {
            message: $message,
            target_type: $target_type,
            target_id: $target_id,
            sender_id: $sender_id,
            sender_role: $sender_role,
            created_at: $created_at
        })
        RETURN b
        """
        params = {
            "message": req.message,
            "target_type": req.target_type.upper(),
            "target_id": req.target_id,
            "sender_id": current_user.id,
            "sender_role": user_role,
            "created_at": datetime.now().isoformat()
        }
        result = neo4j_client.run_query(query, params)
        return {"status": "success", "broadcast": result[0] if result else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
def get_broadcasts(current_user: User = Depends(get_current_user)):
    try:
        query = """
        MATCH (b:Broadcast)
        WHERE b.target_type = 'GLOBAL'
           OR (b.target_type = 'STATE' AND b.target_id = $state_id)
           OR (b.target_type = 'DISTRICT' AND b.target_id = $district_id)
           OR (b.target_type = 'CONSTITUENCY' AND b.target_id = $constituency_id)
        RETURN b.message AS message, b.target_type AS target_type, b.target_id AS target_id,
               b.sender_role AS sender_role, b.created_at AS created_at
        ORDER BY b.created_at DESC
        LIMIT 20
        """
        params = {
            "state_id": current_user.state_id,
            "district_id": current_user.district_id,
            "constituency_id": current_user.constituency_id
        }
        return neo4j_client.run_query(query, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
