from app.infrastructure.db.neo4j_client import neo4j_client

def calculate_bosi_score(booth_id: str) -> float:
    query = """
    MATCH (b:Booth {booth_id: $booth_id})
    OPTIONAL MATCH (b)-[:HAS_VOLUNTEER]->(v)
    WITH b, count(v) as volunteer_count

    OPTIONAL MATCH (b)-[:HAS_TASK]->(t)
    WITH b, volunteer_count, count(t) as total_tasks,
         sum(CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_tasks

    OPTIONAL MATCH (b)-[:HAS_MEETING]->(m)
    WITH b, volunteer_count, total_tasks, completed_tasks, count(m) as meeting_count

    WITH b, volunteer_count,
         CASE WHEN total_tasks > 0 THEN toFloat(completed_tasks) / total_tasks ELSE 0.0 END as task_completion_rate,
         meeting_count,
         CASE WHEN b.complaint_count > 0 THEN toFloat(b.resolved_count) / b.complaint_count ELSE 0.0 END as resolution_rate

    RETURN (volunteer_count * 0.4) + (task_completion_rate * 30) + (meeting_count * 0.2) + (resolution_rate * 10) as bosi_score
    """
    result = neo4j_client.run_query(query, {"booth_id": booth_id})
    score = result[0]["bosi_score"] if result else 0.0

    neo4j_client.run_query(
        "MATCH (b:Booth {booth_id: $booth_id}) SET b.bosi_score = $score",
        {"booth_id": booth_id, "score": score}
    )

    return score

def calculate_readiness_score(entity_id: str, level: str) -> float:
    level_map = {
        "Mandal": "HAS_BOOTH",
        "Constituency": "HAS_MANDAL",
        "District": "HAS_CONSTITUENCY",
        "State": "HAS_DISTRICT"
    }

    rel = level_map.get(level)
    if not rel:
        return 0.0

    query = f"""
    MATCH (n {{ {level.lower()}_id: $entity_id }})-[:{rel}*]->(b:Booth)
    WITH avg(coalesce(b.bosi_score, 0.0)) as avg_bosi
    RETURN avg_bosi as readiness_score
    """

    result = neo4j_client.run_query(query, {"entity_id": entity_id})
    score = result[0]["readiness_score"] if result else 0.0

    neo4j_client.run_query(
        f"MATCH (n {{ {level.lower()}_id: $entity_id }}) SET n.readiness_score = $score",
        {"entity_id": entity_id, "score": score}
    )

    return score

def update_all_analytics():
    booth_ids = neo4j_client.run_query("MATCH (b:Booth) RETURN b.booth_id as id")
    for b in booth_ids:
        calculate_bosi_score(b["id"])

    mandal_ids = neo4j_client.run_query("MATCH (m:Mandal) RETURN m.mandal_id as id")
    for m in mandal_ids:
        calculate_readiness_score(m["id"], "Mandal")

    constituency_ids = neo4j_client.run_query("MATCH (c:Constituency) RETURN c.constituency_id as id")
    for c in constituency_ids:
        calculate_readiness_score(c["id"], "Constituency")

    district_ids = neo4j_client.run_query("MATCH (d:District) RETURN d.district_id as id")
    for d in district_ids:
        calculate_readiness_score(d["id"], "District")

    return {"status": "all analytics scores updated"}
