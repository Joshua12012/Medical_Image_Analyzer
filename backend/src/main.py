from fastapi import FastAPI,HTTPException, UploadFile,Request,Depends, File, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from firebase_admin import credentials, initialize_app, auth as firebase_Auth
import requests, os
from dotenv import load_dotenv
from .db_connection import db
import uuid, re, io
import httpx
from datetime import datetime
from typing import Optional, List
from bson import ObjectId
import io
import inspect
from motor.motor_asyncio import AsyncIOMotorClient
import cloudinary
import cloudinary.uploader


load_dotenv(override=True)

app = FastAPI(title="Chatbot API")



cloudinary.config(
    cloud_name=os.getenv("CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_SECRET_KEY"),
    secure=True
)



app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

#cors setup

origins = [
    "http://localhost:5173",
    "http://localhost:5000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins = origins,
    allow_credentials = True,
    allow_methods=["*"],
    allow_headers=["*"],
)


GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/files"
GROQ_RESPONSES_URL = "https://api.groq.com/openai/v1/responses"
LIGHTNING_API_URL = "https://8000-01k9fns08p6gahsqje98716efk.cloudspaces.litng.ai/chat"


SERVICE_ACCOUNT = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")
cred = credentials.Certificate(SERVICE_ACCOUNT)
initialize_app(cred)

from pathlib import Path

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)





class UserBase(BaseModel):
    uid: str
    email: Optional[EmailStr] = None
    username: Optional[str] = None

class UserResponse(BaseModel):
    user: UserBase

class ChatRequest(BaseModel):
    userId: str
    prompt:str
    chat_id: str | None = None
    
class NewChatRequest(BaseModel):
    userId: str
    prompt: str | None = None
    chat_id: str | None = None
class ImgRequest(BaseModel):
    userId: str
    prompt: str
    image_url: str
    
    



