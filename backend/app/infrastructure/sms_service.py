"""
SMS Notification Service — Fast2SMS Integration
================================================
Production-grade SMS delivery service for the AAkar complaint platform.
Uses the Fast2SMS Bulk V2 API (Quick SMS route).
"""

import logging
from pathlib import Path
from typing import Optional

import pandas as pd
import requests

logger = logging.getLogger(__name__)

# ── Fast2SMS Configuration ──────────────────────────────────────────────────
FAST2SMS_API_URL = "https://www.fast2sms.com/dev/bulkV2"
FAST2SMS_AUTH_KEY = (
    "Gbt2mOgqoni0EZyAYNBKPw7CQxS56IjFLkzhsuRDMlJre413V8"
    "sThEIXHaxn0RYquktZAvmJ34jpdCW9"
)
REQUEST_TIMEOUT_SECONDS = 15

# ── Data Path ───────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # …/backend
COMPLAINTS_CSV = BASE_DIR / "data" / "uploads" / "complaints.csv"


# ─────────────────────────────────────────────────────────────────────────────
#  Core SMS Sender
# ─────────────────────────────────────────────────────────────────────────────
def send_sms(phone_number: str, message: str) -> dict:
    """
    Send a single SMS via Fast2SMS Quick-SMS route.

    Parameters
    ----------
    phone_number : str
        Recipient mobile number (Indian 10-digit). Any leading '+' is stripped.
    message : str
        Message body (max ≈ 160 chars for a single segment).

    Returns
    -------
    dict
        Fast2SMS JSON response on success, or an error dict on failure.
    """
    # Sanitise the number: strip '+' prefix and any whitespace
    cleaned_number = phone_number.lstrip("+").strip()

    # If the number starts with country code '91' and is 12 digits, keep the
    # last 10 digits only — Fast2SMS expects 10-digit Indian numbers.
    if cleaned_number.startswith("91") and len(cleaned_number) == 12:
        cleaned_number = cleaned_number[2:]

    headers = {
        "authorization": FAST2SMS_AUTH_KEY,
        "Content-Type": "application/json",
    }

    payload = {
        "route": "q",
        "message": message,
        "language": "english",
        "flash": 0,
        "numbers": cleaned_number,
    }

    try:
        response = requests.post(
            FAST2SMS_API_URL,
            json=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        result = response.json()
        logger.info("SMS sent to %s — response: %s", cleaned_number, result)
        return result

    except requests.exceptions.Timeout:
        error_msg = f"SMS request timed out after {REQUEST_TIMEOUT_SECONDS}s"
        logger.error(error_msg)
        return {"error": True, "message": error_msg}

    except requests.exceptions.ConnectionError as exc:
        error_msg = f"Connection error while sending SMS: {exc}"
        logger.error(error_msg)
        return {"error": True, "message": error_msg}

    except requests.exceptions.HTTPError as exc:
        error_msg = f"HTTP error from Fast2SMS: {exc} — body: {exc.response.text}"
        logger.error(error_msg)
        return {"error": True, "message": error_msg}

    except requests.exceptions.RequestException as exc:
        error_msg = f"Unexpected request error: {exc}"
        logger.error(error_msg)
        return {"error": True, "message": error_msg}


# ─────────────────────────────────────────────────────────────────────────────
#  High-Level: Notify by Complaint Document ID
# ─────────────────────────────────────────────────────────────────────────────
def notify_by_doc_id(doc_id: int) -> dict:
    """
    Look up a complaint by its document/complaint ID in ``complaints.csv``,
    compose a resolution SMS, and send it to the voter's phone number.

    Parameters
    ----------
    doc_id : int
        The ``complaint_id`` value from the CSV.

    Returns
    -------
    dict
        SMS gateway response or descriptive error dict.
    """
    # ── Load CSV ────────────────────────────────────────────────────────
    if not COMPLAINTS_CSV.exists():
        error_msg = f"Complaints CSV not found at {COMPLAINTS_CSV}"
        logger.error(error_msg)
        return {"error": True, "message": error_msg}

    try:
        df = pd.read_csv(COMPLAINTS_CSV)
    except Exception as exc:
        error_msg = f"Failed to read complaints CSV: {exc}"
        logger.error(error_msg)
        return {"error": True, "message": error_msg}

    # ── Locate the row ──────────────────────────────────────────────────
    mask = df["complaint_id"] == doc_id
    if not mask.any():
        error_msg = f"No complaint found with doc_id={doc_id}"
        logger.warning(error_msg)
        return {"error": True, "message": error_msg}

    row = df.loc[mask].iloc[0]

    phone_number: Optional[str] = (
        str(row["phone"]) if pd.notna(row.get("phone")) else None
    )
    issue_classification: str = str(
        row.get("type", "General")
    )

    if not phone_number:
        error_msg = f"Phone number missing for doc_id={doc_id}"
        logger.warning(error_msg)
        return {"error": True, "message": error_msg}

    # ── Compose & send ──────────────────────────────────────────────────
    message = (
        f"AAkar: Your complaint regarding {issue_classification} "
        f"(Ref: {doc_id}) is now RESOLVED. - Govt Secretariat"
    )

    return send_sms(phone_number, message)


if __name__ == "__main__":
    # Internal Test Harness
    print("── AAkar: SMS SERVICE TEST HARNESS ──")
    test_number = "7696138229"  # Standard test number
    test_msg = "AAkar: System check. SMS service is active."
    
    print(f"Sending test payload to {test_number}...")
    try:
        res = send_sms(test_number, test_msg)
        if res.get("return") == True:
            print(f"✅ SUCCESS: Message Delivered. ID: {res.get('request_id')}")
        else:
            print(f"❌ GATEWAY ERROR: {res}")
    except Exception as e:
        print(f"‼ SYSTEM CRITICAL ERROR: {e}")
