import os
from dotenv import load_dotenv
from firebase_admin import credentials, initialize_app
import cloudinary

# Load environment variables from .env file
load_dotenv(override=True)

# --- Environment Variables ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_CHAT_URL = os.getenv("GROQ_CHAT_URL", "https://api.groq.com/openai/v1/chat/completions") # Use the full URL now
LIGHTNING_API_URL = os.getenv("LIGHTNING_API_URL")
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb+srv://pomode407_db_user:6UrpibFF7pzCVEnc@cluster0.9iyuphv.mongodb.net/Cluster0?retryWrites=true&w=majority")
DB_NAME = os.getenv("DB_NAME", "your_default_db")


# --- CORS Setup ---
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5000",
]


# --- Firebase Initialization ---
def initialize_firebase():
    """Initializes the Firebase Admin SDK using the service account credentials."""
    try:
        SERVICE_ACCOUNT_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        # In production, you might want to raise an exception here


# --- Cloudinary Initialization ---
def initialize_cloudinary():
    """Configures Cloudinary with environment variables."""
    cloudinary.config(
        cloud_name=os.getenv("CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_SECRET_KEY"),
        secure=True
    )
    print("Cloudinary configured.")

# Initialize services immediately upon module load
initialize_firebase()
initialize_cloudinary()