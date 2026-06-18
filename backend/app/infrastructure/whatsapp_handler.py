import logging
from app.infrastructure.db.neo4j_client import neo4j_client
from app.domain.services.bosi_service import calculate_bosi_score

logger = logging.getLogger(__name__)

def handle_whatsapp_message(sender_phone: str, message_text: str) -> str:
    cmd = message_text.strip().upper()

    if cmd == "TASKS":
        return get_assigned_tasks(sender_phone)
    elif cmd.startswith("MEETING"):
        return start_meeting_workflow(sender_phone, message_text)
    elif cmd == "STATUS":
        return get_booth_status(sender_phone)
    else:
        from app.domain.services.ask_service import ask_question
        result = ask_question(question=message_text)
        return result.get("answer", "I'm sorry, I couldn't process that request.")

def get_assigned_tasks(phone: str) -> str:
    query = """
    MATCH (v:User {phone: $phone})-[:HAS_TASK]->(t)
    WHERE t.status <> 'COMPLETED'
    RETURN t.description as desc, t.deadline as deadline
    """
    results = neo4j_client.run_query(query, {"phone": phone})
    if not results:
        return "You have no pending tasks. Good job!"

    response = "*Your Pending Tasks:*\n"
    for i, res in enumerate(results, 1):
        response += f"{i}. {res['desc']} (Due: {res['deadline']})\n"
    return response

def get_booth_status(phone: str) -> str:
    query = """
    MATCH (v:User {phone: $phone})-[:ASSOCIATED_WITH]->(b:Booth)
    RETURN b.booth_id as id, b.bosi_score as score,
           b.complaint_count as total, b.resolved_count as resolved
    """
    results = neo4j_client.run_query(query, {"phone": phone})
    if not results:
        return "Booth association not found for your number."

    res = results[0]
    score = res['score'] or "N/A"
    pending = res['total'] - res['resolved']

    return (
        f"*Booth Status: {res['id']}*\n"
        f"*BOSI Score:* {score}\n"
        f"*Pending Tasks:* {pending}\n"
    )

def start_meeting_workflow(phone: str, text: str) -> str:
    parts = text.split(maxsplit=1)
    description = parts[1] if len(parts) > 1 else "Unknown Meeting"

    query = """
    MATCH (v:User {phone: $phone})-[:ASSOCIATED_WITH]->(b:Booth)
    CREATE (m:Meeting {description: $desc, timestamp: datetime()})
    CREATE (b)-[:HAS_MEETING]->(m)
    CREATE (v)-[:CONDUCTED]->(m)
    RETURN m
    """
    neo4j_client.run_query(query, {"phone": phone, "desc": description})

    return "*Meeting Recorded Successfully!*\nStructured data has been automatically updated in the leadership dashboard."
