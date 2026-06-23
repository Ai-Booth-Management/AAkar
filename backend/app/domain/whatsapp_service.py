"""
whatsapp_service.py
--------------------
Starter integration with Meta's WhatsApp Cloud API for the AAkar backend.

WHAT THIS DOES
1. Lets your backend SEND a WhatsApp message to a volunteer's phone
   (e.g. when a task is assigned or a broadcast is sent).
2. Gives you a WEBHOOK endpoint so WhatsApp can notify your backend when a
   volunteer REPLIES (e.g. they text "DONE" to confirm a task).

HOW TO PLUG THIS IN
- Drop this file into:  backend/app/domain/whatsapp_service.py
- Add the env vars below to your existing backend/.env
- In your FastAPI app (main.py or wherever routers are registered), add:
      from app.domain.whatsapp_service import router as whatsapp_router
      app.include_router(whatsapp_router, prefix="/api/v1/whatsapp")

ENV VARS NEEDED (add to backend/.env, same file that already has NEO4J_URI etc.)
    WHATSAPP_TOKEN=<your temporary or system-user access token from Meta>
    WHATSAPP_PHONE_NUMBER_ID=<the Phone Number ID shown in Meta dashboard>
    WHATSAPP_VERIFY_TOKEN=<any string you make up, used to verify the webhook>

WHERE TO GET THOSE VALUES
1. Go to developers.facebook.com -> create a free developer account
2. Create an App -> add the "WhatsApp" product
3. The API Setup screen shows your test Phone Number ID + a temporary token
4. Add up to 5 test recipient numbers on that same screen (your phone,
   teammates' phones) and verify them with the code WhatsApp sends

IMPORTANT GOTCHA (read this before you panic that sending "doesn't work")
Outside an active 24-hour conversation, WhatsApp Business requires
pre-approved message TEMPLATES for the first outbound message - you can't
just send free-form text to someone who hasn't messaged you first.
Easiest fix for your demo: have your test volunteer numbers send "hi" to
the test number first. That opens a 24h window during which you CAN send
free-form text (the send_text function below). No template approval needed.
"""

import httpx
import json
import logging
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Query
from sqlmodel import Session, select
from app.core.config import settings
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.volunteer import Volunteer, VolunteerTask, ConversationState

logger = logging.getLogger(__name__)

router = APIRouter()

WHATSAPP_TOKEN = settings.WHATSAPP_TOKEN
PHONE_NUMBER_ID = settings.WHATSAPP_PHONE_NUMBER_ID
VERIFY_TOKEN = settings.WHATSAPP_VERIFY_TOKEN

GRAPH_API_URL = f"https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages"


# ---------------------------------------------------------------------------
# SENDING MESSAGES
# ---------------------------------------------------------------------------

async def send_text(to: str, message: str) -> dict:
    """
    Sends a free-form text message. Only works if the recipient has
    messaged your test number within the last 24 hours (see gotcha above).
    `to` should be a phone number in international format, no '+', e.g. '919876543210'
    """
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
        # Don't let a WhatsApp failure crash the whole request - log and surface clearly
        raise HTTPException(status_code=502, detail=f"WhatsApp send failed: {resp.text}")
    return resp.json()


async def send_template(to: str, template_name: str, lang_code: str = "en_US") -> dict:
    """
    Sends a pre-approved template message. Use this for the very FIRST
    message to someone (before they've messaged you), e.g. 'hello_world'
    which Meta gives you by default for testing.
    """
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


# ---------------------------------------------------------------------------
# FASTAPI ENDPOINTS - wire your dashboard buttons to these
# ---------------------------------------------------------------------------

@router.post("/send")
async def send_whatsapp_endpoint(to: str, message: str):
    """
    Call this from your broadcast/task-assignment flow, e.g.:
        POST /api/v1/whatsapp/send?to=919876543210&message=New task assigned
    Mirrors the same pattern as your existing /api/v1/broadcasts/ endpoint.
    """
    result = await send_text(to, message)
    return {"status": "sent", "whatsapp_response": result}


# ---------------------------------------------------------------------------
# RECEIVING REPLIES (the "stretch goal" / two-way piece)
# ---------------------------------------------------------------------------

@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    """
    Meta calls this ONCE when you register your webhook URL in the dashboard,
    just to confirm you own the endpoint. You don't need to touch this logic -
    it just needs to echo back hub_challenge if the token matches.
    """
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content=hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


# ---------------------------------------------------------------------------
# MEDIA DOWNLOAD HELPER
# ---------------------------------------------------------------------------

async def download_media(media_id: str) -> bytes:
    """Download media from WhatsApp via the Meta Graph API."""
    async with httpx.AsyncClient() as client:
        # Step 1: Get the download URL from the media ID
        resp = await client.get(
            f"https://graph.facebook.com/v20.0/{media_id}",
            headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"},
        )
        resp.raise_for_status()
        download_url = resp.json()["url"]

        # Step 2: Download the actual binary
        media_resp = await client.get(
            download_url,
            headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"},
        )
        media_resp.raise_for_status()
        return media_resp.content


