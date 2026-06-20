from fastapi import FastAPI, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from googleapiclient.errors import HttpError
import os
import re
import tempfile
import sqlite3
import bcrypt
import jwt
import uuid
import base64
import hashlib
from cryptography.fernet import Fernet
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from scraper import (
    extract_id_from_url, fetch_playlist_videos, fetch_video_details,
    save_to_excel, save_to_pdf, save_to_json, DEFAULT_API_KEY,
)

app = FastAPI()

# ── CORS — allow everything (Netlify + localhost) ─────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Video-Count", "Content-Length", "Content-Disposition"],
)

# ── Config ────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.path.join(BASE_DIR, "users.db")
SECRET_KEY  = os.environ.get("SECRET_KEY", "your_secret_key_change_this_for_production")
ALGORITHM   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# Fernet key derived from SECRET_KEY (stable across restarts)
_raw_key   = hashlib.sha256(SECRET_KEY.encode()).digest()
FERNET_KEY = base64.urlsafe_b64encode(_raw_key)
fernet     = Fernet(FERNET_KEY)

def encrypt_api_key(key: str) -> str:
    return fernet.encrypt(key.encode()).decode()

def decrypt_api_key(enc: str) -> str:
    return fernet.decrypt(enc.encode()).decode()

def mask_api_key(key: str) -> str:
    if len(key) <= 11:
        return key[:4] + "••••"
    return key[:8] + "••••••••••••" + key[-3:]

# ── DB init ───────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DATABASE_URL)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS user_api_keys (
        user_id TEXT PRIMARY KEY,
        encrypted_key TEXT NOT NULL,
        quota_exceeded INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    conn.close()

init_db()
print(f"DB: {DATABASE_URL}")

