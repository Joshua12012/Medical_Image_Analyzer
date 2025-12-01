from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import CORS_ORIGINS
from .db_connection import UPLOAD_DIR # Imports UPLOAD_DIR and ensures it exists
from src.routers import user_router, chat_router, file_upload_router
from firebase_admin import initialize_app # Ensures Firebase is initialized

# 1. FastAPI App Initialization
app = FastAPI(
    title="Chatbot API (Refactored)",
    description="A production-ready FastAPI structure with separation of concerns."
)


origins = [
    # "http://localhost:5173",
    "http://localhost:5000",
    "http://localhost:5174",
]


# 2. CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Static File Mounting (for local uploads/previews)
# The directory is managed by db.py/config.py setup
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# 4. Include Routers (The main difference from the original monolithic file)
# The application now uses the `include_router` function to pull in endpoints 
# from the dedicated router files.
app.include_router(user_router.router)
app.include_router(chat_router.router)
app.include_router(file_upload_router.router)


# --- Optional Root Endpoint ---
@app.get("/")
async def root():
    return {"message": "Welcome to the Refactored Chatbot API"}