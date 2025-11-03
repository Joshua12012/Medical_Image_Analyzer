from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "medical_chat_db1"

# Create the Motor client once
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
