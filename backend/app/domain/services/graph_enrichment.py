from app.infrastructure.db.neo4j_client import neo4j_client


def update_booth_metrics():
    # Reset metrics
    reset_query = """
    MATCH (b:Booth)
    SET b.complaint_count = 0,
        b.open_count = 0,
        b.resolved_count = 0
    """
    neo4j_client.run_query(reset_query)

    # Update counts
    update_query = """
    MATCH (b:Booth)
    OPTIONAL MATCH (b)<-[:IN_BOOTH]-(c:Complaint)

    WITH b,
        count(c) AS total_cnt,
        coalesce(sum(CASE WHEN c.status = "Open" THEN 1 ELSE 0 END), 0) AS open_cnt,
        coalesce(sum(CASE WHEN c.status = "Resolved" THEN 1 ELSE 0 END), 0) AS resolved_cnt

    SET b.complaint_count = total_cnt,
        b.open_count = open_cnt,
        b.resolved_count = resolved_cnt
    """
    neo4j_client.run_query(update_query)

    return {"status": "booth metrics updated"}