# ---------------------------------------------------------------------------
# WEBHOOK MESSAGE HANDLER
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def receive_whatsapp_message(request: Request):
    """
    Meta POSTs here every time a volunteer sends a WhatsApp message to your
    test number. Handles:
    - Registration flow (new volunteers texting 'hi')
    - Task completion (registered volunteers texting 'DONE' or sending a photo)
    """
    body = await request.json()
    print("\n--- INCOMING WHATSAPP WEBHOOK ---")
    print(json.dumps(body, indent=2))

    try:
        entry = body["entry"][0]
        change = entry["changes"][0]
        value = change["value"]
        messages = value.get("messages")
        if not messages:
            return {"status": "ignored"}  # e.g. delivery receipts, not actual messages

        msg = messages[0]
        from_number = msg["from"]
        msg_type = msg.get("type", "text")
        text_body = msg.get("text", {}).get("body", "").strip()

        with Session(engine) as session:
            # Look up volunteer by phone number
            volunteer = session.exec(
                select(Volunteer).where(Volunteer.phone == from_number)
            ).first()

            if volunteer is None:
                # --- UNREGISTERED: handle registration flow ---
                state = session.exec(
                    select(ConversationState).where(ConversationState.phone == from_number)
                ).first()

                if state is None:
                    if text_body.lower() == "hi":
                        state = ConversationState(
                            phone=from_number,
                            current_step="awaiting_name",
                            collected_data="{}",
                            updated_at=datetime.now(timezone.utc),
                        )
                        session.add(state)
                        session.commit()
                        await send_text(
                            from_number,
                            "Welcome to AAkar! Let's get you registered as a volunteer. "
                            "What is your full name?",
                        )
                    else:
                        await send_text(from_number, "Send hi to register as a volunteer.")

                elif state.current_step == "awaiting_name":
                    data = json.loads(state.collected_data)
                    data["name"] = text_body
                    state.collected_data = json.dumps(data)
                    state.current_step = "awaiting_booth"
                    state.updated_at = datetime.now(timezone.utc)
                    session.add(state)
                    session.commit()
                    await send_text(
                        from_number,
                        f"Thanks {text_body}! What is your Booth ID? (e.g. B-42)",
                    )

                elif state.current_step == "awaiting_booth":
                    data = json.loads(state.collected_data)
                    name = data.get("name", "")
                    volunteer = Volunteer(
                        phone=from_number,
                        name=name,
                        booth_id=text_body,
                        status="active",
                    )
                    session.add(volunteer)
                    session.delete(state)
                    session.commit()
                    await send_text(
                        from_number,
                        f"\u2705 Registration complete! Welcome to the team, {name}. "
                        "You will receive task assignments here.",
                    )

            else:
                # --- REGISTERED VOLUNTEER ---
                if msg_type == "text" and text_body.upper() == "DONE":
                    task = session.exec(
                        select(VolunteerTask)
                        .where(VolunteerTask.volunteer_id == volunteer.id, VolunteerTask.status == "assigned")
                        .order_by(VolunteerTask.assigned_at.desc())
                    ).first()

                    if task:
                        task.status = "completed"
                        task.completed_at = datetime.now(timezone.utc)
                        session.add(task)
                        session.commit()
                        await send_text(from_number, "\u2705 Task marked complete. Thank you!")
                    else:
                        await send_text(from_number, "No active task found for you right now.")

                elif msg_type == "image":
                    media_id = msg["image"]["id"]
                    task = session.exec(
                        select(VolunteerTask)
                        .where(VolunteerTask.volunteer_id == volunteer.id, VolunteerTask.status == "assigned")
                        .order_by(VolunteerTask.assigned_at.desc())
                    ).first()

                    if task:
                        image_bytes = await download_media(media_id)
                        proof_dir = os.path.join("data", "uploads", "task_proofs")
                        os.makedirs(proof_dir, exist_ok=True)
                        proof_path = os.path.join(proof_dir, f"{task.id}.jpg")
                        with open(proof_path, "wb") as f:
                            f.write(image_bytes)

                        task.proof_image_path = proof_path
                        task.status = "completed"
                        task.completed_at = datetime.now(timezone.utc)
                        session.add(task)
                        session.commit()
                        await send_text(from_number, "\u2705 Photo received. Task marked complete!")
                    else:
                        await send_text(
                            from_number,
                            "No active task found to attach this photo to.",
                        )

                else:
                    await send_text(
                        from_number,
                        "Reply DONE or send a photo to complete your current task.",
                    )

    except Exception as e:
        logger.error(f"Error processing WhatsApp webhook: {e}", exc_info=True)
        return {"status": "error"}

    return {"status": "received"}