def clean_ai_text(text: str) -> str:
    """
    Clean the model output by removing everything up to and including the last 'assistant' role marker,
    regardless of punctuation or whitespace variations.
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


def serialize_chat(chat):
    return {
        "chat_id": chat.get("chat_id"),
        "userId": chat.get("userId"),
        "title": chat.get("title"),
        "messages": chat.get("messages", []),
        "created_at": str(chat.get("created_at")) if chat.get("created_at") else None
    }

async def verify_token(request: Request):
    header = request.headers.get("Authorization")
    if not header or not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    id_token = header.split(" ", 1)[1]
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@app.post("/api/users", response_model=UserResponse)
async def create_or_update_user(payload: dict, decoded=Depends(verify_token)):
    uid = decoded.get("uid")
    email = decoded.get("email")
    if not uid:
        raise HTTPException(status_code=400, detail="Invalid token")

    update = {}
    if payload.get("username"):
        update["username"] = payload["username"]
    if email:
        update["email"] = email
    update["uid"] = uid

    await db["users"].update_one({"uid": uid}, {"$set": update}, upsert=True)
    user = await db["users"].find_one({"uid": uid}, {"_id": 0})

    return {"user": user}



@app.post("/api/new-chat")
async def create_new_chat(req: NewChatRequest):
    chat_id = str(uuid.uuid4())
    chat_title = "New Chat"
    await db["chatMessages"].insert_one({
        "chat_id": chat_id,
        "userId": req.userId,
        "title": chat_title,
        "messages": []
    })
    return {"chatId": chat_id, "title": chat_title}


@app.get("/api/user-chats/{userId}")
async def get_user_chats(userId: str):
    try:
        cursor = db["chatMessages"].find({"userId": userId})
        chats = []
        async for chat in cursor:
            chats.append(serialize_chat(chat))
        return {"chats": chats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/chat/{chat_id}")
async def get_chat_messages(chat_id: str):
    try:
        chat = await db["chatMessages"].find_one({"chat_id": chat_id})
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        return serialize_chat(chat)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search-chats/{userId}")
async def search_chats(userId: str, q: str):
    regex_pattern = {"$regex": q, "$options": "i"}
    chats = await db["chatMessages"].find(
        {"userId": userId, "title": regex_pattern},
        {"_id": 0, "chat_id": 1, "title": 1, "messages":1}
    ).to_list(None)
    return {"results": chats}


# @app.post("/api/ai-response")
# async def get_ai_response(req: ChatRequest):
#     headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
#     payload = {
#         "model": "groq/compound-mini",
#         "messages": [{"role": "user", "content": req.prompt}],
#     }

#     response = requests.post(
#         "https://api.groq.com/openai/v1/chat/completions",
#         headers=headers, json=payload
#     )
#     data = response.json()
#     ai_text = data["choices"][0]["message"]["content"]

#     chat = await db["chatMessages"].find_one(
#         {"chat_id": req.chat_id, "userId": req.userId}
#     )

#     if not chat:
#         raise HTTPException(status_code=404, detail="Chat not found for user.")

#     await db["chatMessages"].update_one(
#         {"chat_id": req.chat_id, "userId": req.userId},
#         {"$push": {"messages": {"prompt": req.prompt, "response": ai_text}}}
#     )

#     new_title = None
#     if chat.get("title") in [None, "", "New Chat"]:
#         title_prompt = f"Summarize this conversation in 2–4 words: '{req.prompt}'. Respond with only the short title."
#         title_payload = {
#             "model": "groq/compound-mini",
#             "messages": [{"role": "user", "content": title_prompt}],
#         }

#         title_resp = requests.post(
#             "https://api.groq.com/openai/v1/chat/completions",
#             headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
#             json=title_payload
#         )
#         title_data = title_resp.json()
#         new_title = title_data["choices"][0]["message"]["content"].strip()

#         await db["chatMessages"].update_one(
#             {"chat_id": req.chat_id, "userId": req.userId},
#             {"$set": {"title": new_title}}
#         )

#     # ✅ Always return a valid JSON response
#     return {
#         "chatId": req.chat_id,
#         "userId": req.userId,
#         "prompt": req.prompt,
#         "response": ai_text,
#         "title": new_title or chat.get("title") or "New Chat"
#     }





# @app.post("/api/analyze-image-text")
# async def analyze_image_text(
#     userId: str = Form(...),
#     prompt: str = Form(...),
#     chat_id: str = Form(None),
#     image: UploadFile = File(...)
# ):
#     try:
#         # Save uploaded image
#         image_id = str(uuid.uuid4())
#         file_path = os.path.join(UPLOAD_DIR, f"{image_id}_{image.filename}")
#         with open(file_path, "wb") as f:
#             f.write(await image.read())

#         # Generate AI response (using text model for now)
#         headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
#         payload = {
#             "model": "groq/compound-mini",
#             "messages": [
#                 {"role": "user", "content": f"Analyze this prompt and attached image: {prompt}"}
#             ],
#         }

#         resp = requests.post(
#             "https://api.groq.com/openai/v1/chat/completions",
#             headers=headers,
#             json=payload
#         )

#         if resp.status_code != 200:
#             try:
#                 err = resp.json()
#                 msg = err.get("error", {}).get("message", resp.text)
#             except Exception:
#                 msg = resp.text
#             raise HTTPException(status_code=502, detail=f"Groq error: {msg}")

#         data = resp.json()
#         ai_text = data["choices"][0]["message"]["content"]

#         image_url = f"/uploads/{os.path.basename(file_path)}"

#         # === Database logic with chat_id support ===
#         if chat_id:
#             # Find the specific chat session for the user
#             chat = await db["chatMessages"].find_one({"chat_id": chat_id, "userId": userId})

#             if chat:
#                 # Append to existing chat
#                 await db["chatMessages"].update_one(
#                     {"chat_id": chat_id, "userId": userId},
#                     {"$push": {"messages": {"prompt": prompt, "imageUrl": image_url, "response": ai_text}}}
#                 )
#             else:
#                 # Chat ID not found — create new one anyway
#                 new_chat_id = str(uuid.uuid4())
#                 await db["chatMessages"].insert_one({
#                     "chat_id": new_chat_id,
#                     "userId": userId,
#                     "title": prompt[:30] or "New Chat",
#                     "messages": [{"prompt": prompt, "imageUrl": image_url, "response": ai_text}],
#                 })
#                 chat_id = new_chat_id
#         else:
#             # No chat ID provided — create a new chat session
#             chat_id = str(uuid.uuid4())
#             await db["chatMessages"].insert_one({
#                 "chat_id": chat_id,
#                 "userId": userId,
#                 "title": prompt[:30] or "New Chat",
#                 "messages": [{"prompt": prompt, "imageUrl": image_url, "response": ai_text}],
#             })

#         # If chat has default title, generate one
#         chat = await db["chatMessages"].find_one({"chat_id": chat_id, "userId": userId})
#         if chat and (chat.get("title") in [None, "", "New Chat"]):
#             title_prompt = f"Give a short 2-3 word summary title for this image-based chat about: '{prompt}'"
#             title_payload = {
#                 "model": "groq/compound-mini",
#                 "messages": [{"role": "user", "content": title_prompt}],
#             }

#             title_resp = requests.post(
#                 "https://api.groq.com/openai/v1/chat/completions",
#                 headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
#                 json=title_payload
#             )
#             new_title = title_resp.json()["choices"][0]["message"]["content"].strip()

#             await db["chatMessages"].update_one(
#                 {"chat_id": chat_id, "userId": userId},
#                 {"$set": {"title": new_title}}
#             )

#             # Include updated title in response
#             return {
#                 "chatId": chat_id,
#                 "userId": userId,
#                 "prompt": prompt,
#                 "response": ai_text,
#                 "imageUrl": image_url or {},
#                 "title": new_title,
#             }
#         return {
#         "chatId": chat_id,
#         "userId": userId,
#         "prompt": prompt,
#         "response": ai_text,
#         "title":  chat.get("title") or "New Chat"
#     }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# import aiohttp

# async def upload_to_lightning(image: UploadFile):
#     """Upload file to Lightning and return URL."""
#     try:
#         image_bytes = await image.read()  # read once

#         async with aiohttp.ClientSession() as session:
#             form = aiohttp.FormData()
#             form.add_field(
#                 "file",
#                 image_bytes,
#                 filename=image.filename,
#                 content_type=image.content_type
#             )

#             async with session.post("https://5000-01k9fns08p6gahsqje98716efk.cloudspaces.litng.ai/answer-upload", data=form) as resp:
#                 if resp.status != 200:
#                     detail = await resp.text()
#                     raise HTTPException(status_code=400, detail=f"Lightning error: {detail}")

#                 data = await resp.json()
#                 return data.get("url")
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Lightning error: {str(e)}")


# import asyncio 

# chats_collection = db["chatMessages"]

# LAST_IMAGE_CACHE = {}

# @app.post("/api/analyze-image-text")
# async def analyze_image_text(
#     userId: str = Form(...),
#     prompt: str = Form(...),
#     chat_id: str = Form(None),
#     image: UploadFile | None = File(None)
# ):
#     try:
#         data = {"question": prompt}

#         if image:
#             image_url = await upload_to_lightning(image)   
#         # ✅ Case 1: If new image uploaded, use and cache it
#         if image and image.filename:
#             content = await image.read()
#             LAST_IMAGE_CACHE[userId] = {
#                 "filename": image.filename,
#                 "bytes": content,
#                 "type": image.content_type or "image/jpeg"
#             }
#             files = {"image": (image.filename, content, image.content_type)}
        
#         # ✅ Case 2: If no new image but user has a cached one, reuse it
#         elif userId in LAST_IMAGE_CACHE:
#             cached = LAST_IMAGE_CACHE[userId]
#             files = {
#                 "image": (
#                     cached["filename"],
#                     io.BytesIO(cached["bytes"]),
#                     cached["type"]
#                 )
#             }

#         # ❌ Case 3: No image at all ever uploaded
#         else:
#             raise HTTPException(
#                 status_code=400,
#                 detail="No image available. Please upload an image first."
#             )

#         # 🔄 Send to Lightning AI
#         # lightning_resp = requests.post(
#         #     f"{LIGHTNING_API_URL}/answer-upload",
#         #     data=data,
#         #     files=files,
#         #     timeout=120
#         # )

#         if lightning_resp.status_code != 200:
#             raise HTTPException(
#                 status_code=lightning_resp.status_code,
#                 detail=f"Lightning error: {lightning_resp.text}"
#             )

#         ai_output = lightning_resp.json()
#         raw_answer = (
#             ai_output.get("answer")
#             or ai_output.get("response")
#             or "No answer returned."
#         )
#         ai_text = clean_ai_text(raw_answer)
#         image_url = ai_output.get("image_path") or None

#         # Handle chat tracking
#         if not chat_id:
#             chat_id = str(uuid.uuid4())
            
#         message_entry = {
#             "prompt": prompt,
#             "imageUrl": image_url,
#             "response": ai_text
#         }
        
        
#         # --- Check if chat exists ---
#         existing_chat = await chats_collection.find_one({"chat_id": chat_id, "userId": userId})
        
#         if existing_chat:
#             # ✅ Update existing chat
#             chats_collection.update_one(
#                 {"_id": existing_chat["_id"]},
#                 {"$push": {"messages": message_entry}}
#             )
#         else:
#             # ✅ Insert new chat document
#             new_chat = {
#                 "chat_id": chat_id,
#                 "userId": userId,
#                 "title": prompt[:30] or "New Chat",
#                 "messages": [message_entry]
#             }
#             chats_collection.insert_one(new_chat)

#         return JSONResponse({
#             "chatId": chat_id,
#             "userId": userId,
#             "prompt": prompt,
#             "response": ai_text,
#             "imageUrl": image_url,
#             "title": prompt[:30] or "New Chat"
#         })

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")












from pathlib import Path

import aiohttp, asyncio, io

chats_collection = db["chatMessages"]
LAST_IMAGE_CACHE = {}

# async def upload_to_lightning(image: UploadFile):
#     try:
#         image_bytes = await image.read()
#         async with aiohttp.ClientSession() as session:
#             form = aiohttp.FormData()
#             form.add_field(
#                 "file",
#                 image_bytes,
#                 filename=image.filename,
#                 content_type=image.content_type
#             )
#             async with session.post(f"{LIGHTNING_API_URL}/answer-upload", data=form) as resp:
#                 if resp.status != 200:
#                     detail = await resp.text()
#                     raise HTTPException(status_code=400, detail=f"Lightning error: {detail}")
#                 data = await resp.json()
#                 return data
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Lightning error: {str(e)}")


# add these imports at top of your FastAPI app file




# mount static files so saved images are accessible at /uploads/<filename>
# add this once after your `app = FastAPI()` line
# e.g. app = FastAPI(); app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# -------------------------------------------------------------
# The endpoint: read the file once, save locally, send to Lightning,
# store/append to MongoDB and return a consistent response.
# -------------------------------------------------------------
chats_collection = db["chatMessages"]  # your existing mongo db collection
LAST_IMAGE_CACHE = {}  # optional in-memory cache keyed by userId

 # set appropriately

@app.post("/api/analyze-image-text")
async def analyze_image_text(
    userId: str = Form(...),
    prompt: str = Form(...),
    chat_id: str | None = Form(None),
    image: UploadFile | None = File(None),
):
    try:
        # 1) Read/obtain image bytes exactly once
        image_bytes = None
        filename = None
        content_type = None

        if image and image.filename:
            # read once and keep
            image_bytes = await image.read()
            filename = Path(image.filename).name  # sanitize filename
            content_type = image.content_type or "application/octet-stream"

            # cache for this session/user (optional)
            LAST_IMAGE_CACHE[userId] = {
                "filename": filename,
                "bytes": image_bytes,
                "content_type": content_type,
            }

        elif userId in LAST_IMAGE_CACHE:
            cached = LAST_IMAGE_CACHE[userId]
            image_bytes = cached["bytes"]
            filename = cached["filename"]
            content_type = cached.get("content_type", "application/octet-stream")

        else:
            # no image available at all
            raise HTTPException(
                status_code=400, detail="No image available. Please upload an image first."
            )

        # 2) Save locally as fallback BEFORE calling remote API
        local_filename = f"{uuid.uuid4().hex}_{filename}"
        local_path = UPLOAD_DIR / local_filename
        # write bytes to disk
        with open(local_path, "wb") as f:
            f.write(image_bytes)

        # Build a local URL path that your frontend can use (ensure StaticFiles is mounted)
        local_url = f"/uploads/{local_filename}"

        # 3) Prepare multipart/form-data for Lightning
        # httpx accepts files as: {"image": (filename, content_bytes, content_type)}
        data = {"question": prompt}
        files = {"image": (filename, image_bytes, content_type)}

        # 4) Call Lightning (async)
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(LIGHTNING_API_URL, data=data, files=files)

        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Lightning error: {resp.text}",
            )

        ai_output = resp.json()  # parsed JSON from Lightning
        # The remote may return keys "answer" or "response" or nested structure
        raw_answer = ai_output.get("answer") or ai_output.get("response") or "No answer returned."

        # sanitize/normalize response text (implement your clean_ai_text as you had)
        try:
            # if you have a sync clean_ai_text function:
            ai_text = clean_ai_text(raw_answer)
        except Exception:
            # fallback if clean_ai_text is async or fails — keep raw text
            ai_text = raw_answer if isinstance(raw_answer, str) else str(raw_answer)

        # remote image path (if any) — may be None
        remote_image_path = ai_output.get("image_path") or ai_output.get("imageUrl") or None

        # prefer remote path if provided, otherwise use our local saved file
        final_image_url = (f"{remote_image_path}" if remote_image_path else local_url)

        # 5) Create/append message entry for MongoDB
        if not chat_id:
            chat_id = str(uuid.uuid4())

        message_entry = {
            "prompt": prompt,
            "imageUrl": final_image_url,
            "response": ai_text,
        }

        # atomic update: if chat exists append, else insert new doc
        existing_chat = await chats_collection.find_one({"chat_id": chat_id, "userId": userId})
        if existing_chat:
            await chats_collection.update_one(
                {"_id": existing_chat["_id"]},
                {"$push": {"messages": message_entry}},
            )
        else:
            new_chat = {
                "chat_id": chat_id,
                "userId": userId,
                "title": prompt[:30] or "New Chat",
                "messages": [message_entry],
            }
            await chats_collection.insert_one(new_chat)

        return JSONResponse(
            {
                "chatId": chat_id,
                "userId": userId,
                "prompt": prompt,
                "response": ai_text,
                "imageUrl": final_image_url,
                "title": prompt[:30] or "New Chat",
            }
        )

    except HTTPException:
        raise
    except Exception as exc:
        # helpful debugging info for your logs; don't leak internals to clients in prod
        raise HTTPException(status_code=500, detail=f"Server error: {str(exc)}")



















# async def generate_chat_title(prompt: str, userId: str, db) -> str:
#     """
#     Generate a short, unique chat title using Groq compound-mini model.
#     """
#     title_prompt = f"Summarize this chat into a 1-2 word title: '{prompt}'. Only return the title text."
#     payload = {
#         "model": "groq/compound-mini",
#         "messages": [{"role": "user", "content": title_prompt}],
#     }

