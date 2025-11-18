import re
from typing import Any, Dict

def clean_ai_text(text: str) -> str:
    """
    Clean the model output by removing everything up to and including the last 'assistant' role marker.
    This logic is directly ported from your original file.
    """
    if not text:
        return ""
    # Pattern: anything (non-greedy) up to the last occurrence of 'assistant' word + optional punctuation/whitespace,
    # then capture everything after.
    match = re.search(r'(?si)^(?:.*\bassistant\b[\s\.:]*)+(.*)$', text)
    if match:
        cleaned = match.group(1).strip()
    else:
        # Fallback: If no “assistant” found, just strip known role labels and whitespace.
        cleaned = re.sub(r'(?si)\b(system|user|assistant)\b[:\s]*', '', text).strip()
    return cleaned


def serialize_chat(chat: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converts a MongoDB chat document into a serializable dictionary matching the Pydantic schema.
    """
    return {
        "chat_id": chat.get("chat_id"),
        "userId": chat.get("userId"),
        "title": chat.get("title"),
        "messages": chat.get("messages", []),
        "created_at": str(chat.get("created_at")) if chat.get("created_at") else None
    }