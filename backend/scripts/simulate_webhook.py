import httpx
import asyncio

WEBHOOK_URL = "http://localhost:8000/api/v1/whatsapp/webhook"
# Replace with any 12-digit number for local testing
PHONE_NUMBER = "919999999999"

def build_payload(text_body: str) -> dict:
    return {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "1234567890",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "1234567890", "phone_number_id": "1234567890"},
                    "contacts": [{"profile": {"name": "Test User"}, "wa_id": PHONE_NUMBER}],
                    "messages": [{
                        "from": PHONE_NUMBER,
                        "id": f"wamid.{text_body}",
                        "timestamp": "1710000000",
                        "type": "text",
                        "text": {"body": text_body}
                    }]
                },
                "field": "messages"
            }]
        }]
    }

async def simulate_message(text: str):
    print(f"\nSimulating incoming WhatsApp message: '{text}'...")
    payload = build_payload(text)
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(WEBHOOK_URL, json=payload)
            print(f"Backend responded with HTTP {resp.status_code}")
            if resp.status_code != 200:
                print(f"Response: {resp.text}")
        except Exception as e:
            print(f"Error: {e}")

async def main():
    print("--- Starting Simulated Volunteer Registration ---")
    await simulate_message("hi")
    await asyncio.sleep(1)
    
    await simulate_message("Ayush")
    await asyncio.sleep(1)
    
    await simulate_message("B102")
    await asyncio.sleep(1)
    
    print("\n--- Simulation Complete ---")
    print("Check your BoothDashboard (Booth B102) now. 'Ayush' should be listed in the Team tab!")

if __name__ == "__main__":
    asyncio.run(main())