#     headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}

#     # FIX: Use correct Groq API URL
#     GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

#     resp = requests.post(GROQ_API_URL, headers=headers, json=payload)
#     resp.raise_for_status()

#     title = resp.json()["choices"][0]["message"]["content"].strip()

#     # Ensure uniqueness for this user
#     existing_titles = await db.find({"userId": userId}, {"title": 1}).to_list(None)
#     existing_titles = [c.get("title", "").lower() for c in existing_titles]
#     if title.lower() in existing_titles:
#         suffix = 2
#         base = title
#         while f"{base} {suffix}".lower() in existing_titles:
#             suffix += 1
#         title = f"{base} {suffix}"
#     return title



# async def _save_file_to_local(image_bytes: bytes, filename: str) -> str:
#     """Save uploaded image locally (optional, can keep for cache or fallback)."""
#     local_filename = f"{uuid.uuid4().hex}_{filename}"
#     local_path = UPLOAD_DIR / local_filename
#     with open(local_path, "wb") as f:
#         f.write(image_bytes)
#     return str(local_path)

# async def _upload_to_cloudinary(local_path: str) -> str:
#     """Upload local image to Cloudinary and return the public URL."""
#     result = cloudinary.uploader.upload(local_path)
#     return result["secure_url"]



class ChatRequest(BaseModel):
    userId: str
    prompt: str
    chat_id: Optional[str] = None
    image_paths: Optional[List[str]] = None  # optional, can be empty

