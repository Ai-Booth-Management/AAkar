import json
import requests
from sqlmodel import Session, select
from app.infrastructure.db.sqlite_client import engine
from app.infrastructure.db.neo4j_client import neo4j_client
from app.domain.models.project import Project
from app.domain.models.district_metric import DistrictMetric
from app.domain.models.cm_instruction import CmInstruction
from app.domain.models.task import Task
from app.core.config import settings

def get_district_summary_data() -> dict:
    # 1. Fetch SQLite Project Drishti data
    with Session(engine) as session:
        projects = session.exec(select(Project)).all()
        metrics = session.exec(select(DistrictMetric)).all()
        instructions = session.exec(select(CmInstruction)).all()
        tasks = session.exec(select(Task)).all()

    # Convert projects to simple dict
    project_list = []
    for p in projects:
        project_list.append({
            "name": p.name,
            "department": p.department,
            "budget": p.budget,
            "allocated": p.allocated,
            "released": p.released,
            "utilized": p.utilized,
            "remaining": p.remaining,
            "deadline": p.deadline,
            "progress": p.progress,
            "officer": p.officer,
            "status": p.status
        })

    # Convert metrics to simple dict
    metric_list = []
    for m in metrics:
        metric_list.append({
            "name": m.name,
            "status": m.status,
            "complaints_total": m.complaints_total,
            "active_total": m.active_total,
            "escalations": m.escalations,
            "alerts_health": m.alerts_health,
            "alerts_education": m.alerts_education,
            "project_name": m.project_name,
            "project_status": m.project_status
        })

    # Convert instructions
    instruction_list = []
    for inst in instructions:
        instruction_list.append({
            "title": inst.title,
            "description": inst.description,
            "deadline": inst.deadline,
            "priority": inst.priority,
            "status": inst.status,
            "action_taken": inst.action_taken
        })

    # 2. Fetch Booth details from Neo4j
    booth_list = []
    try:
        query = """
        MATCH (b:Booth)
        OPTIONAL MATCH (b)<-[:IN_BOOTH]-(c:Complaint)
        RETURN b.booth_id AS booth_id,
               b.risk_level AS risk_level,
               b.recommendation AS recommendation,
               count(c) AS total_complaints,
               sum(CASE WHEN c.status = 'Open' THEN 1 ELSE 0 END) AS open_complaints
        """
        booth_list = neo4j_client.run_query(query)
    except Exception as e:
        print(f"Neo4j summary fetch error: {e}")

    return {
        "projects": project_list,
        "district_metrics": metric_list,
        "cm_instructions": instruction_list,
        "booth_stats": booth_list
    }

def generate_district_summary() -> dict:
    data = get_district_summary_data()
    
    prompt = f"""[CONTEXT]
You are a Senior AI Governance Assistant. You compile district metadata into an executive summary for the District Magistrate (DM).
Below is the aggregated raw district data:

<data>
{json.dumps(data, indent=2)}
</data>

[OBJECTIVE]
Generate a structured, strategic summary containing 4 distinct sections:
1. Risks: Analyze booth risk levels, open complaints, health/education alerts, and escalations. Highlight critical threats.
2. Delayed Projects: Identify projects with progress lagging, status 'Delayed', or missed deadlines. Include delay reasons if applicable.
3. Fund Issues: Highlight projects where budget released is less than allocated, or utilized is significantly less than released (indicating underutilization), or utilized exceeds released (indicating budget deficit).
4. Recommendations: Provide actionable recommendations (High, Medium, Low priority) to resolve the risks, delayed projects, and fund issues.

[STRICT FORMAT RULE]
You MUST output your response as a valid JSON object matching the schema below.
No other text, preamble, or markdown formatting (no ```json).

{{
  "risks": [
    {{
      "title": "Short title describing the risk",
      "description": "Elaborate detail of the risk with stats",
      "severity": "High" | "Medium" | "Low"
    }}
  ],
  "delayed_projects": [
    {{
      "name": "Project name",
      "department": "Department name",
      "deadline": "Deadline date",
      "progress": 50,
      "delay_reason": "Summary of why it's delayed or lagging"
    }}
  ],
  "fund_issues": [
    {{
      "project_name": "Project name",
      "issue": "Detailed description of the fund mismatch or underutilization",
      "amount": "E.g. ₹20 L underutilized or deficit"
    }}
  ],
  "recommendations": [
    {{
      "action": "Clear actionable step",
      "target": "Target department, booth, or project",
      "priority": "High" | "Medium" | "Low"
    }}
  ]
}}
"""

    try:
        response = requests.post(
            f"{settings.OLLAMA_URL}/api/generate",
            json={
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0},
            },
            timeout=120,
        )
        response.raise_for_status()
        raw_text = response.json().get("response", "").strip()
        parsed = json.loads(raw_text)
        
        # Save to DB
        from datetime import datetime
        from app.domain.models.ai_summary import AiSummary
        with Session(engine) as session:
            db_sum = AiSummary(summary_json=raw_text, timestamp=datetime.now().isoformat())
            session.add(db_sum)
            session.commit()
            
        return parsed
    except Exception as e:
        # Structured fallback if AI generation fails
        fallback = {
            "error": f"Failed to generate summary: {str(e)}",
            "risks": [
                {
                    "title": "System Alert: High Active Complaints",
                    "description": "High number of active complaints in districts. Please check District Metrics panel.",
                    "severity": "High"
                }
            ],
            "delayed_projects": [
                {
                    "name": "Drainage Desilting Phase 2",
                    "department": "PWD",
                    "deadline": "2026-06-25",
                    "progress": 50,
                    "delay_reason": "Project marked as Delayed in system."
                }
            ],
            "fund_issues": [
                {
                    "project_name": "Government School Solarization",
                    "issue": "Budget allocated is ₹45.00 L but only ₹30.00 L released.",
                    "amount": "₹15.00 L deficit"
                }
            ],
            "recommendations": [
                {
                    "action": "Expedite Drainage Desilting Phase 2 to avoid monsoon flooding.",
                    "target": "PWD",
                    "priority": "High"
                }
            ]
        }
        
        # Save fallback to DB
        try:
            from datetime import datetime
            from app.domain.models.ai_summary import AiSummary
            with Session(engine) as session:
                db_sum = AiSummary(summary_json=json.dumps(fallback), timestamp=datetime.now().isoformat())
                session.add(db_sum)
                session.commit()
        except Exception as db_err:
            print(f"Failed to log fallback to DB: {db_err}")
            
        return fallback
