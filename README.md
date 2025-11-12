# Medical Chat — Frontend + Backend

A full-stack chat application with a React (Vite) frontend and Python (FastAPI) backend. Features include user authentication (Firebase), image upload support, animated UI (AnimatedList, ElectricBorder), persistent chats, and server-side AI/title handling.

Contents

- Features
- Repo structure
- Environment files (templates)
- Setup — Backend
- Setup — Frontend
- Debugging tips (title persistence)
- Useful commands
- Notes & recommendations

Features

- Auth with Firebase (email/password)
- Persistent chats stored in backend DB (MongoDB)
- Sidebar with animated chat list and new-chat button
- Chat view with user and AI messages
  - Latest AI response can be highlighted with ElectricBorder
  - AI message bubbles can expand to the column width
- Image upload for messages (Cloudinary optional)
- Utility components: ElectricBorder, AnimatedList, CardNav, TextType
- Backend API endpoints (FastAPI) for creating, updating, and fetching chats/messages

Repository structure (important)

- frontend/
  - src/
    - components/ — UI components (ChatInterface.jsx, ChatMessage.jsx, Sidebar.jsx, Login.jsx, Signup.jsx, ElectricBorder.jsx, AnimatedList.jsx, etc.)
    - api/ — frontend API helpers
    - firebase/fireBaseConfig.js — place your Firebase config here (or build from VITE\_\* vars)
    - main.jsx, index.css, App.jsx
  - package.json, vite config
- backend/
  - src/
    - main.py — FastAPI app and routes
    - db_connection.py — DB connection utility
  - .env.local (recommended)
- .env.example files (provided for examples)

Environment files (use these filenames and fill real values; do NOT commit secrets)

1. Backend: backend/.env.local

- Backend loads this (use python-dotenv or env loader).
- Example:

```text
// filepath: backend/.env.local
PORT=5000
MONGO_URI="mongodb://localhost:27017"
DB_NAME="medical_chat_db"
COLLECTION_CHATS="chats"
COLLECTION_USERS="users"

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Google application credentials (optional)
GOOGLE_APPLICATION_CREDENTIALS=""

# Any other backend-only keys
GROQ_API_KEY=""
SECRET_KEY="change_this_to_a_long_random_string"
```

2. Frontend: frontend/.env.local

Use this file for frontend environment variables. Example:

```text
VITE_BACKEND_URL="http://localhost:5000"

# Firebase client config (safe to expose in client)
VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_MESSAGING_SENDER_ID=""
VITE_FIREBASE_APP_ID=""

# Public API keys (if used)
VITE_GROQ_API_KEY=""

# Toggle
VITE_ENABLE_DEBUG="true"
```

## Setup — Backend (FastAPI + MongoDB)
1. Create virtual environment:
```
python -m venv .venv
source .venv/bin/activate
```
2. Install Dependencies
```
pip install -r requirements.txt
# or
pip install fastapi uvicorn pymongo python-dotenv
```
3. Configure .env.local:

Copy backend/.env.example to backend/.env.local.
Fill in the required values (MongoDB URI, DB name, etc.).

4. Start the server:
```
uvicorn src.main:app --reload --port 5000
```
5. Test API:

Open http://localhost:5000/docs to inspect endpoints.


## Setup — Frontend (React / Vite)

1. Install dependencies:

```
cd frontend
npm install
# or
yarn
```
2. Configure .env.local:

Copy frontend/.env.example to frontend/.env.local.
Fill in the required values (Firebase config, backend URL, etc.).

3. Start the dev server:
```
npm run dev
# or
yarn dev
```
4. Open the app:

Visit the URL printed in the terminal (usually http://localhost:5173).

## Useful commands
Backend
```
# Start backend server
uvicorn src.main:app --reload --port 5000
```
Frontend
```
# Start frontend dev server
cd frontend
npm run dev
```
Revert accidental file edits

```
git restore frontend/src/components/Login.jsx
```