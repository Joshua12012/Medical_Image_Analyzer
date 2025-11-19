import os
from pathlib import Path
from langsmith import Client
import logging
from dotenv import load_dotenv

load_dotenv()  # This will load variables from .env
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import torch
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR.parent.joinpath("uploaded_images")
UPLOAD_DIR.mkdir(exist_ok=True)

# API Keys 
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
LANGSMITH_API_KEY = os.getenv("LANGSMITH_API_KEY")
LANGSMITH_ENDPOINT = os.getenv("LANGSMITH_ENDPOINT")
LANGSMITH_PROJECT = os.getenv("LANGSMITH_PROJECT")
OUTPUT_PATH = os.getenv("OUTPUT_PATH", "./Med-Images")
GROQ_MODEL = os.getenv("GROQ_MODEL")

# Model cache
_model_cache = {
    "model": None,
    "tokenizer": None,
    "model_name": None
}

print(LANGSMITH_API_KEY)
if not os.getenv("LANGSMITH_API_KEY"):
    raise ValueError("LANGSMITH_API_KEY is not set. Add it to your .env file or environment variables.")

# Lazily create client with detailed logging
try:
    client = Client()
    logger.info("LangSmith client initialized successfully")
except Exception as e:
    logger.error(f"LangSmith client init failed: {str(e)}. Check API key, network, and endpoint.")
    client = None

PROJECT_NAME = LANGSMITH_PROJECT
session = None
if client:
    try:
        # Try to get existing project first
        existing_projects = list(client.list_projects())
        if any(p.name == PROJECT_NAME for p in existing_projects):
            logger.info(f"LangSmith project '{PROJECT_NAME}' already exists. Reusing.")
            session = next(p for p in existing_projects if p.name == PROJECT_NAME)
        else:
            session = client.create_project(
                project_name=PROJECT_NAME,
                description="Medical image analysis system",
            )
            logger.info(f"LangSmith project created: {PROJECT_NAME}")
    except Exception as e:
        logger.error(f"Failed to create or reuse LangSmith project: {str(e)}. Check dashboard and permissions.")
        session = None

