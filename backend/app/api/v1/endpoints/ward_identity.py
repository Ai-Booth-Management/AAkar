"""
ward_identity.py
-----------------
Endpoint: GET /api/v1/voters/demographics/ward-identity

Returns deviation-based demographic identity per ward.
For each ward, finds the field+value that deviates most positively
from the Delhi-wide average (ward_pct - city_avg_pct).

Completely independent of the filter/constituency-summary endpoint.
"""
from fastapi import APIRouter
from collections import defaultdict
from app.infrastructure.db.neo4j_client import neo4j_client

router = APIRouter()

_IDENTITY_FIELDS = [
    "qualification",
    "religion",
    "occupation",
    "caste",
    "income",
    "gender",
    "age",       # bucketed into age groups below
]

_AGE_BUCKETS = [
    (18, 25, "Youth (18-25)"),
    (26, 35, "Young Adult (26-35)"),
    (36, 50, "Adult (36-50)"),
    (51, 65, "Middle-aged (51-65)"),
    (66, 120, "Senior (66+)"),
]

# Fixed color palette — every possible identity value gets a stable color
_PALETTE_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
    "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e",
    "#84cc16", "#a855f7", "#0ea5e9", "#fb923c", "#4ade80",
    "#c084fc", "#fb7185", "#38bdf8", "#fbbf24", "#34d399",
    "#a3e635", "#818cf8", "#f472b6", "#2dd4bf", "#facc15",
]


def _bucket_age(age_str: str) -> str:
    try:
        a = int(age_str)
    except (ValueError, TypeError):
        return "Unknown"
    for lo, hi, label in _AGE_BUCKETS:
        if lo <= a <= hi:
            return label
    return "Unknown"
# In-memory cache for computed ward demographic identities to make map toggling instant.
_WARD_IDENTITY_CACHE = None


def clear_ward_identity_cache():
    global _WARD_IDENTITY_CACHE
    _WARD_IDENTITY_CACHE = None


@router.get("/demographics/ward-identity")
async def get_ward_identity():
    """
    Deviation-based ward demographic identity.

    Algorithm:
    1. For each demographic field, count value distribution per ward AND city-wide.
    2. Compute city_avg_pct = city_count[field][value] / city_total_for_field * 100
    3. For each ward+field+value: deviation = ward_pct - city_avg_pct
    4. Ward's identity = the (field, value) pair with the highest deviation.

    Response shape:
    {
      "wards": {
        "27": {
          "identity_field": "qualification",
          "identity_value": "Illiterate",
          "ward_pct": 62.1,
          "city_avg_pct": 28.4,
          "deviation": 33.7,
          "total_voters": 1320,
          "top3": [
            {"field": "qualification", "value": "Illiterate", "ward_pct": 62.1, "city_avg_pct": 28.4, "deviation": 33.7},
            ...
          ]
        },
        ...
      },
      "palette": { "Illiterate": "#ef4444", "Youth (18-25)": "#06b6d4", ... },
      "field_labels": { "qualification": "Education", "religion": "Religion", ... }
    }
    """
    global _WARD_IDENTITY_CACHE
    if _WARD_IDENTITY_CACHE is not None:
        return _WARD_IDENTITY_CACHE
    try:
        # ward_counts[ward][field][value] = count of voters
        ward_counts: dict = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
        # city_counts[field][value] = count across all wards
        city_counts: dict = defaultdict(lambda: defaultdict(int))

        # ── 1. Fetch per-field distributions ──────────────────────────────
        for field in _IDENTITY_FIELDS:
            q = f"""
            MATCH (v:Voter)
            WHERE v.ward IS NOT NULL AND v.ward <> ''
              AND v.{field} IS NOT NULL AND v.{field} <> ''
            RETURN v.ward AS ward, v.{field} AS val, count(v) AS cnt
            """
            rows = neo4j_client.run_query(q, {}) or []
            for row in rows:
                ward = row["ward"]
                raw_val = str(row["val"])
                val = _bucket_age(raw_val) if field == "age" else raw_val
                count = int(row["cnt"])
                ward_counts[ward][field][val] += count
                city_counts[field][val] += count

        # ── 2. Ward totals ────────────────────────────────────────────────
        ward_totals_q = """
        MATCH (v:Voter)
        WHERE v.ward IS NOT NULL AND v.ward <> ''
        RETURN v.ward AS ward, count(v) AS total
        """
        ward_totals: dict = {}
        for row in (neo4j_client.run_query(ward_totals_q, {}) or []):
            ward_totals[row["ward"]] = int(row["total"])

        if not ward_totals:
            return {"wards": {}, "palette": {}, "field_labels": {}}

        # ── 3. City-wide percentages ──────────────────────────────────────
        city_pct: dict = {}
        for field, vals in city_counts.items():
            ft = sum(vals.values())
            if ft == 0:
                continue
            city_pct[field] = {v: (c / ft * 100) for v, c in vals.items()}

        # ── 4. Deviation per ward ─────────────────────────────────────────
        result = {}
        all_identity_values: set = set()

        for ward, w_total in ward_totals.items():
            if w_total == 0:
                continue

            candidates = []
            for field, vals in ward_counts.get(ward, {}).items():
                field_total_ward = sum(vals.values())
                if field_total_ward == 0:
                    continue
                for val, cnt in vals.items():
                    w_pct = cnt / field_total_ward * 100
                    c_pct = city_pct.get(field, {}).get(val, 0.0)
                    dev = w_pct - c_pct
                    # Only consider positive deviations (ward is above average)
                    if dev < 0:
                        continue
                    candidates.append({
                        "field": "age_group" if field == "age" else field,
                        "value": val,
                        "ward_pct": round(w_pct, 1),
                        "city_avg_pct": round(c_pct, 1),
                        "deviation": round(dev, 1),
                    })

            # Sort by deviation descending
            candidates.sort(key=lambda x: x["deviation"], reverse=True)
            top3 = candidates[:3]

            if top3:
                best = top3[0]
                all_identity_values.add(best["value"])
                result[ward] = {
                    "identity_field": best["field"],
                    "identity_value": best["value"],
                    "ward_pct": best["ward_pct"],
                    "city_avg_pct": best["city_avg_pct"],
                    "deviation": best["deviation"],
                    "total_voters": w_total,
                    "top3": top3,
                }

        # ── 5. Stable color palette ───────────────────────────────────────
        palette: dict = {}
        for i, val in enumerate(sorted(all_identity_values)):
            palette[val] = _PALETTE_COLORS[i % len(_PALETTE_COLORS)]

        field_labels = {
            "qualification": "Education",
            "religion": "Religion",
            "occupation": "Occupation",
            "caste": "Caste",
            "income": "Income",
            "gender": "Gender",
            "age_group": "Age Group",
        }

        response = {
            "wards": result,
            "palette": palette,
            "field_labels": field_labels,
        }
        _WARD_IDENTITY_CACHE = response
        return response

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return {"wards": {}, "palette": {}, "field_labels": {}, "error": str(exc)}
