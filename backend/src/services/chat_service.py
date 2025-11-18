from fastapi import Request, Depends, HTTPException
from firebase_admin import auth as firebase_auth
from typing import Dict, Any
import requests
import httpx
import uuid
from typing import Dict, Any, List, Optional

# All internal imports now use the 'src.' prefix
from src.db_connection import chats_collection 
from src.config import GROQ_API_KEY, GROQ_CHAT_URL, LIGHTNING_API_URL 
from src.utils import clean_ai_text 
from src.models import ChatRequest 


async def verify_token(request: Request) -> Dict[str, Any]:
    """
    FastAPI dependency to verify Firebase ID Token from Authorization header.
    Returns the decoded token payload on success.
    """
    header = request.headers.get("Authorization")
    if not header or not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")
        
    # Extract the ID token part
    id_token = header.split(" ", 1)[1]
    
    try:
        # Verify the token using Firebase Admin SDK
        decoded_token = firebase_auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        # Catch all Firebase Admin exceptions (expired, invalid, revoked, etc.)
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {str(e)}")
    
    

# Cache for simple session persistence (copied from original main.py logic)
LAST_IMAGE_CACHE = {} 

async def generate_chat_title(prompt: str, userId: str) -> str:
    """
    Generate a short, unique chat title using Groq compound-mini model.
    """
    title_prompt = f"Summarize this chat into a 1-2 word title: '{prompt}'. Only return the title text."
    payload = {
        "model": "groq/compound-mini",
        "messages": [{"role": "user", "content": title_prompt}],
    }

    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}

    try:
        resp = requests.post(GROQ_CHAT_URL, headers=headers, json=payload, timeout=30)
        resp.raise_for_status() # Raises HTTPError for bad responses (4xx or 5xx)

        title = resp.json()["choices"][0]["message"]["content"].strip()
        
        # Ensure uniqueness for this user
        existing_titles = await chats_collection.find({"userId": userId}, {"title": 1}).to_list(None)
        existing_titles = [c.get("title", "").lower() for c in existing_titles if c.get("title")]
        
        if title.lower() in existing_titles:
            suffix = 2
            base = title
            while f"{base} {suffix}".lower() in existing_titles:
                suffix += 1
            title = f"{base} {suffix}"
            
        return title
    except Exception as e:
        print(f"Error generating chat title: {e}")
        return prompt[:30] or "New Chat" # Fallback title


async def process_chat_request(req: ChatRequest) -> Dict[str, Any]:
    """
    Handles the entire chat flow: fetching image URLs, calling the remote AI, 
    updating the database, and generating a title if necessary.
    """
    userId = req.userId
    prompt = req.prompt
    # Use provided chat_id or generate a new one
    chat_id = req.chat_id or str(uuid.uuid4())
    image_urls: List[str] = req.image_paths or []
    final_title = "New Chat"
    
    # If no image URLs provided, try using cache for this user
    if not image_urls and userId in LAST_IMAGE_CACHE:
        cached = LAST_IMAGE_CACHE.get(userId)
        if cached and cached.get("url"):
            image_urls = [cached["url"]]

    # Build payload for remote model API (Lightning/External Cloud API)
    payload = {
        "question": prompt,
        "image_paths": image_urls or None,
        "session_id": chat_id
    }

    # Call remote model API (using httpx for async POST)
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(LIGHTNING_API_URL, json=payload)

    resp.raise_for_status() # Raise exception for 4xx/5xx status codes

    cloud_response = resp.json()
    ai_text = cloud_response.get("assessment") or cloud_response.get("response") or "No answer returned."
    
    # Prefer session_id returned by remote if present, else use the one we generated/supplied
    chat_id = cloud_response.get("session_id") or payload["session_id"]

    # -------------------- STORE IN MONGODB --------------------
    message_entry = {
        "prompt": prompt,
        "imageUrl": image_urls[0] if image_urls else None,
        "response": ai_text
    }

    existing_chat = await chats_collection.find_one({"chat_id": chat_id, "userId": userId})
    
    if existing_chat:
        # Update existing chat
        await chats_collection.update_one(
            {"_id": existing_chat["_id"]},
            {"$push": {"messages": message_entry}}
        )
        final_title = existing_chat.get("title", final_title)
        
        # If title is still default, generate a new one
        if final_title == "New Chat":
            chat_title = await generate_chat_title(prompt, userId)
            await chats_collection.update_one(
                {"_id": existing_chat["_id"]},
                {"$set": {"title": chat_title}}
            )
            final_title = chat_title
    else:
        # Insert new chat
        chat_title = await generate_chat_title(prompt, userId)
        new_chat = {
            "chat_id": chat_id,
            "userId": userId,
            "title": chat_title,
            "messages": [message_entry]
        }
        await chats_collection.insert_one(new_chat)
        final_title = chat_title

    # Update LAST_IMAGE_CACHE if client supplied image URLs
    if image_urls:
        LAST_IMAGE_CACHE[userId] = {
            "filename": None,
            "bytes": None,
            "url": image_urls[0]
        }
        
    return {
        "chatId": chat_id,
        "userId": userId,
        "prompt": prompt,
        "response": clean_ai_text(ai_text),
        "imageUrls": image_urls,
        "title": final_title
    }
    
# -------------------------------------------------------------------------
# FIX: The missing function definition is added here to resolve the AttributeError
# -------------------------------------------------------------------------

async def create_new_chat_doc(userId: str, prompt: Optional[str] = None, chat_id: Optional[str] = None) -> Dict[str, Any]:
    """Creates a new chat document in the database, typically when a user clicks 'New Chat'."""
    new_chat_id = chat_id or str(uuid.uuid4())
    # Use the first 30 characters of the prompt as a temporary title, or default to "New Chat"
    chat_title = prompt[:30] if prompt else "New Chat" 

    new_chat_doc = {
        "chat_id": new_chat_id,
        "userId": userId,
        "title": chat_title,
        "messages": [] # New chat starts with an empty message list
    }
    await chats_collection.insert_one(new_chat_doc)
    return {"chatId": new_chat_id, "title": chat_title}