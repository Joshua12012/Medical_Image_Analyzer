from pydantic import BaseModel, EmailStr
from typing import Optional, List

# --- User Schemas ---
class UserBase(BaseModel):
    uid: str
    email: Optional[EmailStr] = None
    username: Optional[str] = None

class UserResponse(BaseModel):
    user: UserBase
    
# --- Chat Schemas ---
class Message(BaseModel):
    prompt: str
    response: str
    imageUrl: Optional[str] = None

class ChatResponse(BaseModel):
    chat_id: str
    userId: str
    title: str
    messages: List[Message]
    created_at: Optional[str] = None


class ChatRequest(BaseModel):
    """Schema for a text/image chat request."""
    userId: str
    prompt: str
    chat_id: Optional[str] = None
    image_paths: Optional[List[str]] = None  # URLs from a prior upload step

class NewChatRequest(BaseModel):
    """Schema for initiating a new chat."""
    userId: str
    prompt: Optional[str] = None
    chat_id: Optional[str] = None # Can be used to pass a client-generated ID

class ImageUploadResponse(BaseModel):
    url: str
    filename: str
    