from fastapi import FastAPI,HTTPException, UploadFile,Request,Depends, File, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from firebase_admin import credentials, initialize_app, auth as firebase_Auth
import requests, os
from dotenv import load_dotenv
from .db_connection import db
import uuid, re
import httpx
from datetime import datetime
from typing import Optional
from bson import ObjectId
load_dotenv(override=True)

app = FastAPI(title="Chatbot API")


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
LIGHTNING_API_URL = "https://5000-01k9fns08p6gahsqje98716efk.cloudspaces.litng.ai"


SERVICE_ACCOUNT = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")
cred = credentials.Certificate(SERVICE_ACCOUNT)
initialize_app(cred)

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)





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










@app.post("/api/analyze-image-text")
async def analyze_image_text(
    userId: str = Form(...),
    prompt: str = Form(...),
    chat_id: str = Form(None),
    image: UploadFile = File(None)   # <-- image optional now
):
    try:
        # ---------- If image provided -> call Lightning inference (your existing pattern) ----------
        if image is not None:
            files = {
                "image": (image.filename, await image.read(), image.content_type)
            }
            data = {"question": prompt}
            lightning_resp = requests.post(
                f"{LIGHTNING_API_URL}/answer-upload",
                data=data,
                files=files,
                timeout=120
            )

            if lightning_resp.status_code != 200:
                raise HTTPException(status_code=lightning_resp.status_code, detail=lightning_resp.text)

            ai_output = lightning_resp.json()
            raw_answer = ai_output.get("answer", "No answer returned.")
            ai_text = clean_ai_text(raw_answer)

            # If your Lightning returns extra ids or metadata, you can include them here
            image_url = ai_output.get("image_path") or None

        # ---------- If no image -> text-only flow using Groq (or whichever text model you use) ----------
        else:
            headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
            payload = {
                "model": "groq/compound-mini",
                "messages": [{"role": "user", "content": prompt}],
            }

            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )

            if resp.status_code != 200:
                try:
                    err = resp.json()
                    msg = err.get("error", {}).get("message", resp.text)
                except Exception:
                    msg = resp.text
                raise HTTPException(status_code=502, detail=f"Groq error: {msg}")

            data = resp.json()
            raw_answer = data["choices"][0]["message"]["content"]
            ai_text = clean_ai_text(raw_answer)
            image_url = None

        # ---------- DB logic: create / append chat session ----------
        # Replace below pseudocode with your actual DB calls (await db[...] etc.)
        # Example pseudocode:
        # chat = await db["chatMessages"].find_one({"chat_id": chat_id, "userId": userId})
        # if chat: update, else: create new

        if not chat_id:
            chat_id = str(uuid.uuid4())
            # create chat document with title and first message
            # await db["chatMessages"].insert_one({...})

        else:
            # append to existing chat if present, otherwise create new (as you had before)
            pass

        # ---------- Optionally generate a short title if needed ----------
        # (keep your existing title-generation flow if required)

        # ---------- Return unified JSON ----------
        return JSONResponse({
            "chatId": chat_id,
            "userId": userId,
            "prompt": prompt,
            "response": ai_text,
            "imageUrl": image_url,
            "title": prompt[:30] or "New Chat"
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





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
