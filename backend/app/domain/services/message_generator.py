from app.infrastructure.db.neo4j_client import neo4j_client


def generate_booth_messages():
    query = """
    MATCH (b:Booth)
    WHERE b.recommendation IS NOT NULL AND b.recommendation <> "No action required"

    OPTIONAL MATCH (b)<-[:IN_BOOTH]-(c:Complaint)
    WITH b, b.recommendation AS recommendation, count(c) AS total_issues,
         sum(CASE WHEN c.status = "Open" THEN 1 ELSE 0 END) AS open_issues

    RETURN 
        b.booth_id AS booth_id,
        recommendation,
        total_issues,
        open_issues
    ORDER BY b.booth_id
    
    """

    results = neo4j_client.run_query(query)
    messages = []

    # Simple rule-based personalized update logic
    message_map = {
        "Deploy water inspection team": "Water pipeline repair is scheduled in your area.",
        "Contact electricity board": "Power outage investigation initiated.",
        "Schedule road repair overview": "Road maintenance crew has been notified.",
        "Deploy sanitation team": "Sanitation drive starting soon in your locality.",
        "Deploy general grievance team": "A grievance officer has been assigned to your booth.",
        "Monitor situation": "We are actively monitoring the situation in your area.",
    }

    for row in results:
        rec = row.get("recommendation", "")
        booth_id = row.get("booth_id")
        message = message_map.get(rec, f"Governance action planned: {rec}")

        messages.append({
            "booth_id": booth_id,
            "message": message
        })

    return messages