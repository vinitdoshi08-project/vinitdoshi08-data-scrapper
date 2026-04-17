from fastapi import FastAPI, HTTPException, Form, Body, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import re
import tempfile
import sqlite3
import bcrypt
import jwt
import uuid
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr
from scraper import extract_id_from_url, fetch_playlist_videos, fetch_video_details, save_to_excel, save_to_pdf, save_to_json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.path.join(BASE_DIR, "users.db")
SECRET_KEY = "your_secret_key_change_this_for_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

print(f"Database path: {DATABASE_URL}")

def get_db():
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# Models
class UserSignup(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: str
    email: EmailStr
    token: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Helper Functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Auth Endpoints
@app.post("/api/auth/signup")
async def signup(user: UserSignup):
    print(f"Signup attempt for: {user.email}")
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (user.email.lower(),))
        if cursor.fetchone():
            print(f"Signup failed: Email {user.email} already exists")
            raise HTTPException(status_code=400, detail="Email already exists")
        
        user_id = str(uuid.uuid4())
        hashed_pwd = hash_password(user.password)
        
        cursor.execute(
            "INSERT INTO users (id, full_name, email, password) VALUES (?, ?, ?, ?)",
            (user_id, user.full_name, user.email.lower(), hashed_pwd)
        )
        conn.commit()
        
        print(f"Signup successful for: {user.email}")
        token = create_access_token({"sub": user_id, "email": user.email})
        
        return {
            "token": token,
            "user": {
                "id": user_id,
                "full_name": user.full_name,
                "email": user.email,
                "created_at": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        print(f"Signup error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    finally:
        conn.close()

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    print(f"Login attempt for: {credentials.email}")
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM users WHERE email = ?", (credentials.email.lower(),))
        user = cursor.fetchone()
        
        if not user:
            print(f"Login failed: User {credentials.email} not found")
            raise HTTPException(status_code=401, detail="Invalid email or password")
            
        if not verify_password(credentials.password, user['password']):
            print(f"Login failed: Invalid password for {credentials.email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        print(f"Login successful for: {credentials.email}")
        token = create_access_token({"sub": user['id'], "email": user['email']})
        
        return {
            "token": token,
            "user": {
                "id": user['id'],
                "full_name": user['full_name'],
                "email": user['email'],
                "created_at": user['created_at']
            }
        }
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    finally:
        conn.close()

@app.get("/api/auth/me")
async def get_me(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        conn = sqlite3.connect(DATABASE_URL)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, full_name, email, created_at FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "id": user['id'],
            "full_name": user['full_name'],
            "email": user['email'],
            "created_at": user['created_at']
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.put("/api/auth/profile")
async def update_profile(update_data: UserUpdate):
    try:
        payload = jwt.decode(update_data.token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        conn = sqlite3.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Check if email is being updated to an existing one
        cursor.execute("SELECT id FROM users WHERE email = ? AND id != ?", (update_data.email.lower(), user_id))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="Email already exists")

        cursor.execute(
            "UPDATE users SET full_name = ?, email = ? WHERE id = ?",
            (update_data.full_name, update_data.email.lower(), user_id)
        )
        conn.commit()
        conn.close()
        
        return {"message": "Profile updated successfully"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

def validate_file_name(file_name: str) -> bool:
    if not file_name or len(file_name) > 100:
        return False
    return re.match(r'^[\w\-. ]+$', file_name) is not None

def is_valid_youtube_url(url: str) -> bool:
    patterns = [
        r'^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+',
        r'^https?:\/\/youtube\.com\/watch\?v=[\w-]+(&list=[\w-]+)?',
        r'^https?:\/\/youtube\.com\/playlist\?list=[\w-]+',
        r'^https?:\/\/youtu\.be\/[\w-]+(\?list=[\w-]+)?'
    ]
    return any(re.match(pattern, url) for pattern in patterns)

@app.post("/api/scrape")
async def scrape_youtube(
    url: str = Form(...),
    file_name: str = Form(...),
    file_format: str = Form(...)
):
    if not all([url, file_format, file_name]):
        raise HTTPException(status_code=400, detail="Please fill all fields!")

    if not validate_file_name(file_name):
        raise HTTPException(
            status_code=400,
            detail="Invalid file name. Only letters, numbers, spaces, hyphens, underscores and dots allowed."
        )

    if not is_valid_youtube_url(url):
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube URL. Please provide valid video or playlist URL."
        )

    try:
        url_type, id_value = extract_id_from_url(url)
        if not id_value:
            raise HTTPException(
                status_code=400,
                detail="Could not extract video/playlist ID from URL"
            )

        video_data = []
        if url_type == 'playlist':
            video_data = fetch_playlist_videos(id_value)
        elif url_type == 'video':
            video_data = [fetch_video_details(id_value)]

        if not video_data:
            raise HTTPException(
                status_code=404,
                detail="No videos found. Playlist might be empty or private."
            )

        temp_dir = tempfile.mkdtemp()
        output_filename = f"{file_name}.{file_format}"
        temp_file_path = os.path.join(temp_dir, output_filename)

        if file_format == 'xlsx':
            save_to_excel(video_data, temp_file_path)
        elif file_format == 'pdf':
            save_to_pdf(video_data, temp_file_path)
        elif file_format == 'json':
            save_to_json(video_data, temp_file_path)
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format"
            )

        return FileResponse(
            path=temp_file_path,
            filename=output_filename,
            media_type='application/octet-stream',
            headers={"X-Video-Count": str(len(video_data))}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Processing error: {str(e)}"
        )

@app.get("/")
async def root():
    return {"message": "YouTube Scraper API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
