from app.infrastructure.db.neo4j_client import neo4j_client


def categorize_voters():
    query = """
    MATCH (v:Voter)
    OPTIONAL MATCH (v)-[:REPORTED]->(c:Complaint)

    WITH v, count(c) AS issue_count

    SET v.category = 
        CASE 
            WHEN issue_count >= 3 THEN "Active"
            WHEN issue_count > 0 THEN "Occasional"
            ELSE "Passive"
        END
    """

    neo4j_client.run_query(query)

    return {"status": "voters categorized"}