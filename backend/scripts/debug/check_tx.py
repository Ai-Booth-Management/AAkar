import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.infrastructure.db.neo4j_client import neo4j_client


def check_tx():
    try:
        # Get active queries
        print("Fetching active transactions...")
        res = neo4j_client.run_query("SHOW TRANSACTIONS")
        for tx in res:
            print(
                f"Transaction: {tx['transactionId']}, Database: {tx['database']}, Status: {tx['status']}, CurrentQuery: {tx['currentQuery']}"
            )

            # Kill any transaction that has been running too long (excluding our own SHOW TRANSACTIONS)
            if tx["currentQuery"] and "SHOW TRANSACTIONS" not in tx["currentQuery"]:
                print(f"Killing transaction {tx['transactionId']}...")
                try:
                    neo4j_client.run_query(
                        f"TERMINATE TRANSACTION '{tx['transactionId']}'"
                    )
                except Exception as e:
                    print("Could not terminate:", e)

        print("Done.")
    except Exception as e:
        print("Error fetching transactions:", e)


if __name__ == "__main__":
    check_tx()
