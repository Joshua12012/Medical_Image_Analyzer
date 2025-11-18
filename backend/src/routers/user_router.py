from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

from ..auth import verify_token
from ..db_connection import users_collection
from ..models import UserResponse, UserBase

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("", response_model=UserResponse)
async def create_or_update_user(payload: Dict[str, Any], decoded: Dict[str, Any] = Depends(verify_token)):
    """
    Creates or updates a user document in MongoDB upon successful Firebase authentication.
    """
    uid = decoded.get("uid")
    email = decoded.get("email")
    if not uid:
        raise HTTPException(status_code=400, detail="Invalid token payload")

    # Prepare update payload
    update = {"uid": uid}
    if payload.get("username"):
        update["username"] = payload["username"]
    if email:
        update["email"] = email

    # Perform upsert operation
    await users_collection.update_one({"uid": uid}, {"$set": update}, upsert=True)
    
    # Fetch the final user document
    user_doc = await users_collection.find_one({"uid": uid}, {"_id": 0})

    if not user_doc:
        raise HTTPException(status_code=500, detail="Failed to retrieve user data after upsert.")
        
    # Return response matching UserResponse schema
    return {"user": UserBase(**user_doc)}