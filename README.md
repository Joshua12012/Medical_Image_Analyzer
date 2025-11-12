# Medical Chat — Frontend + Backend

A full-stack chat application with a React (Vite) frontend and Python (FastAPI) backend. Features include user authentication (Firebase), image upload support, animated UI components, persistent chats, and server-side AI/title handling.

---

## Table of Contents

- [Features](#features)
- [Environment Configuration](#environment-configuration)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Usage](#usage)
- [Useful Commands](#useful-commands)


---

## Features

### Authentication & Security
- Firebase authentication with email/password
- Secure user session management
- Protected API endpoints

### Chat Functionality
- Persistent chats stored in MongoDB
- Real-time message updates
- AI-powered responses
- Automatic chat title generation

### UI Components
- Animated chat list sidebar
- User and AI message bubbles
- Image upload support (Cloudinary integration)
- Custom components:
  - `ElectricBorder` — Animated border effects
  - `AnimatedList` — Smooth list transitions
  - `CardNav` — Navigation cards
  - `TextType` — Typewriter text effect

### Media Support
- Image upload for messages
- Cloudinary integration for media storage
- Image preview in chat interface

---


## Environment Configuration

### Backend Environment Variables

**File:** `backend/.env.local`

```env
# Server Configuration
PORT=5000

# Database Configuration
MONGO_URI=mongodb://localhost:27017
DB_NAME=medical_chat_db
COLLECTION_CHATS=chats
COLLECTION_USERS=users

# Cloudinary Configuration (Optional)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google Credentials (Optional)
GOOGLE_APPLICATION_CREDENTIALS=

# API Keys
GROQ_API_KEY=

# Security
SECRET_KEY=change_this_to_a_long_random_string
```

### Frontend Environment Variables

**File:** `frontend/.env.local`

```env
# Backend API
VITE_BACKEND_URL=http://localhost:5000

# Firebase Configuration
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# API Keys
VITE_GROQ_API_KEY=

# Debug Settings
VITE_ENABLE_DEBUG=true
```

> **⚠️ Security Note:** Never commit `.env.local` files to version control. Add them to `.gitignore`.

---

## Backend Setup

### Prerequisites
- Python 3.8+
- MongoDB (local or cloud instance)

### Installation Steps

1. **Create and activate virtual environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
   
   Or install manually:
   ```bash
   pip install fastapi uvicorn pymongo python-dotenv
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

4. **Start the server:**
   ```bash
   uvicorn src.main:app --reload --port 5000
   ```

5. **Verify installation:**
   - Open http://localhost:5000/docs
   - You should see the FastAPI interactive API documentation

---

## Frontend Setup

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation Steps

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Firebase and backend configuration
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Open the URL displayed in terminal (typically http://localhost:5173)

---

## Usage

### Starting the Application

1. **Start Backend:**
   ```bash
   cd backend
   source .venv/bin/activate
   uvicorn src.main:app --reload --port 5000
   ```

2. **Start Frontend (in new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application:**
   - Frontend: http://localhost:5173
   - Backend API Docs: http://localhost:5000/docs

### Basic Workflow

1. Sign up or log in with email/password
2. Create a new chat from the sidebar
3. Send messages (text or images)
4. AI responds automatically
5. Chat titles are generated based on conversation content

---

## Debugging Tips

### Title Persistence Issues

If chat titles aren't persisting:

1. **Check backend logs:**
   ```bash
   # Look for title generation errors in terminal
   ```

2. **Verify MongoDB connection:**
   ```bash
   # Check MONGO_URI in backend/.env.local
   ```

3. **Test API endpoint:**
   ```bash
   curl http://localhost:5000/docs
   # Navigate to title generation endpoint and test
   ```

4. **Clear browser cache:**
   - Clear localStorage
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Common Issues

| Issue | Solution |
|-------|----------|
| Backend won't start | Check if port 5000 is available |
| Frontend can't connect | Verify `VITE_BACKEND_URL` in `.env.local` |
| Firebase auth fails | Check Firebase config in `.env.local` |
| Images won't upload | Verify Cloudinary credentials |
| Database errors | Ensure MongoDB is running |

---

## Useful Commands

### Backend Commands

```bash
# Start server
uvicorn src.main:app --reload --port 5000

# Start with custom host
uvicorn src.main:app --reload --host 0.0.0.0 --port 5000

# Install new package
pip install <package-name>
pip freeze > requirements.txt

# Activate virtual environment
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
```

### Frontend Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install new package
npm install <package-name>

# Update dependencies
npm update
```

### Git Commands

```bash
# Revert file changes
git restore <filepath>
git restore frontend/src/components/Login.jsx

# Check status
git status

# Stage and commit
git add .
git commit -m "commit message"
```

---

## License

This project is licensed under the MIT License.

---

## Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review closed issues for solutions

---

**Built with using React, FastAPI, and MongoDB **