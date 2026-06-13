import uuid
from app.infrastructure.db.neo4j_client import neo4j_client
from app.domain.services.graph_enrichment import update_booth_metrics


def clear_database():
    """Wipe the entire Neo4j database before a clean re-seed."""
    query = "MATCH (n) DETACH DELETE n"
    return neo4j_client.run_query(query)
    


def process_voters(df):
    count = 0
    BATCH_SIZE = 1000

    for i in range(0, len(df), BATCH_SIZE):
        chunk = df.iloc[i:i+BATCH_SIZE]
        batch = []
        for _, row in chunk.iterrows():
            epic_val = str(row["epic"]).strip()
            if not epic_val or epic_val.upper() == "UNKNOWN" or epic_val.lower() == "nan":
                epic_val = f"UNKNOWN_{uuid.uuid4().hex[:8]}"

            house_no = str(row["house_no"]).strip()
            booth_id = str(row["booth_id"]).strip()
            area = str(row["section"]).strip()

            #  FIX: unique house
            house_id = f"{booth_id}_{area}_{house_no}"

            batch.append({
                "epic": epic_val,
                "name": str(row["name"]).strip(),
                "age": int(row["age"]) if str(row["age"]).strip().isdigit() else -1,
                "gender": str(row["gender"]).strip(),
                "relation_name": str(row["relation_name"]).strip(),
                "relation_type": str(row["relation_type"]).strip(),
                "house_no": house_no,
                "assembly": str(row["assembly"]).strip(),
                "section": str(row["section"]).strip(),
                "booth_id": booth_id,
                "area": area,
                "house_id": house_id,
            })

        if not batch:
            continue

        query = """
        UNWIND $batch AS row
        MERGE (b:Booth {booth_id: row.booth_id})

        MERGE (a:Area {name: row.area, booth_id: row.booth_id})
        MERGE (b)-[:HAS_AREA]->(a)

        MERGE (h:House {house_id: row.house_id})
        SET h.house_no = row.house_no,
            h.area = row.area,
            h.booth_id = row.booth_id

        MERGE (a)-[:HAS_HOUSE]->(h)

        MERGE (p:Person {epic_id: row.epic})
        SET p.name = row.name,
            p.age = row.age,
            p.gender = row.gender,
            p.relation_name = row.relation_name,
            p.relation_type = row.relation_type,
            p.assembly = row.assembly,
            p.section = row.section

        MERGE (h)-[:HAS_MEMBER]->(p)
        """

        neo4j_client.run_query(query, {"batch": batch})
        count += len(batch)

    return {"voters_processed": count}


def process_complaints(df):
    df.columns = df.columns.str.lower().str.strip()

    count = 0
    BATCH_SIZE = 1000

    for i in range(0, len(df), BATCH_SIZE):
        chunk = df.iloc[i:i+BATCH_SIZE]
        batch = []
        for _, row in chunk.iterrows():

            epic = str(row.get("epic") or row.get("voter_epic") or "").strip()
            phone = str(row.get("contact_no") or row.get("phone_number") or "").strip()
            issue_type = str(row.get("issue_type") or "").strip()
            status = str(row.get("status") or "").strip()
            timestamp = str(row.get("timestamp") or "").strip()

            if not epic:
                continue

            batch.append({
                "complaint_id": int(row.get("complaint_id", 0)),
                "epic": epic,
                "phone_number": phone,
                "issue_type": issue_type,
                "timestamp": timestamp if timestamp else "2026-03-24T12:00:00",
                "status": status,
                "booth_id": str(row.get("booth_id", "UNKNOWN")).strip(),
            })

        if not batch:
            continue

        query = """
        UNWIND $batch AS row
        MATCH (p:Person {epic_id: row.epic})
        WITH p, row
        WHERE p IS NOT NULL
        SET p.phone_number = row.phone_number

        MERGE (i:Issue {complaint_id: row.complaint_id})
        SET i.type = row.issue_type,
            i.status = row.status,
            i.timestamp = row.timestamp,
            i.booth_id = row.booth_id

        MERGE (p)-[:REPORTED]->(i)

        WITH i, p, row
        MATCH (p)<-[:HAS_MEMBER]-(h:House)
        MERGE (i)-[:BELONGS_TO]->(h)

        WITH i, h, row
        MATCH (h)<-[:HAS_HOUSE]-(a:Area)
        MERGE (i)-[:LOCATED_IN]->(a)

        WITH i, a, row
        MATCH (a)<-[:HAS_AREA]-(b:Booth)
        MERGE (i)-[:IN_BOOTH]->(b)
        """

        neo4j_client.run_query(query, {"batch": batch})
        count += len(batch)

    update_booth_metrics()

    from app.domain.services.risk_engine import update_risk_scores
    from app.domain.services.recommendation_engine import generate_recommendations
    from app.domain.services.voter_segmentation import categorize_voters

    update_risk_scores()
    generate_recommendations()
    categorize_voters()

    return {"complaints_processed": count}