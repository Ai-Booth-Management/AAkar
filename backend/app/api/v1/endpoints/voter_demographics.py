"""
voter_demographics.py
----------------------
Endpoint to query voter demographic distribution for map coloring in Campaign Management.
Returns per-constituency and per-ward counts of matching voters for given filter criteria.
Falls back to simulated data when Neo4j is unavailable or data is sparse.
"""
import random
import json
from pathlib import Path
from fastapi import APIRouter, Query
from sqlmodel import Session, select
from typing import Optional
from app.infrastructure.db.sqlite_client import engine
from app.infrastructure.db.neo4j_client import neo4j_client
from app.domain.models.hierarchy import HierarchyNode

router = APIRouter()


def _walk_to_constituency(session: Session, node_id: Optional[int], depth: int = 0) -> str:
    """Recursively walk parent chain to find constituency-level node name."""
    if depth > 5 or node_id is None:
        return ""
    node = session.exec(select(HierarchyNode).where(HierarchyNode.id == node_id)).first()
    if not node:
        return ""
    if node.level == "constituency":
        return node.name
    return _walk_to_constituency(session, node.parent_id, depth + 1)


def _simulated_response(conditions: list) -> dict:
    """Return plausible simulated demographic heatmap for demo purposes."""
    with Session(engine) as session:
        const_nodes = session.exec(select(HierarchyNode).where(HierarchyNode.level == "constituency")).all()
        constituencies = list(set([n.name for n in const_nodes if n.name]))

    # Load ward list from mapping
    try:
        mapping_path = Path(__file__).resolve().parents[5] / "frontend" / "public" / "ward_to_constituency.json"
        with open(mapping_path, "r", encoding="utf-8") as f:
            mapping_data = json.load(f)
            ward_nos = [item["Ward_No"] for item in mapping_data]
    except Exception:
        ward_nos = []

    if not constituencies:
        constituencies = ["New Delhi", "Chandni Chowk", "Matia Mahal", "Ballimaran"]

    result = {}
    rng = random.Random(len(conditions) * 42 + 7)
    for c in constituencies:
        total = rng.randint(1200, 8000)
        ratio = rng.uniform(0.15, 0.92) if conditions else 1.0
        result[c] = {"matching": int(total * ratio), "total": total}

    result_wards = {}
    for w in ward_nos:
        total = rng.randint(200, 1500)
        ratio = rng.uniform(0.15, 0.92) if conditions else 1.0
        result_wards[w] = {"matching": int(total * ratio), "total": total}

    total_matching = sum(v["matching"] for v in result.values())
    total_voters = sum(v["total"] for v in result.values())
    return {
        "constituencies": result,
        "wards": result_wards,
        "filter_summary": {
            "total_matching": total_matching,
            "total_voters": total_voters,
            "filters_applied": len(conditions),
            "is_simulated": True,
        },
    }


