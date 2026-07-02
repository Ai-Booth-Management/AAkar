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
import asyncio
import base64
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from sqlmodel import Session, select
from app.core.security import get_current_user
from app.core.config import settings
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.volunteer import Volunteer, Task, ConversationState
from app.domain.services.ask_election_service import ask_election_question
import app.domain.services.whatsapp_service as ws_service
from app.domain.services.whatsapp_service import send_text, download_media
from app.domain.services import booth_demographics

logger = logging.getLogger(__name__)

router = APIRouter()

WHATSAPP_TOKEN = settings.WHATSAPP_TOKEN
PHONE_NUMBER_ID = settings.WHATSAPP_PHONE_NUMBER_ID
VERIFY_TOKEN = settings.WHATSAPP_VERIFY_TOKEN

GRAPH_API_URL = f"https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages"



# ---------------------------------------------------------------------------
# FASTAPI ENDPOINTS
# ---------------------------------------------------------------------------


@router.post("/simulate")
async def simulate_whatsapp(body: dict):
    """
    Simulates a WhatsApp message. Used by the frontend WhatsApp Simulator.
    Accepts { phone, message } for text, or { phone, is_image: true, image_data: "<base64>" }
    for image uploads. Processes through the same webhook logic and returns the bot's replies.
    """
    ws_service._simulated_replies = []
    ws_service._sim_media_bytes = None

    phone = body.get("phone", "917696138229")

    if body.get("is_image") and body.get("image_data"):
        ws_service._sim_media_bytes = base64.b64decode(body["image_data"])
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
    elif body.get("is_location") and body.get("latitude") and body.get("longitude"):
        mock_payload = {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "from": phone,
                            "type": "location",
                            "location": {
                                "latitude": body["latitude"],
                                "longitude": body["longitude"],
                                "name": "Simulated GPS Location",
                                "address": ""
                            }
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

    await receive_whatsapp_message(_MockRequest())

    replies = list(ws_service._simulated_replies)
    ws_service._simulated_replies = []
    
    with Session(engine) as session:
        state_record = session.exec(
            select(ConversationState).where(ConversationState.phone == phone)
        ).first()
        current_step = state_record.current_step if state_record else None

    return {
        "phone": phone, 
        "replies": replies, 
        "conversation_state": {"current_step": current_step}
    }


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

        if msg_type == "location":
            loc = msg.get("location", {})
            lat = loc.get("latitude")
            lng = loc.get("longitude")
            addr = loc.get("address", "")
            name = loc.get("name", "")
            text_body = f"Lat: {lat}, Lng: {lng}"
            extra = ", ".join(filter(bool, [name, addr]))
            if extra:
                text_body += f" ({extra})"

        with Session(engine) as session:
            # Handle reset for both registered and unregistered users
            if text_body.lower() in ("reset", "restart"):
                state = session.exec(
                    select(ConversationState).where(ConversationState.phone == from_number)
                ).first()
                if state:
                    session.delete(state)
                session.commit()
                await send_text(from_number, "Conversation reset. You can send 'hi' or 'COMPLAINT' anytime.")
                return {"status": "received"}

            # Look up volunteer by phone number early so we can use it everywhere
            volunteer = session.exec(
                select(Volunteer).where(Volunteer.phone == from_number)
            ).first()

            # Load any active conversation state
            state = session.exec(
                select(ConversationState).where(ConversationState.phone == from_number)
            ).first()

            # --- COMPLAINT STATE MACHINE ---
            if state and state.current_step.startswith("complaint_"):
                if state.current_step == "complaint_image":
                    data = json.loads(state.collected_data)
                    image_path = ""
                    if msg_type == "image":
                        media_id = msg["image"]["id"]
                        image_bytes = await download_media(media_id)
                        import uuid
                        import os
                        os.makedirs("data/uploads/complaints", exist_ok=True)
                        filename = f"data/uploads/complaints/{uuid.uuid4()}.jpg"
                        with open(filename, "wb") as f:
                            f.write(image_bytes)
                        image_path = filename
                    elif text_body.lower() not in ["skip", "no"]:
                        await send_text(from_number, "Please attach an image, or type 'skip' to proceed without one.")
                        return {"status": "received"}
                        
                    data["image_path"] = image_path
                    state.collected_data = json.dumps(data)
                    state.current_step = "complaint_type"
                    state.updated_at = datetime.now(timezone.utc)
                    session.add(state)
                    session.commit()
                    await send_text(from_number, "What type of issue is this? (e.g., Water, Electricity, Road)")
                    return {"status": "received"}

                elif state.current_step == "complaint_type":
                    data = json.loads(state.collected_data)
                    data["type"] = text_body.strip()
                    state.collected_data = json.dumps(data)
                    state.current_step = "complaint_desc"
                    state.updated_at = datetime.now(timezone.utc)
                    session.add(state)
                    session.commit()
                    await send_text(from_number, "Please provide a brief description of the issue.")
                    return {"status": "received"}
                
                elif state.current_step == "complaint_desc":
                    data = json.loads(state.collected_data)
                    data["description"] = text_body.strip()
                    state.collected_data = json.dumps(data)
                    state.current_step = "complaint_location"
                    state.updated_at = datetime.now(timezone.utc)
                    session.add(state)
                    session.commit()
                    await send_text(from_number, "Please provide the exact location of the issue (e.g., Landmark, Street, or nearby area).")
                    return {"status": "received"}

                elif state.current_step == "complaint_location":
                    data = json.loads(state.collected_data)
                    data["location"] = text_body.strip()
                    
                    from app.api.v1.endpoints.complaints import lodge_volunteer_complaint_internal
                    try:
                        await lodge_volunteer_complaint_internal(
                            phone=from_number,
                            aadhar=volunteer.aadhar if volunteer.aadhar else "N/A",
                            pincode=volunteer.pincode if volunteer.pincode else "N/A",
                            issue_type=data.get("type", "General"),
                            description=data.get("description", ""),
                            location=data["location"],
                            image_path=data.get("image_path", ""),
                            booth_id=volunteer.booth_id if volunteer.booth_id else ""
                        )
                        await send_text(from_number, "✅ Your complaint has been registered successfully! You will also receive an SMS confirmation.")
                    except Exception as e:
                        logger.error(f"Failed to lodge complaint from WhatsApp: {e}")
                        await send_text(from_number, "❌ Sorry, there was an error registering your complaint. Please try again later.")
                    
                    session.delete(state)
                    session.commit()
                    return {"status": "received"}

            # --- START NEW COMPLAINT ---
            if not state and text_body.strip().upper() == "COMPLAINT":
                if volunteer is None:
                    await send_text(from_number, "You must be a registered volunteer to lodge a complaint. Send 'hi' to register.")
                    return {"status": "received"}
                
                state = ConversationState(
                    phone=from_number,
                    current_step="complaint_image",
                    collected_data="{}",
                    updated_at=datetime.now(timezone.utc)
                )
                session.add(state)
                session.commit()
                await send_text(from_number, "Please provide an image of the issue (or type 'skip' to lodge without one).")
                return {"status": "received"}

            if volunteer is None:
                # --- UNREGISTERED: handle registration flow ---
                if state is None:
                    if text_body.lower() == "register":
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
                        await send_text(from_number, "Welcome to AAkar! Reply 'REGISTER' if you want to register as a volunteer.")

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
                        state.current_step = "awaiting_booth_id"
                        state.updated_at = datetime.now(timezone.utc)
                        session.add(state)
                        session.commit()
                        
                        msg = f"Got it. What is your Booth Number / ID? (e.g. nd-rjn-m1-b1)"
                        if state_name and district_name:
                            msg = f"Valid pincode detected ({area_name}, {district_name}, {state_name}).\n" + msg
                            
                        await send_text(from_number, msg)

                elif state.current_step == "awaiting_booth_id":
                    data = json.loads(state.collected_data)
                    data["booth_id"] = text_body.strip()
                    state.collected_data = json.dumps(data)
                    state.current_step = "awaiting_address"
                    state.updated_at = datetime.now(timezone.utc)
                    session.add(state)
                    session.commit()
                    
                    await send_text(from_number, "Got it. What is your House/Flat No. and Street Name?")

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
                    booth_id = data.get("booth_id", "")
                    state_name = data.get("state", "")
                    district_name = data.get("district", "")
                    area_name = data.get("area_name", "")
                    circle = data.get("circle", "")
                    division = data.get("division", "")
                    region = data.get("region", "")
                    block = data.get("block", "")
                    
                    volunteer = session.exec(select(Volunteer).where(Volunteer.phone == from_number)).first()
                    if not volunteer:
                        volunteer = Volunteer(
                            phone=from_number,
                            booth_id=booth_id or None,
                            status="active",
                        )
                        session.add(volunteer)
                    
                    volunteer.name = name
                    volunteer.pincode = pincode
                    volunteer.address = address
                    volunteer.aadhar = aadhar
                    volunteer.booth_id = booth_id or None
                    volunteer.area_name = area_name
                    volunteer.block = block
                    volunteer.district = district_name
                    volunteer.division = division
                    volunteer.region = region
                    volunteer.circle = circle
                    volunteer.state = state_name

                    session.delete(state)
                    session.commit()
                    
                    try:
                        from app.domain.services.volunteer_sync import append_volunteer_to_json
                        # Re-fetch the volunteer object after commit so it has an id
                        volunteer = session.exec(select(Volunteer).where(Volunteer.phone == from_number)).first()
                        if volunteer:
                            append_volunteer_to_json(volunteer)
                    except Exception as e:
                        logger.error(f"Failed to sync volunteer to JSON: {e}")

                    await send_text(
                        from_number,
                        f"\u2705 Registration complete! Welcome to the team, {name}.\n"
                        f"Your Booth ID: {booth_id}\n"
                        f"Your Pincode: {pincode}\n"
                        f"Your Aadhar: {aadhar}\n"
                        "You will receive task assignments here.",
                    )
                    
                    menu = (
                        f"Welcome back {name}!\n\n"
                        "Reply with:\n"
                        "  • TASKS to see your assigned tasks\n"
                        "  • COMPLAINT to lodge an issue\n"
                        "  • Or just ask me an election-related question!"
                    )
                    await send_text(from_number, menu)

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
                cmd = text_body.strip().upper()
                if msg_type == "text" and cmd in ("HI", "HELLO", "MENU", "OPTIONS"):
                    await send_text(
                        from_number,
                        f"Welcome back {volunteer.name}!\n\n"
                        "Reply with:\n"
                        "- TASKS to see your assigned tasks\n"
                        "- COMPLAINT to lodge an issue\n"
                        "- Or just ask me an election-related question!"
                    )
                elif msg_type == "text" and cmd == "TASKS":
                    tasks = session.exec(
                        select(Task).where(
                            Task.volunteer_id == volunteer.id, 
                            Task.status == "assigned"
                        )
                    ).all()
                    if not tasks:
                        await send_text(from_number, "You have no pending tasks. Good job!")
                    else:
                        resp = "*Your Pending Tasks:*\n"
                        for i, t in enumerate(tasks, 1):
                            resp += f"{i}. {t.title} - {t.description or ''}\n"
                        await send_text(from_number, resp)
                elif msg_type == "text" and cmd == "DONE":
                    task = session.exec(
                        select(Task)
                        .where(Task.volunteer_id == volunteer.id, Task.status == "assigned")
                        .order_by(Task.assigned_at.desc())
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
                        select(Task)
                        .where(Task.volunteer_id == volunteer.id, Task.status == "assigned")
                        .order_by(Task.assigned_at.desc())
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
                    # --- VOLUNTEER ASSISTANT: demographic-aware LLM guidance ---
                    try:
                        from app.infrastructure.ai.ollama_client import ollama_client

                        # Determine booth part_number
                        vol_booth_id = getattr(volunteer, 'booth_id', None) or ''

                        # Compute booth demographics from voter.json
                        profile = booth_demographics.get_booth_profile(vol_booth_id)

                        # Extract volunteer surname and find caste-matched voters
                        vol_surname = booth_demographics._extract_surname(volunteer.name or '')
                        matching_voters = booth_demographics.get_matching_voters(vol_booth_id, vol_surname)

                        # Format the profile text for the prompt
                        profile_text = booth_demographics.format_profile_for_prompt(
                            profile, matching_voters, vol_surname
                        )

                        # Fetch active tasks for this volunteer
                        vol_tasks = session.exec(
                            select(Task).where(
                                Task.volunteer_id == volunteer.id,
                                Task.status == "assigned"
                            )
                        ).all()
                        tasks_list = [
                            {"title": t.title, "description": t.description or "", "status": t.status}
                            for t in vol_tasks
                        ]

                        # Call the demographic-aware LLM
                        llm_answer = await asyncio.to_thread(
                            ollama_client.volunteer_assist,
                            text_body,
                            volunteer.name or "Volunteer",
                            profile_text,
                            tasks_list
                        )
                        await send_text(from_number, llm_answer)
                    except Exception as llm_error:
                        logger.error(f"Error calling volunteer LLM: {llm_error}", exc_info=True)
                        await send_text(
                            from_number,
                            "Sorry, I encountered an issue processing your request.",
                        )

    except Exception as e:
        logger.error(f"Error processing WhatsApp webhook: {e}", exc_info=True)
        return {"status": "error"}

    return {"status": "received"}
