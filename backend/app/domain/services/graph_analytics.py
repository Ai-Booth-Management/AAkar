import networkx as nx
import community.community_louvain as community_louvain
from app.infrastructure.db.neo4j_client import neo4j_client


def get_network_analytics():
    """
    Fetches the full entity graph from Neo4j, loads it into an in-memory 
    NetworkX graph, and calculates PageRank (Node Importance) and 
    Louvain Modularity (Community Clusters).
    """

    # 1. Fetch Nodes
    nodes_query = """
    MATCH (n)
    RETURN 
        id(n) AS id,
        labels(n)[0] AS label,

        CASE 
            WHEN n:Booth THEN n.booth_id
            WHEN n:Area THEN n.name
            WHEN n:House THEN n.house_no
            
            WHEN n:Voter THEN n.name
            WHEN n:Complaint THEN n.type
            ELSE "Node_" + toString(id(n))
        END AS name,

        coalesce(n.risk_level, "Low") AS risk_level,
        coalesce(n.sentiment, "Neutral") AS sentiment
    """
    nodes_result = neo4j_client.run_query(nodes_query)

    # 2. Fetch Edges
    edges_query = """
    MATCH (n)-[r]->(m)
    WHERE type(r) IN [
        "HAS_AREA",
        "HAS_HOUSE",
        "HAS_FAMILY",
        "HAS_MEMBER",
        "REPORTED",
        "BELONGS_TO",
        "LOCATED_IN",
        "IN_BOOTH"
    ]
    RETURN 
        id(n) AS source,
        id(m) AS target,
        type(r) AS type
    """
    edges_result = neo4j_client.run_query(edges_query)

    # 3. Build NetworkX Graphs
    DG = nx.DiGraph()  # Directed for PageRank

    for row in nodes_result:
        DG.add_node(
            row["id"],
            label=row["label"],
            name=row["name"],
            risk_level=row["risk_level"],
            sentiment=row["sentiment"]
        )

    for row in edges_result:
        if row["source"] is not None and row["target"] is not None:
            DG.add_edge(row["source"], row["target"], type=row["type"])

    # 4. Compute PageRank
    pagerank_scores = nx.pagerank(DG, alpha=0.85, weight=None)

    # 5. Compute Louvain Communities
    UG = DG.to_undirected()

    if len(UG.nodes) == 0:
        return {"nodes": [], "links": []}

    partition = community_louvain.best_partition(UG)

    # 6. Format Payload
    response_nodes = []
    for n, data in DG.nodes(data=True):
        response_nodes.append({
            "id": n,
            "label": data["label"],
            "name": data["name"],
            "risk_level": data["risk_level"],
            "sentiment": data["sentiment"],
            "val": pagerank_scores.get(n, 0) * 100,
            "community": partition.get(n, 0)
        })

    response_links = []
    for u, v, attrs in DG.edges(data=True):
        response_links.append({
            "source": u,
            "target": v,
            "type": attrs["type"]
        })

    return {
        "nodes": response_nodes,
        "links": response_links
    }