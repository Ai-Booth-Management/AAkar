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

    Table: complaint
    Columns:
    - id (INTEGER, primary key)
    - complaint_id (INTEGER)
    - timestamp (VARCHAR)
    - booth_id (VARCHAR)
    - phone (VARCHAR)
    - type (VARCHAR) -- Categorical issue type e.g. 'Electricity', 'Water', 'Road', 'Sanitation'
    - status (VARCHAR) -- 'Open', 'Resolved', etc
    - description (VARCHAR)

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


def _make_response(answer: str):
    return {
        "cypher": "",
        "data": [],
        "graph": {"nodes": [], "edges": []},
        "answer": answer,
    }


def _quick_answer(question: str):
    """Intercept common questions and return pre-canned answers (skips LLM)."""
    if not question:
        return None
    q = question.lower().strip()

    try:
        with Session(engine) as session:
            # Total volunteers
            if any(p in q for p in ["total volunteers", "number of volunteers", "volunteers count", "how many volunteers"]):
                count = session.exec(text("SELECT COUNT(*) FROM volunteer")).one()[0]
                return _make_response(f"**Total Volunteers:** {count}")

            # Active volunteers
            if any(p in q for p in ["active volunteers", "active volunteer count"]):
                count = session.exec(text("SELECT COUNT(*) FROM volunteer WHERE status = 'active'")).one()[0]
                return _make_response(f"**Active Volunteers:** {count}")

            # Total complaints
            if any(p in q for p in ["total complaints", "number of complaints", "complaints count", "how many complaints"]):
                count = session.exec(text("SELECT COUNT(*) FROM complaint")).one()[0]
                return _make_response(f"**Total Complaints:** {count}")

            # Open complaints
            if any(p in q for p in ["open complaints", "pending complaints", "unresolved complaints", "open complaint"]):
                count = session.exec(text("SELECT COUNT(*) FROM complaint WHERE status = 'Open'")).one()[0]
                return _make_response(f"**Open Complaints:** {count}")

            # Resolved complaints
            if any(p in q for p in ["resolved complaints", "closed complaints", "resolved complaint"]):
                count = session.exec(text("SELECT COUNT(*) FROM complaint WHERE status = 'Resolved'")).one()[0]
                return _make_response(f"**Resolved Complaints:** {count}")

            # Complaints by type
            if any(p in q for p in ["complaints by type", "complaint categories", "complaint types", "types of complaints", "complaint distribution"]):
                rows = session.exec(text("SELECT type, COUNT(*) as cnt FROM complaint GROUP BY type ORDER BY cnt DESC")).all()
                if rows:
                    lines = ["**Complaints by Type:**"]
                    for row in rows:
                        lines.append(f"  • **{row[0]}**: {row[1]}")
                    return _make_response("\n".join(lines))

            # Total tasks
            if any(p in q for p in ["total tasks", "number of tasks", "how many tasks", "assigned tasks", "task count"]):
                count = session.exec(text("SELECT COUNT(*) FROM task")).one()[0]
                return _make_response(f"**Total Tasks:** {count}")

            # Completed tasks
            if any(p in q for p in ["completed tasks", "tasks completed", "finished tasks"]):
                count = session.exec(text("SELECT COUNT(*) FROM task WHERE status = 'completed'")).one()[0]
                return _make_response(f"**Completed Tasks:** {count}")

            # Total campaigns
            if any(p in q for p in ["total campaigns", "number of campaigns", "how many campaigns", "campaign count"]):
                try:
                    count = session.exec(text("SELECT COUNT(*) FROM campaign")).one()[0]
                    return _make_response(f"**Total Campaigns:** {count}")
                except Exception:
                    pass

            # Total users
            if any(p in q for p in ["total users", "number of users", "how many users", "user count"]):
                count = session.exec(text("SELECT COUNT(*) FROM user")).one()[0]
                return _make_response(f"**Total Users:** {count}")

            # What to focus on / election priority
            if any(p in q for p in ["focus on", "election focus", "priority", "what should we focus", "key areas", "important issues", "what to focus"]):
                complaints = session.exec(text("SELECT type, COUNT(*) as cnt FROM complaint GROUP BY type ORDER BY cnt DESC LIMIT 5")).all()
                total_vol = session.exec(text("SELECT COUNT(*) FROM volunteer WHERE status = 'active'")).one()[0]
                open_c = session.exec(text("SELECT COUNT(*) FROM complaint WHERE status = 'Open'")).one()[0]
                resolved_c = session.exec(text("SELECT COUNT(*) FROM complaint WHERE status = 'Resolved'")).one()[0]

                lines = ["**Key Focus Areas for the Coming Election:**\n"]
                if complaints:
                    lines.append("**Top Issues (by complaint volume):**")
                    for row in complaints:
                        lines.append(f"  • **{row[0]}**: {row[1]} complaints")
                lines.append("")
                lines.append(f"**Volunteer Strength:** {total_vol} active volunteers")
                total_c = open_c + resolved_c
                if total_c > 0:
                    lines.append(f"**Pending Complaints:** {open_c} still open ({resolved_c * 100 // total_c}% resolved rate)")
                lines.append("")
                lines.append("**Recommendation:** Prioritize the top complaint categories above — addressing these will directly impact voter satisfaction.")
                return _make_response("\n".join(lines))

    except Exception as e:
        print(f"Quick answer error: {e}")
        return None

    return None


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

    # 1b. Check for quick answers (pre-canned SQL, no LLM needed)
    if question and not shortcut:
        quick = _quick_answer(question)
        if quick:
            return quick

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
