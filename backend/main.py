from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests, os
from dotenv import load_dotenv
from bson import ObjectId
from db import db
import uuid
load_dotenv()

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

class ChatRequest(BaseModel):
    userId: str
    prompt:str
    

@app.get("/test")
async def test_connection():
    result = await db["test_collection"].insert_one({"msg": "connected"})
    return {"inserted_id": str(result.inserted_id)}

@app.post("/api/ai-response")
async def get_ai_response(req: ChatRequest):
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
    payload = {
        "model": "groq/compound-mini",
        "messages": [{"role": "user", "content": req.prompt}],
    }

    response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
    data = response.json()
    text = data["choices"][0]["message"]["content"]

  # Find user's chat document, or create if not exists
    existing_chat = await db["chatMessages"].find_one({"userId": req.userId})

    if not existing_chat:
        # create new document
        chat_doc = {
            "chat_id": str(uuid.uuid4()),
            "userId": req.userId,
            "messages": [{"prompt": req.prompt, "response": text}]
        }
        await db["chatMessages"].insert_one(chat_doc)
    else:
        # append to existing document
        await db["chatMessages"].update_one(
            {"userId": req.userId},
            {"$push": {"messages": {"prompt": req.prompt, "response": text}}}
        )
    return {"userId": req.userId, "prompt": req.prompt, "response": text}