# ── Models ────────────────────────────────────────────────────
class UserSignup(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: str
    email: EmailStr
    token: str

class ApiKeyPayload(BaseModel):
    token: str
    api_key: str

# ── Helpers ───────────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_access_token(data: dict) -> str:
    payload = {**data, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> str:
    """Decode JWT and return user_id (sub). Works for both custom JWTs and
    Supabase JWTs — for Supabase we just extract 'sub' without verifying
    the Supabase secret (we don't have it), so we use decode without verification
    only to get the user identifier for API-key lookup."""
    try:
        # Try our own JWT first (signed with SECRET_KEY)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub") or payload.get("id")
    except jwt.InvalidTokenError:
        pass
    try:
        # Fallback: decode without verification (Supabase token)
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get("sub") or payload.get("id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# ── Auth endpoints ────────────────────────────────────────────
@app.post("/api/auth/signup")
async def signup(user: UserSignup):
    conn = sqlite3.connect(DATABASE_URL)
    c = conn.cursor()
    try:
        c.execute("SELECT id FROM users WHERE email=?", (user.email.lower(),))
        if c.fetchone():
            raise HTTPException(status_code=400, detail="Email already exists")
        uid = str(uuid.uuid4())
        c.execute("INSERT INTO users VALUES (?,?,?,?,?)",
                  (uid, user.full_name, user.email.lower(), hash_password(user.password), datetime.utcnow().isoformat()))
        conn.commit()
        token = create_access_token({"sub": uid, "email": user.email})
        return {"token": token, "user": {"id": uid, "full_name": user.full_name, "email": user.email, "created_at": datetime.utcnow().isoformat()}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM users WHERE email=?", (credentials.email.lower(),))
        user = c.fetchone()
        if not user or not verify_password(credentials.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_access_token({"sub": user["id"], "email": user["email"]})
        return {"token": token, "user": {"id": user["id"], "full_name": user["full_name"], "email": user["email"], "created_at": user["created_at"]}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/auth/me")
async def get_me(token: str):
    uid = decode_token(token)
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT id,full_name,email,created_at FROM users WHERE id=?", (uid,))
    user = c.fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(user)

@app.put("/api/auth/profile")
async def update_profile(data: UserUpdate):
    uid = decode_token(data.token)
    conn = sqlite3.connect(DATABASE_URL)
    c = conn.cursor()
    try:
        c.execute("SELECT id FROM users WHERE email=? AND id!=?", (data.email.lower(), uid))
        if c.fetchone():
            raise HTTPException(status_code=400, detail="Email already exists")
        c.execute("UPDATE users SET full_name=?,email=? WHERE id=?", (data.full_name, data.email.lower(), uid))
        conn.commit()
        return {"message": "Profile updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ── API Key endpoints ─────────────────────────────────────────
@app.post("/api/apikey/save")
async def save_api_key(payload: ApiKeyPayload):
    uid = decode_token(payload.token)
    if not payload.api_key or len(payload.api_key.strip()) < 10:
        raise HTTPException(status_code=400, detail="Invalid API key")
    enc = encrypt_api_key(payload.api_key.strip())
    conn = sqlite3.connect(DATABASE_URL)
    conn.execute('''INSERT INTO user_api_keys (user_id,encrypted_key,quota_exceeded,updated_at)
        VALUES (?,?,0,?)
        ON CONFLICT(user_id) DO UPDATE SET
            encrypted_key=excluded.encrypted_key,
            quota_exceeded=0,
            updated_at=excluded.updated_at''',
        (uid, enc, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    return {"message": "API key saved", "masked_key": mask_api_key(payload.api_key.strip())}

@app.get("/api/apikey/status")
async def get_api_key_status(token: str):
    uid = decode_token(token)
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT encrypted_key,quota_exceeded FROM user_api_keys WHERE user_id=?", (uid,))
    row = c.fetchone()
    conn.close()
    if not row:
        return {"has_key": False, "masked_key": None, "quota_exceeded": False}
    raw = decrypt_api_key(row["encrypted_key"])
    return {"has_key": True, "masked_key": mask_api_key(raw), "quota_exceeded": bool(row["quota_exceeded"])}

# ── Scrape endpoint ───────────────────────────────────────────
def validate_file_name(name: str) -> bool:
    return bool(name and len(name) <= 100 and re.match(r'^[\w\-. ]+$', name))

def is_valid_youtube_url(url: str) -> bool:
    return bool(re.match(
        r'^(https?://)?(www\.)?(youtube\.com|youtu\.be)/.+', url.strip()
    ))

def _is_quota_error(e: Exception) -> bool:
    msg = str(e).lower()
    return any(k in msg for k in ("quota", "quotaexceeded", "dailylimitexceeded", "403", "rateLimitExceeded".lower()))

@app.post("/api/scrape")
async def scrape_youtube(
    url:         str = Form(...),
    file_name:   str = Form(...),
    file_format: str = Form(...),
    token:       str = Form(default=""),
    api_key:     str = Form(default=""),   # direct key from browser localStorage
):
    if not validate_file_name(file_name):
        raise HTTPException(status_code=400, detail="Invalid file name.")
    if not is_valid_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL.")
    if file_format not in ("xlsx", "pdf", "json"):
        raise HTTPException(status_code=400, detail="Unsupported format. Use xlsx, pdf or json.")

    # Key priority: 1) direct from browser localStorage  2) user's DB-stored key  3) env fallback
    resolved_key = api_key.strip() if api_key and api_key.strip() else DEFAULT_API_KEY
    uid = None
    if not resolved_key and token:
        # Only hit the DB if no direct key was provided
        try:
            uid = decode_token(token)
            conn = sqlite3.connect(DATABASE_URL)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT encrypted_key FROM user_api_keys WHERE user_id=?", (uid,))
            row = c.fetchone()
            conn.close()
            if row:
                resolved_key = decrypt_api_key(row["encrypted_key"])
        except Exception:
            pass

    if not resolved_key:
        raise HTTPException(
            status_code=400,
            detail="No YouTube API key configured. Please add your API key in the scraper page."
        )

    try:
        url_type, id_value = extract_id_from_url(url)
        if not id_value:
            raise HTTPException(status_code=400, detail="Could not extract video/playlist ID from URL.")

        if url_type == "playlist":
            video_data = fetch_playlist_videos(id_value, resolved_key)
        else:
            detail = fetch_video_details(id_value, resolved_key)
            video_data = [detail] if detail else []

        if not video_data:
            raise HTTPException(status_code=404, detail="No videos found. The playlist may be empty or private.")

        temp_dir  = tempfile.mkdtemp()
        out_name  = f"{file_name}.{file_format}"
        out_path  = os.path.join(temp_dir, out_name)

        if file_format == "xlsx":
            save_to_excel(video_data, out_path)
        elif file_format == "pdf":
            save_to_pdf(video_data, out_path)
        else:
            save_to_json(video_data, out_path)

        return FileResponse(
            path=out_path,
            filename=out_name,
            media_type="application/octet-stream",
            headers={
                "X-Video-Count": str(len(video_data)),
                "Access-Control-Expose-Headers": "X-Video-Count,Content-Disposition",
            },
        )

    except HTTPException:
        raise
    except HttpError as e:
        if _is_quota_error(e):
            if uid:
                try:
                    conn2 = sqlite3.connect(DATABASE_URL)
                    conn2.execute("UPDATE user_api_keys SET quota_exceeded=1 WHERE user_id=?", (uid,))
                    conn2.commit()
                    conn2.close()
                except Exception:
                    pass
            raise HTTPException(
                status_code=429,
                detail="quota_exceeded: Your YouTube API key has reached its daily limit. Please enter a new API key."
            )
        raise HTTPException(status_code=500, detail=f"YouTube API error: {str(e)}")
    except Exception as e:
        if _is_quota_error(e):
            raise HTTPException(status_code=429, detail="quota_exceeded: Daily API quota reached. Please enter a new key.")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.get("/")
async def root():
    return {"message": "YouTube Scraper API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
