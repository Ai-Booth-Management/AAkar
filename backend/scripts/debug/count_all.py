import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.infrastructure.db.neo4j_client import neo4j_client


def count_all():
    nodes = neo4j_client.run_query("MATCH (n) RETURN count(n) as c")[0]["c"]
    edges = neo4j_client.run_query("MATCH ()-[r]->() RETURN count(r) as c")[0]["c"]
    print(f"Total Nodes: {nodes}, Total Edges: {edges}")


if __name__ == "__main__":
    count_all()
