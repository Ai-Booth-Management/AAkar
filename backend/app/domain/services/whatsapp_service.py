import httpx
import logging
from fastapi import HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)

WHATSAPP_TOKEN = settings.WHATSAPP_TOKEN
PHONE_NUMBER_ID = settings.WHATSAPP_PHONE_NUMBER_ID
GRAPH_API_URL = f"https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages"

# ── Simulation state ────────────────────────────────────────────────────────────
_simulated_replies = []
_sim_media_bytes = None
_in_simulation = False  # Set True by /simulate endpoint so all I/O is intercepted
_IS_SIMULATION = WHATSAPP_TOKEN in ("dummy_token", "", "your_meta_whatsapp_access_token")


async def send_text(to: str, message: str) -> dict:
    global _simulated_replies
    _simulated_replies.append(message)
    # Skip real API when either the token marks simulation OR we're in a /simulate call
    if _IS_SIMULATION or _in_simulation:
        return {"status": "simulated", "to": to, "message": message}

    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": message},
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(GRAPH_API_URL, headers=headers, json=payload)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"WhatsApp send failed: {resp.text}")
    return resp.json()

async def send_template(to: str, template_name: str, lang_code: str = "en_US") -> dict:
    if _IS_SIMULATION or _in_simulation:
        return {"status": "simulated"}
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {"name": template_name, "language": {"code": lang_code}},
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(GRAPH_API_URL, headers=headers, json=payload)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"WhatsApp template send failed: {resp.text}")
    return resp.json()

async def download_media(media_id: str) -> bytes:
    global _sim_media_bytes
    # Always honour simulated media — check sentinel ID OR simulation flag
    if media_id == "sim_media_1" or _in_simulation or _IS_SIMULATION:
        data = _sim_media_bytes
        _sim_media_bytes = None
        if data is not None:
            return data
        # In simulation with no stored bytes, return minimal placeholder JPEG
        return b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9"

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://graph.facebook.com/v20.0/{media_id}",
            headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"},
        )
        resp.raise_for_status()
        download_url = resp.json()["url"]

        media_resp = await client.get(
            download_url,
            headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"},
        )
        media_resp.raise_for_status()
        return media_resp.content
