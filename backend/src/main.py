from fastapi import FastAPI,HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests, os
from dotenv import load_dotenv
from .db_connection import db
import uuid
import httpx
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
    
class ImgRequest(BaseModel):
    userId: str
    prompt: str
    image_url: str

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

@app.post("/api/analyze-image-text")
async def analyze_image_text(
    userId: str = Form(...),
    prompt: str = Form(...),
    image: UploadFile = File(...)
):
    try:
        # Save the uploaded image locally
        image_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{image_id}_{image.filename}")
        with open(file_path, "wb") as f:
            f.write(await image.read())

        # Instead of using a vision model, just use Groq text model to generate text
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
        payload = {
            "model": "groq/compound-mini",
            "messages": [
                {"role": "user", "content": f"Analyze the following prompt: {prompt}"}
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
                code = err.get("error", {}).get("code")
                msg = err.get("error", {}).get("message") or resp.text
            except Exception:
                code = None
                msg = resp.text
            if code == "not_available_for_plan":
                raise HTTPException(status_code=403, detail="Groq text model not available for your plan")
            raise HTTPException(status_code=502, detail=f"Groq error: {msg}")

        data = resp.json()
        ai_text = data["choices"][0]["message"]["content"]

        # Save in MongoDB (just like /api/ai-response)
        existing_chat = await db["chatMessages"].find_one({"userId": userId})
        image_url = f"/uploads/{os.path.basename(file_path)}"

        if not existing_chat:
            chat_doc = {
                "chat_id": str(uuid.uuid4()),
                "userId": userId,
                "messages": [{"prompt": prompt, "imageUrl": image_url, "response": ai_text}]
            }
            await db["chatMessages"].insert_one(chat_doc)
        else:
            await db["chatMessages"].update_one(
                {"userId": userId},
                {"$push": {"messages": {"prompt": prompt, "imageUrl": image_url, "response": ai_text}}}
            )

        return {"userId": userId, "prompt": prompt, "imageUrl": image_url, "response": ai_text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Serve static endpoint for uploaded image preview (simple version)
@app.get("/uploads/{filename}")
def get_uploaded_image(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)