"""
BOSI Service
------------
Calculates the 4-pillar performance index for election management units (Districts, Constituencies, Booths).
Pillars:
1. Booth (Coverage) - Saturation of ground presence.
2. Organization (Structure) - Staffing at middle-management levels.
3. Staffing (Density) - Volunteer to voter ratio.
4. Intelligence (Sentiment) - Issue resolution and reported sentiment.
"""

from sqlmodel import Session, select, func
from app.domain.models.hierarchy import HierarchyNode
from app.domain.models.user import User
from app.domain.models.volunteer import Volunteer
from app.infrastructure.db.neo4j_client import neo4j_client

class BOSIEngine:
    @staticmethod
    def calculate_booth_score(booth_code: str, session: Session) -> float:
        # B: Coverage (Simply true for an active booth, but we can measure household coverage)
        hq = """
        MATCH (h:Household {booth_id: $booth_id})
        RETURN count(h) as total, sum(CASE WHEN h.covered = true THEN 1 ELSE 0 END) as covered
        """
        res = neo4j_client.run_query(hq, {"booth_id": booth_code})
        household_pct = 0
        if res and res[0]['total'] > 0:
            household_pct = (res[0]['covered'] / res[0]['total']) * 100
        
        # O: Organization (Does it have a Booth President?) - Booth level is binary for this or based on task activity
        has_bp = session.exec(select(User).where(User.booth_id == booth_code, User.role == "BOOTH_PRESIDENT")).first()
        org_status = 100 if has_bp else 0
        
        # S: Staffing (Volunteers per 1000 voters - ideal is 1:200, so 5 per 1000 = 100%)
        voters_count = session.exec(select(HierarchyNode.total_voters).where(HierarchyNode.code == booth_code)).first() or 0
        vol_count = session.exec(select(func.count(Volunteer.id)).where(Volunteer.booth_id == booth_code)).one() or 0
        
        staffing_score = 0
        if voters_count > 0:
             # If mapping 1 volunteer to 200 voters, ratio is vol/ (voters/200)
             ratio = vol_count / (voters_count / 200) if voters_count >= 200 else 1
             staffing_score = min(ratio * 100, 100)
        
        # I: Intelligence (Sentiment)
        # For now, base on voter sentiment tagging in Neo4j if exists, or return medium score
        intel_score = 75 # Standard placeholder until sentiment tagging is mature
        
        # Weighted BOSI
        score = (household_pct * 0.3) + (org_status * 0.2) + (staffing_score * 0.3) + (intel_score * 0.2)
        
        return {
            "score": round(score, 1),
            "coverage_pct": round(household_pct, 1),
            "voters": voters_count,
            "households": res[0]['total'] if res else 0,
            "households_covered": res[0]['covered'] if res else 0
        }

    @staticmethod
    def get_constituency_household_stats(constituency_code: str, session: Session) -> dict:
        constituency = session.exec(select(HierarchyNode).where(HierarchyNode.code == constituency_code, HierarchyNode.level == "constituency")).first()
        if not constituency: return {"total": 0, "covered": 0}
        
        # Get all booth codes under this constituency
        booth_codes = session.exec(
            select(HierarchyNode.code).where(HierarchyNode.level == "booth", HierarchyNode.parent_id.in_(
                select(HierarchyNode.id).where(HierarchyNode.parent_id == constituency.id)
            ))
        ).all()
        
        if not booth_codes: return {"total": 0, "covered": 0}
        
        hq = """
        MATCH (h:Household)
        WHERE h.booth_id IN $booth_ids
        RETURN count(h) as total, sum(CASE WHEN h.covered = true THEN 1 ELSE 0 END) as covered
        """
        res = neo4j_client.run_query(hq, {"booth_ids": list(booth_codes)})
        if res and res[0]['total'] > 0:
            return {"total": res[0]['total'], "covered": res[0]['covered']}
        return {"total": 0, "covered": 0}

    @staticmethod
    def _get_booth_codes_for_node(code: str, level: str, session: Session) -> list:
        from app.domain.models.hierarchy import HierarchyNode
        parent = session.exec(select(HierarchyNode).where(HierarchyNode.code == code, HierarchyNode.level == level)).first()
        if not parent: return []
        
        if level == "booth": return [code]
        
        LEVEL_ORDER = ["state", "district", "constituency", "mandal", "booth"]
        parent_idx = LEVEL_ORDER.index(level)
        booth_idx = LEVEL_ORDER.index("booth")
        
        current_ids = [parent.id]
        for _ in range(parent_idx, booth_idx):
            current_ids = session.exec(select(HierarchyNode.id).where(HierarchyNode.parent_id.in_(current_ids))).all()
            if not current_ids: return []
            
        return session.exec(select(HierarchyNode.code).where(HierarchyNode.id.in_(current_ids))).all()

    @staticmethod
    def get_district_household_stats(district_code: str, session: Session, level: str = "district") -> dict:
        booth_codes = BOSIEngine._get_booth_codes_for_node(district_code, level, session)
        if not booth_codes: return {"total": 0, "covered": 0}
        
        hq = """
        MATCH (h:Household)
        WHERE h.booth_id IN $booth_ids
        RETURN count(h) as total, sum(CASE WHEN h.covered = true THEN 1 ELSE 0 END) as covered
        """
        res = neo4j_client.run_query(hq, {"booth_ids": list(booth_codes)})
        if res and res[0]['total'] > 0:
            return {"total": res[0]['total'], "covered": res[0]['covered']}
        return {"total": 0, "covered": 0}

    @staticmethod
    def get_district_bosi_average(district_code: str, session: Session) -> float:
        constituency_scores = BOSIEngine.get_district_constituency_scores(district_code, session)
        if not constituency_scores: return 0.0
        avg = sum(c['score'] for c in constituency_scores) / len(constituency_scores)
        return round(avg, 1)

    @staticmethod
    def get_district_constituency_scores(district_code: str, session: Session) -> list:
        district = session.exec(select(HierarchyNode).where(HierarchyNode.code == district_code, HierarchyNode.level == "district")).first()
        if not district: return []
        
        constituencies = session.exec(select(HierarchyNode).where(HierarchyNode.parent_id == district.id, HierarchyNode.level == "constituency")).all()
        
        results = []
        for c in constituencies:
            h_stats = BOSIEngine.get_constituency_household_stats(c.code, session)
            coverage_pct = round((h_stats["covered"] / h_stats["total"]) * 100, 1) if h_stats["total"] > 0 else 0
            bosi_avg = BOSIEngine.get_constituency_bosi_average(c.code, session)
            vol_count = session.exec(
                select(func.count(User.id)).where(User.role == "VOLUNTEER", User.constituency_id == c.code)
            ).one() or 0
            
            # Find Constituency Incharge
            incharge = session.exec(
                select(User.display_name).where(User.role == "CONSTITUENCY_MGR", User.constituency_id == c.code)
            ).first() or "Not Assigned"
            
            results.append({
                "code": c.code,
                "name": c.name,
                "incharge": incharge,
                "score": bosi_avg,
                "coverage_pct": coverage_pct,
                "volunteers": vol_count,
                "activity": 75 # Placeholder for activity metrics
            })
        return results

    @staticmethod
    def get_state_household_stats(state_code: str, session: Session) -> dict:
        return BOSIEngine.get_district_household_stats(state_code, session, level="state")

    @staticmethod
    def get_state_district_scores(state_code: str, session: Session) -> list:
        from app.domain.models.hierarchy import HierarchyNode
        from app.domain.models.user import User
        state = session.exec(select(HierarchyNode).where(HierarchyNode.code == state_code, HierarchyNode.level == "state")).first()
        if not state: return []
        
        districts = session.exec(select(HierarchyNode).where(HierarchyNode.parent_id == state.id, HierarchyNode.level == "district")).all()
        results = []
        for d in districts:
            h_stats = BOSIEngine.get_district_household_stats(d.code, session)
            coverage_pct = round((h_stats["covered"] / h_stats["total"]) * 100, 1) if h_stats["total"] > 0 else 0
            bosi_avg = BOSIEngine.get_district_bosi_average(d.code, session)
            vol_count = session.exec(
                select(func.count(User.id)).where(User.role == "VOLUNTEER", User.district_id == d.code)
            ).one() or 0
            
            incharge = session.exec(
                select(User.display_name).where(User.role == "DISTRICT_ADMIN", User.district_id == d.code)
            ).first() or "Not Assigned"
            
            results.append({
                "code": d.code,
                "name": d.name,
                "incharge": incharge,
                "score": bosi_avg,
                "coverage_pct": coverage_pct,
                "volunteers": vol_count
            })
        return results

    @staticmethod
    def get_state_bosi_average(state_code: str, session: Session) -> float:
        district_scores = BOSIEngine.get_state_district_scores(state_code, session)
        if not district_scores: return 0.0
        return round(sum(d['score'] for d in district_scores) / len(district_scores), 1)

    @staticmethod
    def get_mandal_booth_scores(mandal_code: str, session: Session) -> list:
        # Find all booths in this mandal
        mandal = session.exec(select(HierarchyNode).where(HierarchyNode.code == mandal_code, HierarchyNode.level == "mandal")).first()
        if not mandal: return []
        
        booth_nodes = session.exec(select(HierarchyNode).where(HierarchyNode.parent_id == mandal.id, HierarchyNode.level == "booth")).all()
        
        results = []
        for b in booth_nodes:
            metrics = BOSIEngine.calculate_booth_score(b.code, session)
            results.append({
                "code": b.code,
                "name": b.name,
                "score": metrics["score"],
                "coverage_pct": metrics["coverage_pct"],
                "voters": metrics["voters"],
                "households": metrics["households"],
                "volunteers": session.exec(select(func.count(Volunteer.id)).where(Volunteer.booth_id == b.code)).one() or 0
            })
        return results

    @staticmethod
    def get_mandal_bosi_average(mandal_code: str, session: Session) -> float:
        scores = BOSIEngine.get_mandal_booth_scores(mandal_code, session)
        if not scores: return 0.0
        avg = sum(s['score'] for s in scores) / len(scores)
        return round(avg, 1)

    @staticmethod
    def get_constituency_mandal_scores(constituency_code: str, session: Session) -> list:
        constituency = session.exec(select(HierarchyNode).where(HierarchyNode.code == constituency_code, HierarchyNode.level == "constituency")).first()
        if not constituency: return []
        
        mandals = session.exec(select(HierarchyNode).where(HierarchyNode.parent_id == constituency.id, HierarchyNode.level == "mandal")).all()
        
        results = []
        for m in mandals:
            scores = BOSIEngine.get_mandal_booth_scores(m.code, session)
            avg_score = round(sum(s['score'] for s in scores) / len(scores), 1) if scores else 0.0
            
            # Aggregate household coverage for the mandal
            booth_codes = [s['code'] for s in scores]
            coverage_pct = 0
            if booth_codes:
                hq = """
                MATCH (h:Household)
                WHERE h.booth_id IN $booth_ids
                RETURN count(h) as total, sum(CASE WHEN h.covered = true THEN 1 ELSE 0 END) as covered
                """
                hq_res = neo4j_client.run_query(hq, {"booth_ids": booth_codes})
                if hq_res and hq_res[0]['total'] > 0:
                    coverage_pct = round((hq_res[0]['covered'] / hq_res[0]['total']) * 100, 1)
            
            # Count volunteers for the mandal
            vol_count = session.exec(select(func.count(Volunteer.id)).where(Volunteer.booth_id.in_(booth_codes))).one() if booth_codes else 0
            
            # Find Mandal Incharge
            incharge = session.exec(select(User.display_name).where(User.mandal_id == m.code, User.role == "MANDAL_MGR")).first() or "Not Assigned"
            
            results.append({
                "code": m.code,
                "name": m.name,
                "incharge": incharge,
                "score": avg_score,
                "coverage_pct": coverage_pct,
                "volunteers": vol_count
            })
        return results

    @staticmethod
    def get_constituency_booth_directory(constituency_code: str, session: Session) -> list:
        constituency = session.exec(select(HierarchyNode).where(HierarchyNode.code == constituency_code, HierarchyNode.level == "constituency")).first()
        if not constituency: return []
        
        mandals = session.exec(select(HierarchyNode).where(HierarchyNode.parent_id == constituency.id, HierarchyNode.level == "mandal")).all()
        
        from app.api.v1.endpoints.dashboard import _booth_voter_stats, _count_users
        
        results = []
        for m in mandals:
            booths = session.exec(select(HierarchyNode).where(HierarchyNode.parent_id == m.id, HierarchyNode.level == "booth")).all()
            mandal_booths = []
            for b in booths:
                # Basic stats
                score_data = BOSIEngine.calculate_booth_score(b.code, session)
                # Demographic stats
                v_stats = _booth_voter_stats(b.code)
                # Volunteer count
                vol_count = _count_users(session, "VOLUNTEER", booth_id=b.code)
                
                mandal_booths.append({
                    "code": b.code,
                    "name": b.name,
                    "voters": v_stats["total"],
                    "households": v_stats["households"],
                    "male": v_stats["male"],
                    "female": v_stats["female"],
                    "youth": v_stats["youth"],
                    "seniors": v_stats["seniors"],
                    "coverage_pct": score_data["coverage_pct"],
                    "score": score_data["score"],
                    "volunteers": vol_count
                })
            
            results.append({
                "mandal_code": m.code,
                "mandal_name": m.name,
                "booths": mandal_booths
            })
        return results

    @staticmethod
    def get_constituency_bosi_average(constituency_code: str, session: Session) -> float:
        mandals = BOSIEngine.get_constituency_mandal_scores(constituency_code, session)
        if not mandals: return 0.0
        avg = sum(m['score'] for m in mandals) / len(mandals)
        return round(avg, 1)
