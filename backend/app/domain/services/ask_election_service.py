import re
from app.infrastructure.ai.ollama_client import ollama_client
from app.infrastructure.db.sqlite_client import engine
from sqlmodel import Session, text

# SQLite keywords that indicate a write/destructive operation
BLOCKED_KEYWORDS = re.compile(
    r"\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|REPLACE)\b",
    re.IGNORECASE,
)

def _is_conversational(q: str) -> bool:
    """Detect short conversational messages like greetings."""
    if not q:
        return False
    q = q.strip()
    if len(q) > 80:
        return False
    # Use a small set of greeting keywords and limit length to avoid catching short queries
    q_lower = q.lower()
    greetings = {"hi", "hello", "hey", "how are you", "who are you", "what are you", "good morning", "good evening", "thanks", "thank you"}
    return any(q_lower.startswith(g) for g in greetings) and len(q.split()) <= 6

def get_sqlite_schema(volunteer=None) -> str:
    """Returns the schema for the SQLite database."""
    schema = """
    Table: volunteer
    Columns:
    - id (INTEGER, primary key)
    - phone (VARCHAR, unique)
    - name (VARCHAR)
    - booth_id (VARCHAR)
    - status (VARCHAR)  -- 'pending' or 'active'
    - registered_at (DATETIME)

    Table: task
    Columns:
    - id (INTEGER, primary key)
    - volunteer_id (INTEGER, foreign key to volunteer.id)
    - booth_id (VARCHAR)
    - title (VARCHAR)
    - description (VARCHAR)
    - status (VARCHAR) -- 'assigned' or 'completed'
    - assigned_at (DATETIME)
    - completed_at (DATETIME)
    - proof_image_path (VARCHAR)

    Table: user
    Columns:
    - id (INTEGER, primary key)
    - email (VARCHAR)
    - role (VARCHAR) -- 'STATE_ADMIN', 'DISTRICT_ADMIN', 'CONSTITUENCY_MGR', 'MANDAL_MGR', 'BOOTH_PRESIDENT', 'VOLUNTEER'
    - state_id (VARCHAR)
    - district_id (VARCHAR)
    - constituency_id (VARCHAR)
    - mandal_id (VARCHAR)
    - booth_id (VARCHAR)
    - display_name (VARCHAR)
    - created_at (DATETIME)

    SQL Writing Rules:
    - NEVER use parameter placeholders (?, :param, $1, etc.)
    - Always write complete SQL with literal values
    - Use LIMIT 100 instead of WHERE ... = ?
    """

    if volunteer is not None:
        schema += f"""
    Current Volunteer Context (use this when the user asks about "my" or "my tasks"):
    - id: {volunteer.id}
    - phone: {volunteer.phone}
    - name: {getattr(volunteer, 'name', 'Unknown') or 'Unknown'}
    - booth_id: {getattr(volunteer, 'booth_id', 'Unknown') or 'Unknown'}
    """

    return schema

def ask_election_question(question=None, shortcut=None, volunteer=None):
    # 1. Handle conversational greetings
    if question and not shortcut and _is_conversational(question):
        try:
            ai_reply = ollama_client.chat(question)
            return {
                "cypher": "",  # Field name kept as cypher for frontend compatibility
                "data": [],
                "graph": {"nodes": [], "edges": []},
                "answer": ai_reply,
            }
        except Exception as e:
            return {
                "cypher": "",
                "data": [],
                "graph": {"nodes": [], "edges": []},
                "answer": f"I encountered an issue connecting to the AI node: {str(e)}"
            }

    # 2. Generate SQL
    schema = get_sqlite_schema(volunteer)
    try:
        sql_query = ollama_client.generate_sql(schema, question)
    except Exception as e:
        return {
            "cypher": "",
            "data": [],
            "graph": {"nodes": [], "edges": []},
            "answer": f"I encountered an issue connecting to the AI node: {str(e)}"
        }

    # 3. Safety check
    if BLOCKED_KEYWORDS.search(sql_query):
        return {
            "cypher": sql_query,
            "data": [],
            "graph": {"nodes": [], "edges": []},
            "answer": (
                "⚠️ The generated query was blocked because it contains a "
                "write/destructive operation."
            ),
        }

    # 3b. Strip parameter placeholders the LLM may have generated
    sql_query = re.sub(r'=\s*\?', 'IS NOT NULL', sql_query)
    sql_query = re.sub(r'IN\s*\(\s*\?\s*\)', 'IS NOT NULL', sql_query)
    sql_query = sql_query.replace('?', '')

    # 4. Execute query against SQLite
    data = []
    try:
        with Session(engine) as session:
            result = session.exec(text(sql_query))
            keys = result.keys()
            for row in result:
                # Convert Row to dict
                data.append(dict(zip(keys, row)))
    except Exception as e:
        return {
            "cypher": sql_query,
            "data": [],
            "graph": {"nodes": [], "edges": []},
            "answer": f"⚠️ Failed to execute the generated SQL query: {str(e)}",
        }

    # 5. Generate answer using existing summarize_results
    # It still works for SQL results (JSON array)
    try:
        answer = ollama_client.summarize_results(
            question,
            sql_query,
            data
        )
    except Exception as e:
        answer = f"Query executed but summary failed: {str(e)}"

    return {
        "cypher": sql_query, # Send back as cypher so frontend block still works
        "data": data,
        "graph": {"nodes": [], "edges": []}, # SQLite doesn't have graph representation
        "answer": answer,
    }
