from fastapi import FastAPI,HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests, os
from dotenv import load_dotenv
from .db_connection import db
import uuid
import httpx
from datetime import datetime
from bson import ObjectId
load_dotenv(override=True)

app = FastAPI(title="Chatbot API")

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

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)



class ChatRequest(BaseModel):
    userId: str
    prompt:str
    chat_id: str | None = None
    
class NewChatRequest(BaseModel):
    userId: str
    prompt:str
    chat_id: str | None = None
class ImgRequest(BaseModel):
    userId: str
    prompt: str
    image_url: str


def serialize_chat(chat):
    """Convert MongoDB document ObjectIds to strings for JSON serialization."""
    if not chat:
        return None
    chat["_id"] = str(chat["_id"])
    for msg in chat.get("messages", []):
        if "_id" in msg and isinstance(msg["_id"], ObjectId):
            msg["_id"] = str(msg["_id"])
    return chat


@app.get("/test")
async def test_connection():
    result = await db["test_collection"].insert_one({"msg": "connected"})
    return {"inserted_id": str(result.inserted_id)}

# @app.post("/api/new-chat")
# async def create_new_chat(req: NewChatRequest):
#     chat_id = str(uuid.uuid4())
#     chat_doc = {
#         "chat_id": chat_id,
#         "userId": req.userId,
#         "title": "New Chat",
#         "messages": [],
#         "created_at": datetime.utcnow(),
#         "updated_at": datetime.utcnow(),
#     }
#     await db["chatSessions"].insert_one(chat_doc)
#     return {"chat_id": chat_id, "title": "New Chat"}

@app.post("/api/new-chat")
async def create_new_chat(req: NewChatRequest):
    chat_id = str(uuid.uuid4())
    chat_title = req.prompt[:20] or "New Chat"
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
async def get_chat(chat_id:str):
    chat = await db["chatMessages"].find_one({"user":chat_id})
    if not chat:
        raise HTTPException(status_code = 404, detail = "Chat not found")
    return serialize_chat(chat)

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

#     # Generate the AI response
#     response = requests.post(
#         "https://api.groq.com/openai/v1/chat/completions",
#         headers=headers, json=payload
#     )
#     data = response.json()
#     ai_text = data["choices"][0]["message"]["content"]

#     # CASE 1: if chat_id is provided → continue that chat
#     if req.chat_id:
#         await db["chatMessages"].update_one(
#             {"chat_id": req.chat_id, "userId": req.userId},
#             {"$push": {"messages": {"prompt": req.prompt, "response": ai_text}}}
#         )
#         return {"chat_id": req.chat_id, "response": ai_text}

#     # CASE 2: else → create a brand-new chat
#     title_prompt = f"Summarize this chat into a 1-2 word title: '{req.prompt}'. Only return the title text, nothing else."
#     title_payload = {
#         "model": "groq/compound-mini",
#         "messages": [{"role": "user", "content": title_prompt}],
#     }
#     title_resp = requests.post(
#         "https://api.groq.com/openai/v1/chat/completions",
#         headers=headers,
#         json=title_payload
#     )
#     title_data = title_resp.json()
#     chat_title = title_data["choices"][0]["message"]["content"].strip()

#     # Make sure title is unique for this user
#     existing_titles = await db["chatMessages"].find({"userId": req.userId}, {"title": 1}).to_list(None)
#     existing_titles = [chat.get("title", "").lower() for chat in existing_titles]
#     if chat_title.lower() in existing_titles:
#         suffix = 2
#         base_title = chat_title
#         while f"{base_title} {suffix}".lower() in existing_titles:
#             suffix += 1
#         chat_title = f"{base_title} {suffix}"

#     chat_doc = {
#         "chat_id": str(uuid.uuid4()),
#         "userId": req.userId,
#         "title": chat_title,
#         "messages": [{"prompt": req.prompt, "response": ai_text}],
#         "created_at": datetime.utcnow(),
#     }
#     await db["chatMessages"].insert_one(chat_doc)

