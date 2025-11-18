from motor.motor_asyncio import AsyncIOMotorClient
from .config import MONGODB_URL, DB_NAME
from pathlib import Path

# Initialize MongoDB client and database instance
client = AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]

# Collections for easy access
users_collection = db["users"]
chats_collection = db["chatMessages"]

# Static directory setup
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)