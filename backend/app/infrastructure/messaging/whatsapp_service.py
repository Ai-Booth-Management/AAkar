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
- Drop this file into:  backend/app/infrastructure/messaging/whatsapp_service.py
- Add the env vars below to your existing backend/.env
- In your FastAPI app (main.py or wherever routers are registered), add:
      from app.infrastructure.messaging.whatsapp_service import router as whatsapp_router
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
import asyncio
import base64
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from sqlmodel import Session, select
from app.core.security import get_current_user
from app.core.config import settings
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.hierarchy import HierarchyNode
from app.domain.models.volunteer import Volunteer, VolunteerTask, ConversationState
from app.domain.services.ask_election_service import ask_election_question


logger = logging.getLogger(__name__)

router = APIRouter()

WHATSAPP_TOKEN = settings.WHATSAPP_TOKEN
PHONE_NUMBER_ID = settings.WHATSAPP_PHONE_NUMBER_ID
VERIFY_TOKEN = settings.WHATSAPP_VERIFY_TOKEN

GRAPH_API_URL = f"https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages"

# Simulation mode: when token is dummy, buffer replies for the simulator endpoint
_simulated_replies: list[str] = []
_sim_media_bytes: bytes | None = None
_IS_SIMULATION = WHATSAPP_TOKEN in ("dummy_token", "", "your_meta_whatsapp_access_token")


# ---------------------------------------------------------------------------
# REGISTRATION HELPERS
# ---------------------------------------------------------------------------


def _parse_choice(text: str, nodes: list[HierarchyNode]) -> int | None:
    try:
        choice = int(text.strip())
        if 1 <= choice <= len(nodes):
            return choice
    except (ValueError, AttributeError):
        pass
        
    text_lower = text.strip().lower()
    for i, node in enumerate(nodes, 1):
        if node.name.lower() == text_lower:
            return i
            
    return None


def _get_children_by_code(
    session: Session, parent_code: str, parent_level: str, child_level: str
) -> list[HierarchyNode]:
    parent = session.exec(
        select(HierarchyNode).where(
            HierarchyNode.code == parent_code,
            HierarchyNode.level == parent_level,
        )
    ).first()
    if not parent:
        return []
    return list(session.exec(
        select(HierarchyNode).where(
            HierarchyNode.parent_id == parent.id,
            HierarchyNode.level == child_level,
        )
    ).all())


def _format_numbered_list(nodes: list[HierarchyNode], show_code: bool = False) -> str:
    return "\n".join(
        f"{i}) {n.name}" + (f" ({n.code})" if show_code else "")
        for i, n in enumerate(nodes, 1)
    )


# ---------------------------------------------------------------------------
# SENDING MESSAGES
# ---------------------------------------------------------------------------

async def send_text(to: str, message: str) -> dict:
    """
    Sends a free-form text message. In simulation mode (dummy token),
    buffers the reply for the /simulate endpoint instead of calling Meta.
    """
    if _IS_SIMULATION:
        _simulated_replies.append(message)
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
# FASTAPI ENDPOINTS
# ---------------------------------------------------------------------------


@router.post("/simulate")
async def simulate_whatsapp(body: dict, _user=Depends(get_current_user)):
    """
    Simulates a WhatsApp message. Used by the frontend WhatsApp Simulator.
    Accepts { phone, message } for text, or { phone, is_image: true, image_data: "<base64>" }
    for image uploads. Processes through the same webhook logic and returns the bot's replies.
    """
    global _simulated_replies, _sim_media_bytes
    _simulated_replies = []
    _sim_media_bytes = None

    phone = body.get("phone", "917696138229")

    if body.get("is_image") and body.get("image_data"):
        _sim_media_bytes = base64.b64decode(body["image_data"])
        mock_payload = {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "from": phone,
                            "type": "image",
                            "image": {"id": "sim_media_1", "mime_type": "image/jpeg"},
                        }]
                    }
                }]
            }]
        }
    else:
        message = body.get("message", "hi")
        mock_payload = {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "from": phone,
                            "type": "text",
                            "text": {"body": message},
                        }]
                    }
                }]
            }]
        }

    class _MockRequest:
        async def json(self):
            return mock_payload

    await receive_whatsapp_message(_MockRequest())  # type: ignore[arg-type]

    replies = list(_simulated_replies)
    _simulated_replies = []
    return {"phone": phone, "replies": replies}


