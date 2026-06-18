from app.infrastructure.db.neo4j_client import neo4j_client
from datetime import datetime

def seed_broadcasts():
    broadcasts = [
        {
            "message": "URGENT: All District Admins to review booth saturation by EOD.",
            "target_type": "GLOBAL",
            "target_id": "ALL",
            "sender_role": "STATE_ADMIN",
            "created_at": datetime.now().isoformat()
        },
        {
            "message": "Strategy Node UP: Focusing on urban youth turnout this weekend.",
            "target_type": "STATE",
            "target_id": "UP",
            "sender_role": "STATE_ADMIN",
            "created_at": datetime.now().isoformat()
        },
        {
            "message": "Field Alert: Rain expected in Lucknow East. Safeguard booth material.",
            "target_type": "DISTRICT",
            "target_id": "LUCKNOW",
            "sender_role": "DISTRICT_ADMIN",
            "created_at": datetime.now().isoformat()
        }
    ]

    for b in broadcasts:
        query = """
        CREATE (br:Broadcast {
            message: $message,
            target_type: $target_type,
            target_id: $target_id,
            sender_role: $sender_role,
            created_at: $created_at
        })
        """
        neo4j_client.run_query(query, b)
    print("✅ Seeded 3 test broadcasts into Neo4j.")

if __name__ == "__main__":
    seed_broadcasts()