# @app.post("/api/chat-connection")
# async def analyze_image_text(req: ChatRequest):
#     userId = req.userId
#     prompt = req.prompt
#     chat_id = req.chat_id or str(uuid.uuid4())
#     image_urls = req.image_paths or []

#     payload = {
#         "question": prompt,
#         "image_paths": image_urls,
#         "session_id": chat_id
#     }

#     async with httpx.AsyncClient(timeout=120.0) as client:
#         resp = await client.post(LIGHTNING_API_URL, json=payload)

#     cloud_response = resp.json()
#     ai_text = cloud_response.get("assessment") or cloud_response.get("response") or "No answer returned."

#     return {
#         "chatId": chat_id,
#         "userId": userId,
#         "prompt": prompt,
#         "response": ai_text,
#         "imageUrls": image_urls
#     }

async def generate_chat_title(prompt: str, userId: str, db) -> str:
    """
    Generate a short, unique chat title using Groq compound-mini model.
    """
    title_prompt = f"Summarize this chat into a 1-2 word title: '{prompt}'. Only return the title text."
    payload = {
        "model": "groq/compound-mini",
        "messages": [{"role": "user", "content": title_prompt}],
    }

    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}

    # FIX: Use correct Groq API URL
    GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

    resp = requests.post(GROQ_API_URL, headers=headers, json=payload)
    resp.raise_for_status()

    title = resp.json()["choices"][0]["message"]["content"].strip()

    # Ensure uniqueness for this user
    existing_titles = await db.find({"userId": userId}, {"title": 1}).to_list(None)
    existing_titles = [c.get("title", "").lower() for c in existing_titles]
    if title.lower() in existing_titles:
        suffix = 2
        base = title
        while f"{base} {suffix}".lower() in existing_titles:
            suffix += 1
        title = f"{base} {suffix}"
    return title

