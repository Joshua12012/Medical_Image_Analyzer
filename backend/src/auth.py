from fastapi import Request, Depends, HTTPException
from firebase_admin import auth as firebase_auth
from typing import Dict, Any

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