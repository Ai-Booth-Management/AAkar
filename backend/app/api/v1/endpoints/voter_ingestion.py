from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
import json
from app.core.security import get_current_user
from app.domain.models.user import User
from app.domain.models.hierarchy import HierarchyNode
from app.infrastructure.db.sqlite_client import get_session
from app.infrastructure.db.neo4j_client import neo4j_client

router = APIRouter()

@router.post("/ingest/voters")
async def ingest_voters(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Parses uploaded electoral roll JSON and populates SQLite and Neo4j."""
    if current_user.role != "BOOTH_PRESIDENT" and current_user.role != "ELECTION_ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized to ingest voter data")

    try:
        contents = await file.read()
        data = json.loads(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")

    # 1. Identify Booth Header
    header = next((item for item in data if item.get("row_type") == "booth_header"), None)
    if not header:
        raise HTTPException(status_code=400, detail="Missing booth header in JSON")

    # Use the booth_id from the user's profile/context if available, otherwise fallback to JSON
    target_booth = current_user.booth_id or str(header.get("Part No."))
    total_voters = header.get("Total Voters", 0)

    # 2. Update SQLite (Booth Total)
    try:
        booth = session.exec(
            select(HierarchyNode).where(HierarchyNode.code == target_booth, HierarchyNode.level == "booth")
        ).first()
        
        if booth:
            # We use setattr to handle cases where the attribute might be missing in older DB schemas
            if hasattr(booth, "total_voters"):
                booth.total_voters = total_voters
                session.add(booth)
                session.commit()
    except Exception as sql_err:
        print(f"SQLite Sync Error (ignoring): {sql_err}")

    # 3. Batch Process Voters for Neo4j
    voters = []
    for item in data:
        if "EPIC No." in item and item.get("EPIC No."):
            # Clean House Number (Remove Hindi prefixes like 'हाउस', 'मकान नं', etc.)
            raw_house = str(item.get("House No.", ""))
            # Simple regex-less cleanup: keep characters after last space or common prefixes
            clean_house = raw_house.split()[-1] if raw_house else "0"
            
            v = item.copy()
            v["clean_house_no"] = clean_house
            voters.append(v)
    
    # We use a Cypher UNWIND for efficient batch insertion
    cypher = """
    UNWIND $batch AS v
    MERGE (voter:Voter {epic_no: v.`EPIC No.`})
    SET voter.name = v.Name,
        voter.age = v.Age,
        voter.gender = v.Gender,
        voter.house_no = v.clean_house_no,
        voter.parent_relation = v.`Guardian Relation`,
        voter.parent_name = v.`Father/Husband Name`,
        voter.booth_id = $booth_id
    
    // Create or Link Booth
    MERGE (b:Booth {booth_id: $booth_id})
    
    // Create or Link Household
    MERGE (h:Household {address_id: $booth_id + "_" + v.clean_house_no})
    SET h.house_no = v.clean_house_no, h.booth_id = $booth_id, h.covered = coalesce(h.covered, false)
    MERGE (voter)-[:MEMBER_OF]->(h)
    MERGE (h)-[:PART_OF]->(b)
    """
    
    try:
        neo4j_client.run_query(cypher, {
            "batch": voters,
            "booth_id": target_booth
        })
        
        # 4. Trigger Post-Ingestion Enrichment
        from app.domain.services.graph_enrichment import update_booth_metrics
        from app.domain.services.voter_segmentation import categorize_voters
        from app.domain.services.risk_engine import update_risk_scores
        
        update_booth_metrics()
        categorize_voters()
        update_risk_scores()
        
    except Exception as neo_err:
        print(f"Neo4j Error: {neo_err}")
        raise HTTPException(status_code=500, detail=f"Database synchronization failed: {str(neo_err)}")

    return {
        "status": "success",
        "booth_id": target_booth,
        "voters_processed": len(voters),
        "total_voters_registered": total_voters
    }
