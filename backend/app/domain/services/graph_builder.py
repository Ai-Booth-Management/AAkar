import uuid
from app.infrastructure.db.neo4j_client import neo4j_client
from app.domain.services.graph_enrichment import update_booth_metrics


def clear_database(force=False):
    """Wipe the Neo4j database. Requires force=True to prevent accidental data loss."""
    if not force:
        print("⚠️ Skipping database clear. Use force=True for a full wipe.")
        return
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

        MERGE (v:Voter {epic: row.epic})
        SET v.name = row.name,
            v.age = row.age,
            v.gender = row.gender,
            v.relation_name = row.relation_name,
            v.relation_type = row.relation_type,
            v.assembly = row.assembly,
            v.section = row.section

        MERGE (h)-[:HAS_MEMBER]->(v)
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
            type_val = str(row.get("issue_type") or row.get("type") or "").strip()
            status = str(row.get("status") or "").strip()
            timestamp = str(row.get("timestamp") or "").strip()

            if not epic:
                continue

            batch.append({
                "complaint_id": int(row.get("complaint_id", 0)),
                "epic": epic,
                "phone": phone,
                "type": type_val,
                "timestamp": timestamp if timestamp else "2026-03-24T12:00:00",
                "status": status,
                "booth_id": str(row.get("booth_id", "UNKNOWN")).strip(),
            })

        if not batch:
            continue

        query = """
        UNWIND $batch AS row
        MATCH (v:Voter {epic: row.epic})
        WITH v, row
        WHERE v IS NOT NULL
        SET v.phone = row.phone

        MERGE (c:Complaint {complaint_id: row.complaint_id})
        SET c.type = row.type,
            c.status = row.status,
            c.timestamp = row.timestamp,
            c.booth_id = row.booth_id,
            c.phone = row.phone,
            c.epic = row.epic

        MERGE (v)-[:REPORTED]->(c)

        WITH c, v, row
        MATCH (v)<-[:HAS_MEMBER]-(h:House)
        MERGE (c)-[:BELONGS_TO]->(h)

        WITH c, h, row
        MATCH (h)<-[:HAS_HOUSE]-(a:Area)
        MERGE (c)-[:LOCATED_IN]->(a)

        WITH c, a, row
        MATCH (a)<-[:HAS_AREA]-(b:Booth)
        MERGE (c)-[:IN_BOOTH]->(b)
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