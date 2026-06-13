from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.domain.services.ask_service import ask_question

PREDEFINED_QUERIES = {
    "SHOW_ALL_RELATIONSHIPS": "MATCH (n)-[r]->(m) RETURN n, r, m ",
    "LIST_ALL_VOTERS": "MATCH (v:Voter) RETURN v",
    "list_section": "MATCH (v:Voter) RETURN DISTINCT toLower(v.section) AS section ORDER BY section",
    "LIST_HOUSES": "MATCH (h:House) RETURN h ",
    "HOUSE_MEMBERS": "MATCH (v:Voter) WHERE toLower(v.gender) = 'female' RETURN COUNT(v)",
    "SENIOR_VOTERS": "MATCH (v:Voter) WHERE v.age > 60 RETURN COUNT(v)",
    "YOUTH_VOTERS": "MATCH (v:Voter) WHERE v.age >= 18 AND v.age <= 25 RETURN COUNT(v)",
    "VOTERS_BY_ISSUE": "MATCH (v:Voter)-[r:REPORTED]->(c:Complaint) RETURN v, r, c",
    "AREA_RELATIONS": "MATCH (a:Area)<-[r]-(v:Voter) RETURN a, r, v",
    "FULL_GRAPH": "MATCH (n)-[r]->(m) RETURN n, r, m"
}

router = APIRouter()

from typing import Optional

class AskRequest(BaseModel):
    question: Optional[str] = None
    shortcut: Optional[str] = None


@router.post("/ask")
def ask(request: AskRequest):

    try:
        result = ask_question(
            question=request.question,
            shortcut=request.shortcut   # 🔥 pass this
        )
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process question: {str(e)}"
        )