@router.get("/demographics/constituency-summary")
async def get_voter_demographics_constituency_summary(
    age_min: Optional[int] = Query(None, ge=18, le=120),
    age_max: Optional[int] = Query(None, ge=18, le=120),
    gender: Optional[str] = Query(None),
    occupation: Optional[str] = Query(None),
    qualification: Optional[str] = Query(None),
    religion: Optional[str] = Query(None),
    income: Optional[str] = Query(None),
    caste: Optional[str] = Query(None),
):
    """
    Returns voter counts (matching vs total) per constituency and ward based on demographic filters.
    Used by Campaign Management map to color constituencies/wards by voter concentration.
    """
    # Unpack Query instances if called directly in python
    def val(x):
        if x is not None and not isinstance(x, str) and not isinstance(x, int):
            return None
        return x

    age_min = val(age_min)
    age_max = val(age_max)
    gender = val(gender)
    occupation = val(occupation)
    qualification = val(qualification)
    religion = val(religion)
    income = val(income)
    caste = val(caste)

    # Build dynamic Cypher conditions
    conditions = []
    params: dict = {}

    if age_min is not None:
        conditions.append("toInteger(v.age) >= $age_min")
        params["age_min"] = age_min
    if age_max is not None:
        conditions.append("toInteger(v.age) <= $age_max")
        params["age_max"] = age_max
    if gender and gender.lower() != "all":
        conditions.append("toLower(v.gender) = toLower($gender)")
        params["gender"] = gender
    if occupation:
        conditions.append("toLower(v.occupation) CONTAINS toLower($occupation)")
        params["occupation"] = occupation
    if qualification and qualification.lower() != "all":
        conditions.append("toLower(v.qualification) = toLower($qualification)")
        params["qualification"] = qualification
    if religion:
        conditions.append("toLower(v.religion) CONTAINS toLower($religion)")
        params["religion"] = religion
    if income and income.lower() != "all":
        conditions.append("v.income = $income")
        params["income"] = income
    if caste:
        conditions.append("toLower(v.caste) CONTAINS toLower($caste)")
        params["caste"] = caste

    where_filter = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    # No filters = no-op, return empty
    if not conditions:
        return {
            "constituencies": {},
            "wards": {},
            "filter_summary": {"total_matching": 0, "total_voters": 0, "filters_applied": 0},
        }

    try:
        # Constituency level aggregation
        total_const_q = """
        MATCH (v:Voter)
        WHERE v.constituency IS NOT NULL AND v.constituency <> ''
        RETURN v.constituency AS constituency, count(v) AS total
        """
        matching_const_q = f"""
        MATCH (v:Voter)
        {where_filter}
        {"AND" if conditions else "WHERE"} v.constituency IS NOT NULL AND v.constituency <> ''
        RETURN v.constituency AS constituency, count(v) AS matching
        """

        total_const_results = neo4j_client.run_query(total_const_q, {}) or []
        matching_const_results = neo4j_client.run_query(matching_const_q, params) or []

        # If no data in Neo4j, use simulation
        if not total_const_results:
            return _simulated_response(conditions)

        # Ward level aggregation
        total_ward_q = """
        MATCH (v:Voter)
        WHERE v.ward IS NOT NULL AND v.ward <> ''
        RETURN v.ward AS ward, count(v) AS total
        """
        matching_ward_q = f"""
        MATCH (v:Voter)
        {where_filter}
        {"AND" if conditions else "WHERE"} v.ward IS NOT NULL AND v.ward <> ''
        RETURN v.ward AS ward, count(v) AS matching
        """

        total_ward_results = neo4j_client.run_query(total_ward_q, {}) or []
        matching_ward_results = neo4j_client.run_query(matching_ward_q, params) or []

        const_totals = {r["constituency"]: r["total"] for r in total_const_results}
        const_matching = {r["constituency"]: r["matching"] for r in matching_const_results}

        result = {}
        for c in set(list(const_totals.keys()) + list(const_matching.keys())):
            result[c] = {
                "matching": const_matching.get(c, 0),
                "total": const_totals.get(c, 0),
            }

        # Format ward statistics
        ward_totals = {r["ward"]: r["total"] for r in total_ward_results}
        ward_matching = {r["ward"]: r["matching"] for r in matching_ward_results}

        wards_result = {}
        for w in set(list(ward_totals.keys()) + list(ward_matching.keys())):
            wards_result[w] = {
                "matching": ward_matching.get(w, 0),
                "total": ward_totals.get(w, 0),
            }

        total_matching = sum(v["matching"] for v in result.values())
        total_voters = sum(v["total"] for v in result.values())

        return {
            "constituencies": result,
            "wards": wards_result,
            "filter_summary": {
                "total_matching": total_matching,
                "total_voters": total_voters,
                "filters_applied": len(conditions),
                "is_simulated": False,
            },
        }

    except Exception as e:
        print(f"[voter_demographics] Neo4j error, using simulation: {e}")
        return _simulated_response(conditions)
