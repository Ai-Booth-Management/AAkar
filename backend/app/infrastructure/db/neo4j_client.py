from neo4j import GraphDatabase, NotificationMinimumSeverity
from neo4j.graph import Node, Relationship, Path
from app.core.config import settings


class Neo4jClient:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
            max_connection_pool_size=50,
            connection_timeout=30,
            max_transaction_retry_time=15,
            keep_alive=True,
        )

    def close(self):
        self.driver.close()

    def run_query(self, query: str, parameters: dict = None):
        """Run a Cypher query and return results as list of dicts."""
        with self.driver.session(notifications_min_severity=NotificationMinimumSeverity.OFF) as session:
            result = session.run(query, parameters)
            return [record.data() for record in result]

    def ensure_indexes(self):
        """Create constraints and indexes if they don't exist (idempotent)."""
        try:
            self.run_query("RETURN 1")
        except Exception as e:
            print(f"Warning: Neo4j is not reachable. Skipping index creation.")
            return

        constraints = [
            "CREATE CONSTRAINT IF NOT EXISTS FOR (v:Voter) REQUIRE v.epic IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (b:Booth) REQUIRE b.booth_id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (h:House) REQUIRE h.house_id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Complaint) REQUIRE c.complaint_id IS UNIQUE",
        ]
        indexes = [
            "CREATE INDEX IF NOT EXISTS FOR (v:Voter) ON (v.section)",
            "CREATE INDEX IF NOT EXISTS FOR (v:Voter) ON (v.name)",
            "CREATE INDEX IF NOT EXISTS FOR (v:Voter) ON (v.gender)",
            "CREATE INDEX IF NOT EXISTS FOR (c:Complaint) ON (c.status)",
            "CREATE INDEX IF NOT EXISTS FOR (c:Complaint) ON (c.type)",
            "CREATE INDEX IF NOT EXISTS FOR (b:Booth) ON (b.risk_level)",
            "CREATE INDEX IF NOT EXISTS FOR (a:Area) ON (a.name)",
        ]
        for stmt in constraints + indexes:
            try:
                self.run_query(stmt)
            except Exception as e:
                print(f"Warning: Failed to create index/constraint: {e}")

    # ---- Schema introspection ----

    def get_schema(self) -> str:
        """Fetch labels, relationship types, and property keys from Neo4j
        and return a human-readable schema string for the LLM prompt."""
        return """
Nodes and their Properties:
- Voter: epic, name, age, gender, relation_name, relation_type, assembly, section, phone, category
- House: house_no, booth_id
- Booth: booth_id, risk_level, complaint_count, resolved_count, recommendation, open_count
- Complaint: complaint_id, type, timestamp, status, phone, description

Relationships:
- (Voter)-[:LIVES_IN]->(House)
- (House)-[:PART_OF]->(Booth)
- (Voter)-[:REPORTED]->(Complaint)
- (Complaint)-[:IN_BOOTH]->(Booth)
"""

    # ---- Raw record query (for graph extraction) ----

    def run_read_query_raw(self, query: str, parameters: dict = None):
        """Execute a read Cypher query and return raw Record objects
        so we can inspect Node/Relationship/Path types."""
        with self.driver.session() as session:
            result = session.run(query, parameters)
            return list(result)

    # ---- Graph data extraction for vis-network ----

    @staticmethod
    def extract_graph(records) -> dict:
        """Walk raw Neo4j records and extract nodes and edges for vis-network.

        Returns: { "nodes": [...], "edges": [...] }
        Each node: { id, label, title (tooltip), properties }
        Each edge: { from, to, label, properties }
        """
        nodes_map = {}
        edges_list = []

        def _add_node(node: Node):
            nid = node.element_id
            if nid not in nodes_map:
                node_labels = list(node.labels)
                nodes_map[nid] = {
                    "id": nid,
                    "label": node_labels[0] if node_labels else "Unknown",
                    "title": "\n".join(f"{k}: {v}" for k, v in dict(node).items()),
                    "properties": dict(node),
                    "group": node_labels[0] if node_labels else "Unknown",
                }

        def _add_relationship(rel: Relationship):
            _add_node(rel.start_node)
            _add_node(rel.end_node)
            edges_list.append(
                {
                    "from": rel.start_node.element_id,
                    "to": rel.end_node.element_id,
                    "label": rel.type,
                    "properties": dict(rel),
                }
            )

        def _process_value(val):
            if isinstance(val, Node):
                _add_node(val)
            elif isinstance(val, Relationship):
                _add_relationship(val)
            elif isinstance(val, Path):
                for node in val.nodes:
                    _add_node(node)
                for rel in val.relationships:
                    _add_relationship(rel)
            elif isinstance(val, list):
                for item in val:
                    _process_value(item)

        for record in records:
            for value in record.values():
                _process_value(value)

        return {
            "nodes": list(nodes_map.values()),
            "edges": edges_list,
        }


neo4j_client = Neo4jClient()
__all__ = ["neo4j_client"]
