from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from typing import List, Dict, Any

from ..auth import verify_token
from ..db_connection import chats_collection
from ..models import ChatRequest, NewChatRequest, ChatResponse
from src.services import chat_service
from ..utils import serialize_chat

router = APIRouter(prefix="/api", tags=["chats"])


@router.post("/new-chat")
async def create_new_chat(req: NewChatRequest):
    """Initializes a new chat document."""
    # Logic moved to service layer for reuse and clean router code
    result = await chat_service.create_new_chat_doc(req.userId, req.prompt, req.chat_id)
    return result


@router.get("/user-chats/{userId}", response_model=Dict[str, List[ChatResponse]])
async def get_user_chats(userId: str):
    """Retrieves a list of all chat sessions for a given user."""
    try:
        # Use aggregation or find and serialize
        cursor = chats_collection.find({"userId": userId}).sort("created_at", -1)
        chats = []
        async for chat in cursor:
            chats.append(serialize_chat(chat))
        return {"chats": chats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chats: {str(e)}")


@router.get("/chat/{chat_id}", response_model=ChatResponse)
async def get_chat_messages(chat_id: str):
    """Retrieves all messages for a specific chat ID."""
    chat = await chats_collection.find_one({"chat_id": chat_id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Use Pydantic schema validation after serialization for robust output
    return ChatResponse(**serialize_chat(chat))


@router.get("/search-chats/{userId}")
async def search_chats(userId: str, q: str = Query(..., min_length=1, description="Search query")):
    """Searches chat titles for a given query string."""
    try:
        regex_pattern = {"$regex": q, "$options": "i"}
        # Only return necessary fields
        chats = await chats_collection.find(
            {"userId": userId, "title": regex_pattern},
            {"_id": 0, "chat_id": 1, "title": 1, "messages": 1}
        ).to_list(None)
        
        # Ensure messages are truncated or managed if necessary, but here we return all
        return {"results": chats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/chat-connection")
async def handle_chat_connection(req: ChatRequest):
    """
    Primary endpoint for processing AI chat responses (text/image).
    The complex logic is delegated to the chat_service.
    """
    try:
        # Delegate business logic to the service layer
        result = await chat_service.process_chat_request(req)
        return result
    except httpx.HTTPError as e:
        # Catch external API errors (4xx/5xx) explicitly
        raise HTTPException(status_code=e.response.status_code, detail=f"External API Error: {e.response.text}")
    except Exception as e:
        # Catch any other unexpected errors
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")