#     return {
#         "chat_id": chat_doc["chat_id"],
#         "userId": req.userId,
#         "title": chat_title,
#         "response": ai_text,
#     }
@app.post("/api/ai-response")
async def get_ai_response(req: ChatRequest):
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
    payload = {
        "model": "groq/compound-mini",
        "messages": [{"role": "user", "content": req.prompt}],
    }

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers=headers, json=payload
    )
    data = response.json()
    ai_text = data["choices"][0]["message"]["content"]

    chat = await db["chatMessages"].find_one(
        {"chat_id": req.chat_id, "userId": req.userId}
    )

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found for user.")

    await db["chatMessages"].update_one(
        {"chat_id": req.chat_id, "userId": req.userId},
        {"$push": {"messages": {"prompt": req.prompt, "response": ai_text}}}
    )

    new_title = None
    if chat.get("title") in [None, "", "New Chat"]:
        title_prompt = f"Summarize this conversation in 2–4 words: '{req.prompt}'. Respond with only the short title."
        title_payload = {
            "model": "groq/compound-mini",
            "messages": [{"role": "user", "content": title_prompt}],
        }

        title_resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json=title_payload
        )
        title_data = title_resp.json()
        new_title = title_data["choices"][0]["message"]["content"].strip()

        await db["chatMessages"].update_one(
            {"chat_id": req.chat_id, "userId": req.userId},
            {"$set": {"title": new_title}}
        )

    # ✅ Always return a valid JSON response
    return {
        "chatId": req.chat_id,
        "userId": req.userId,
        "prompt": req.prompt,
        "response": ai_text,
        "title": new_title or chat.get("title") or "New Chat"
    }





@app.post("/api/analyze-image-text")
async def analyze_image_text(
    userId: str = Form(...),
    prompt: str = Form(...),
    chat_id: str = Form(None),
    image: UploadFile = File(...)
):
    try:
        # Save uploaded image
        image_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{image_id}_{image.filename}")
        with open(file_path, "wb") as f:
            f.write(await image.read())

        # Generate AI response (using text model for now)
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
        payload = {
            "model": "groq/compound-mini",
            "messages": [
                {"role": "user", "content": f"Analyze this prompt and attached image: {prompt}"}
            ],
        }

        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload
        )

        if resp.status_code != 200:
            try:
                err = resp.json()
                msg = err.get("error", {}).get("message", resp.text)
            except Exception:
                msg = resp.text
            raise HTTPException(status_code=502, detail=f"Groq error: {msg}")

        data = resp.json()
        ai_text = data["choices"][0]["message"]["content"]

        image_url = f"/uploads/{os.path.basename(file_path)}"

        # === Database logic with chat_id support ===
        if chat_id:
            # Find the specific chat session for the user
            chat = await db["chatMessages"].find_one({"chat_id": chat_id, "userId": userId})

            if chat:
                # Append to existing chat
                await db["chatMessages"].update_one(
                    {"chat_id": chat_id, "userId": userId},
                    {"$push": {"messages": {"prompt": prompt, "imageUrl": image_url, "response": ai_text}}}
                )
            else:
                # Chat ID not found — create new one anyway
                new_chat_id = str(uuid.uuid4())
                await db["chatMessages"].insert_one({
                    "chat_id": new_chat_id,
                    "userId": userId,
                    "title": prompt[:30] or "New Chat",
                    "messages": [{"prompt": prompt, "imageUrl": image_url, "response": ai_text}],
                })
                chat_id = new_chat_id
        else:
            # No chat ID provided — create a new chat session
            chat_id = str(uuid.uuid4())
            await db["chatMessages"].insert_one({
                "chat_id": chat_id,
                "userId": userId,
                "title": prompt[:30] or "New Chat",
                "messages": [{"prompt": prompt, "imageUrl": image_url, "response": ai_text}],
            })

        # If chat has default title, generate one
        chat = await db["chatMessages"].find_one({"chat_id": chat_id, "userId": userId})
        if chat and (chat.get("title") in [None, "", "New Chat"]):
            title_prompt = f"Give a short 2-3 word summary title for this image-based chat about: '{prompt}'"
            title_payload = {
                "model": "groq/compound-mini",
                "messages": [{"role": "user", "content": title_prompt}],
            }

            title_resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json=title_payload
            )
            new_title = title_resp.json()["choices"][0]["message"]["content"].strip()

            await db["chatMessages"].update_one(
                {"chat_id": chat_id, "userId": userId},
                {"$set": {"title": new_title}}
            )

            # Include updated title in response
            return {
                "chatId": chat_id,
                "userId": userId,
                "prompt": prompt,
                "response": ai_text,
                "imageUrl": image_url or {},
                "title": new_title,
            }
        return {
        "chatId": chat_id,
        "userId": userId,
        "prompt": prompt,
        "response": ai_text,
        "title":  chat.get("title") or "New Chat"
    }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Serve static endpoint for uploaded image preview (simple version)
@app.get("/uploads/{filename}")
def get_uploaded_image(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)