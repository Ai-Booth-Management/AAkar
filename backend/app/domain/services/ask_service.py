import re
from app.infrastructure.ai.ollama_client import ollama_client
from app.infrastructure.db.neo4j_client import neo4j_client


# Cypher keywords that indicate a write/destructive operation
BLOCKED_KEYWORDS = re.compile(
    r"\b(DELETE|CREATE|MERGE|SET|REMOVE|DROP|DETACH)\b",
    re.IGNORECASE,
)




def ask_question(question=None, shortcut=None):
    from app.api.v1.endpoints.ask import PREDEFINED_QUERIES


    # 🔥 STEP 1: shortcut direct
    if shortcut and shortcut in PREDEFINED_QUERIES:
        cypher = PREDEFINED_QUERIES[shortcut]

    else:
        db_schema = neo4j_client.get_schema()
        custom_schema = """
            You are a Neo4j Cypher generator.

            STRICT RULES:

            - The term "voter" refers to ALL Voter nodes
            - "voter" is the primary person entity
            - "complaint" is the primary issue entity

            - ALWAYS interpret:
            "voters" → Voter nodes
            "complaints" → Complaint nodes

            - Use ONLY:
            Voter, Complaint, Booth, Area, House, Drive

            Graph Schema:

            Nodes:
            - Booth (booth_id, complaint_count, open_count, resolved_count)
            - Area (name)
            - House (house_no)
            - Voter (epic, name, age, gender, category, phone)
            - Complaint (complaint_id, type, status, timestamp, phone)

            Relationships:
            - Booth -[:HAS_AREA]-> Area
            - Area -[:HAS_HOUSE]-> House
            - Voter -[:LIVES_IN]-> House
            - Voter -[:REPORTED]-> Complaint
            - Complaint -[:BELONGS_TO]-> House
            - Complaint -[:LOCATED_IN]-> Area
            - Complaint -[:IN_BOOTH]-> Booth
            - Booth -[:HAS_DRIVE]-> Drive
            """
        schema = custom_schema + "\n\n" + db_schema

    # 2. Generate Cypher
    

        output = ollama_client.generate_cypher(schema, question)

        # 🔥 STEP 2: model shortcut
        if output in PREDEFINED_QUERIES:
            cypher = PREDEFINED_QUERIES[output]
        else:
            cypher = output

    # 4. Safety check
    if BLOCKED_KEYWORDS.search(cypher):
        return {
            "cypher": cypher,
            "data": [],
            "graph": {"nodes": [], "edges": []},
            "answer": (
                "⚠️ The generated query was blocked because it contains a "
                "write/destructive operation."
            ),
        }

    # 5. Execute query
    try:
        raw_records = neo4j_client.run_read_query_raw(cypher)
    except Exception as e:
        return {
            "cypher": cypher,
            "data": [],
            "graph": {"nodes": [], "edges": []},
            "answer": f"⚠️ Failed to execute the generated Cypher query: {str(e)}",
        }

    # 6. Extract data
    data = [record.data() for record in raw_records]

    try:
        graph = neo4j_client.extract_graph(raw_records)
    except Exception:
        graph = {"nodes": [], "edges": []}

    # 7. Generate answer
    shortcut_prompts = {
        "VOTERS_BY_ISSUE": "Analyze the correlation between voters and the complaints/issues they have reported. Identify common issues and any demographic trends (e.g., age, location) correlated with specific types of issues.",
        "SENIOR_VOTERS": "Summarize the statistics and demographic details of senior citizen voters. Mention any notable patterns.",
        "YOUTH_VOTERS": "Summarize the statistics and demographic details of youth voters. Mention any notable patterns.",
        "HOUSE_MEMBERS": "Analyze the gender distribution and basic statistics of household members in the dataset.",
        "LIST_HOUSES": "Provide an overview of the household registry distribution.",
        "list_section": "Provide an analysis of the different voter sections.",
        "LIST_ALL_VOTERS": "Provide a quick overview of the voter registry.",
        "SHOW_ALL_RELATIONSHIPS": "Give a brief high-level summary of the overall network ties.",
        "FULL_GRAPH": "Give a brief high-level summary of the overall network ties.",
        "AREA_RELATIONS": "Summarize the geographic distribution of voters across areas."
    }

    target_question = question
    if not target_question and shortcut:
        target_question = shortcut_prompts.get(shortcut, shortcut.replace("_", " "))

    try:
        answer = ollama_client.summarize_results(
            target_question,
            cypher,
            data
        )
    except Exception as e:
        answer = f"Query executed but summary failed: {str(e)}"

    return {
        "cypher": cypher,
        "data": data,
        "graph": graph,
        "answer": answer,
    }