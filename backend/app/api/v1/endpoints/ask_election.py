from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.domain.services.ask_election_service import ask_election_question

router = APIRouter()

class AskElectionRequest(BaseModel):
    question: Optional[str] = None
    shortcut: Optional[str] = None

@router.post("/ask-election")
def ask_election(request: AskElectionRequest):
    try:
        result = ask_election_question(
            question=request.question,
            shortcut=request.shortcut
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process election question: {str(e)}"
        )