async def _upload_to_cloudinary(image_bytes: bytes, filename: str) -> str:
    """Upload image bytes to Cloudinary and return the public URL."""
    result = cloudinary.uploader.upload(io.BytesIO(image_bytes), folder="chat_images", public_id=uuid.uuid4().hex, resource_type="image")
    return result["secure_url"]

class ChatRequest(BaseModel):
    userId: str
    prompt: str
    chat_id: Optional[str] = None
    image_paths: Optional[List[str]] = None  # optional, can be empty

@app.post("/api/chat-connection")
async def analyze_image_text(req: ChatRequest):
    final_title = "New Chat"
    try:
        userId = req.userId
        prompt = req.prompt
        # prefer provided chat_id, otherwise generate one
        chat_id = req.chat_id or str(uuid.uuid4())

        # normalize image list
        image_urls: List[str] = req.image_paths or []

        # if no image URLs provided, try using cache for this user
        if not image_urls and userId in LAST_IMAGE_CACHE:
            cached = LAST_IMAGE_CACHE.get(userId)
            if cached and cached.get("url"):
                image_urls = [cached["url"]]

        # build payload for remote model API
        payload = {
            "question": prompt,
            "image_paths": image_urls or None,
            "session_id": chat_id
        }

        # call lightning / remote model
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(LIGHTNING_API_URL, json=payload)

        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Remote cloud API error: {resp.text}"
            )

        cloud_response = resp.json()
        ai_text = cloud_response.get("assessment") or cloud_response.get("response") or "No answer returned."
        # prefer session_id returned by remote if present
        chat_id = cloud_response.get("session_id") or payload["session_id"]

        # -------------------- STORE IN MONGODB --------------------
        image_urls: List[str] = req.image_paths or []
        message_entry = {
            "prompt": prompt,
            "imageUrl": image_urls[0] if image_urls else None,
            "response": ai_text
        }

        existing_chat = await chats_collection.find_one({"chat_id": chat_id, "userId": userId})
        if existing_chat:
            await chats_collection.update_one(
                {"_id": existing_chat["_id"]},
                {"$push": {"messages": message_entry}}
            )
            final_title = existing_chat.get("title", final_title)
            # If title is still "New Chat", generate a new one
            if final_title == "New Chat":
                chat_title = await generate_chat_title(prompt, userId, chats_collection)
                await chats_collection.update_one(
                    {"_id": existing_chat["_id"]},
                    {"$set": {"title": chat_title}}
                )
                final_title = chat_title
        else:
            chat_title = await generate_chat_title(prompt, userId, chats_collection)
            new_chat = {
                "chat_id": chat_id,
                "userId": userId,
                "title": chat_title,
                "messages": [message_entry]
            }
            await chats_collection.insert_one(new_chat)
            final_title = chat_title

        # update LAST_IMAGE_CACHE if client supplied image URLs
        if image_urls:
            LAST_IMAGE_CACHE[userId] = {
                "filename": Path(image_urls[0]).name if image_urls[0] else None,
                "bytes": None,   # no bytes available for URL-only requests
                "url": image_urls[0]
            }

        return JSONResponse(
            {
                "chatId": chat_id,
                "userId": userId,
                "prompt": prompt,
                "response": ai_text,
                "imageUrls": image_urls,
                "title": final_title
            }
        )

    except HTTPException:
        # preserve explicit HTTPExceptions
        raise
    except Exception as exc:
        # bubble up as 500 with message for easier debugging
        raise HTTPException(status_code=500, detail=f"Server error: {str(exc)}")

# Serve static endpoint for uploaded image preview (simple version)


@app.post("/upload-image/")
async def upload_image(file: UploadFile = File(...)):  # ← Correct: uses "file"
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")

        url = await _upload_to_cloudinary(content, file.filename)
        return {"url": url, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")




# Serve static endpoint for uploaded image preview (simple version)
@app.get("/uploads/{filename}")
def get_uploaded_image(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)

@app.post("/upload-image/")
async def upload_image(file: UploadFile):
    UPLOAD_FOLDER = "uploads"
    file_path = f"{UPLOAD_FOLDER}/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())
    return {"filename": file.filename, "url": f"/uploads/{file.filename}"}
