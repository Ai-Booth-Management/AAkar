import logging

logger = logging.getLogger(__name__)

WHATSAPP_API_URL = "https://api.whatsapp.provider/v1/messages"
WHATSAPP_TOKEN = "MOCK_TOKEN"

def send_whatsapp_message(to_phone: str, message: str) -> bool:
    logger.info(f"Sending WhatsApp to {to_phone}: {message}")
    return True

def notify_field_worker(phone: str, event: str, details: str):
    message = f"Politix OS Alert\nEvent: {event}\nDetails: {details}"
    send_whatsapp_message(phone, message)