@router.post("/send")
async def send_whatsapp_endpoint(to: str, message: str, _user=Depends(get_current_user)):
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
    global _sim_media_bytes
    if _IS_SIMULATION and _sim_media_bytes is not None:
        data = _sim_media_bytes
        _sim_media_bytes = None
        return data

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
            # Handle reset for both registered and unregistered users
            if text_body.lower() in ("reset", "restart"):
                state = session.exec(
                    select(ConversationState).where(ConversationState.phone == from_number)
                ).first()
                if state:
                    session.delete(state)
                volunteer_to_delete = session.exec(
                    select(Volunteer).where(Volunteer.phone == from_number)
                ).first()
                if volunteer_to_delete:
                    session.delete(volunteer_to_delete)
                session.commit()
                await send_text(from_number, "Conversation reset. Send 'hi' to start.")
                return {"status": "received"}

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
                    state.current_step = "awaiting_pincode"
                    state.updated_at = datetime.now(timezone.utc)
                    session.add(state)
                    session.commit()
                    await send_text(
                        from_number,
                        f"Thanks {text_body}! What is your Pincode?",
                    )

                elif state.current_step == "awaiting_pincode":
                    pincode = text_body
                    
                    # Validate pincode
                    state_name = ""
                    district_name = ""
                    area_name = ""
                    circle = ""
                    division = ""
                    region = ""
                    block = ""
                    is_valid = False
                    try:
                        async with httpx.AsyncClient() as client:
                            resp = await client.get(f"https://api.postalpincode.in/pincode/{pincode}", timeout=5.0)
                            if resp.status_code == 200:
                                pin_data = resp.json()
                                if pin_data and pin_data[0].get("Status") == "Success":
                                    is_valid = True
                                    post_office = pin_data[0]["PostOffice"][0]
                                    state_name = post_office.get("State", "")
                                    district_name = post_office.get("District", "")
                                    area_name = post_office.get("Name", "")
                                    circle = post_office.get("Circle", "")
                                    division = post_office.get("Division", "")
                                    region = post_office.get("Region", "")
                                    block = post_office.get("Block", "")
                    except Exception as e:
                        logger.error(f"Error validating pincode: {e}")
                        is_valid = True # Fallback if API is down
                    
                    if not is_valid:
                        await send_text(
                            from_number,
                            "Invalid pincode. Please try again with a valid 6-digit Pincode."
                        )
                    else:
                        data = json.loads(state.collected_data)
                        data["pincode"] = pincode
                        data["state"] = state_name
                        data["district"] = district_name
                        data["area_name"] = area_name
                        data["circle"] = circle
                        data["division"] = division
                        data["region"] = region
                        data["block"] = block
                        state.collected_data = json.dumps(data)
                        state.current_step = "awaiting_address"
                        state.updated_at = datetime.now(timezone.utc)
                        session.add(state)
                        session.commit()
                        
                        msg = f"Got it. What is your House/Flat No. and Street Name?"
                        if state_name and district_name:
                            msg = f"Valid pincode detected ({area_name}, {district_name}, {state_name}).\n" + msg
                            
                        await send_text(from_number, msg)

                elif state.current_step == "awaiting_address":
                    data = json.loads(state.collected_data)
                    data["address"] = text_body
                    state.collected_data = json.dumps(data)
                    state.current_step = "awaiting_aadhar"
                    state.updated_at = datetime.now(timezone.utc)
                    session.add(state)
                    session.commit()
                    
                    await send_text(
                        from_number,
                        "Thanks! Finally, what is your Aadhar number?"
                    )

                elif state.current_step == "awaiting_aadhar":
                    data = json.loads(state.collected_data)
                    aadhar = text_body
                    pincode = data.get("pincode", "")
                    name = data.get("name", "")
                    address = data.get("address", "")
                    state_name = data.get("state", "")
                    district_name = data.get("district", "")
                    area_name = data.get("area_name", "")
                    circle = data.get("circle", "")
                    division = data.get("division", "")
                    region = data.get("region", "")
                    block = data.get("block", "")
                    
                    volunteer = Volunteer(
                        phone=from_number,
                        name=name,
                        booth_id=None,  # Not using booth_id if we only ask pincode
                        status="active",
                    )
                    session.add(volunteer)
                    session.delete(state)
                    session.commit()
                    
                    try:
                        json_path = os.path.join("data", "uploads", "volunteers.json")
                        os.makedirs(os.path.dirname(json_path), exist_ok=True)
                        vol_data = []
                        if os.path.exists(json_path):
                            with open(json_path, "r") as f:
                                try:
                                    vol_data = json.load(f)
                                except json.JSONDecodeError:
                                    pass
                        vol_data.append({
                            "phone": from_number,
                            "name": name,
                            "address": address,
                            "pincode": pincode,
                            "area_name": area_name,
                            "block": block,
                            "district": district_name,
                            "division": division,
                            "region": region,
                            "circle": circle,
                            "state": state_name,
                            "aadhar": aadhar,
                            "registered_at": datetime.now(timezone.utc).isoformat()
                        })
                        with open(json_path, "w") as f:
                            json.dump(vol_data, f, indent=2)
                    except Exception as e:
                        logger.error(f"Failed to save volunteer to JSON: {e}")

                    await send_text(
                        from_number,
                        f"\u2705 Registration complete! Welcome to the team, {name}.\n"
                        f"Your Pincode: {pincode}\n"
                        f"Your Aadhar: {aadhar}\n"
                        "You will receive task assignments here.",
                    )


                else:
                    state.current_step = "awaiting_name"
                    state.collected_data = "{}"
                    state.updated_at = datetime.now(timezone.utc)
                    session.add(state)
                    session.commit()
                    await send_text(
                        from_number,
                        "Let's restart. What is your full name?",
                    )

            else:
                # --- REGISTERED VOLUNTEER ---
                if msg_type == "text" and text_body.upper() == "DONE":
                    task = session.exec(
                        select(VolunteerTask)
                        .where(VolunteerTask.volunteer_id == volunteer.id, VolunteerTask.status == "assigned")
                        .order_by(VolunteerTask.assigned_at.desc())  # type: ignore[attr-defined]
                    ).first()

                    if task:
                        task.status = "completed"
                        task.completed_at = datetime.now(timezone.utc)
                        session.add(task)
                        session.commit()
                        await send_text(from_number, "✅ Task marked complete. Thank you!")
                    else:
                        await send_text(from_number, "No active task found for you right now.")

                elif msg_type == "image":
                    media_id = msg["image"]["id"]
                    task = session.exec(
                        select(VolunteerTask)
                        .where(VolunteerTask.volunteer_id == volunteer.id, VolunteerTask.status == "assigned")
                        .order_by(VolunteerTask.assigned_at.desc())  # type: ignore[attr-defined]
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
                        await send_text(from_number, "✅ Photo received. Task marked complete!")
                    else:
                        await send_text(
                            from_number,
                            "No active task found to attach this photo to.",
                        )

                else:
                    # Treat anything else as a question to the LLM
                    try:
                        # ask_election_question does synchronous network/DB calls,
                        # wrap it in to_thread to avoid blocking the event loop.
                        llm_response = await asyncio.to_thread(ask_election_question, text_body, None, volunteer)
                        answer = llm_response.get("answer", "I couldn't process your question right now.")
                        await send_text(from_number, str(answer))
                    except Exception as llm_error:
                        logger.error(f"Error calling LLM from WhatsApp: {llm_error}", exc_info=True)
                        await send_text(
                            from_number,
                            "Sorry, I encountered an issue processing your request.",
                        )

    except Exception as e:
        logger.error(f"Error processing WhatsApp webhook: {e}", exc_info=True)
        return {"status": "error"}

    return {"status": "received"}
