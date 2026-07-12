from __future__ import annotations

from fastapi import FastAPI, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from googleapiclient.errors import HttpError
from cryptography.fernet import Fernet
import os
import re
import tempfile
import sqlite3
import bcrypt
import jwt
import uuid
import base64
import hashlib
import hmac as _hmac
import httpx
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from typing import Optional
from pydantic import BaseModel, EmailStr
from scraper import (
    extract_id_from_url, fetch_playlist_videos, fetch_video_details,
    save_to_excel, save_to_pdf, save_to_json, DEFAULT_API_KEY,
)

# Load backend/.env
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

app = FastAPI()

# ── CORS — reads ALLOWED_ORIGINS env var (comma-separated) ───
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
_extra_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
_allow_origins = list(set([
    "http://localhost:5173",
    "http://localhost:4173",
] + _extra_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Video-Count", "Content-Length", "Content-Disposition"],
)

# ── Config ────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.path.join(BASE_DIR, "users.db")
SECRET_KEY   = os.environ.get("SECRET_KEY", "your_secret_key_change_this_for_production")
ALGORITHM    = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# ── Supabase REST ─────────────────────────────────────────────
SUPABASE_URL         = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

def _sb_headers(prefer: str = "return=representation") -> dict:
    return {
        "apikey":        SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        prefer,
    }

async def sb_get_profile(user_id: str) -> Optional[dict]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers=_sb_headers(),
                params={"id": f"eq.{user_id}", "select": "id,plan,trial_ends_at,created_at"},
            )
            print(f"[sb_get_profile] status={r.status_code}")
            if r.status_code == 200:
                rows = r.json()
                return rows[0] if rows else None
            # 400 usually means id column type mismatch (bigint vs uuid) — treat as no profile
            return None
    except Exception as e:
        print(f"[sb_get_profile] exception: {e}")
    return None

async def sb_update_profile(user_id: str, patch: dict) -> bool:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return False
    try:
        headers = {
            "apikey":        SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type":  "application/json",
        }
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.patch(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers=headers,
                params={"id": f"eq.{user_id}"},
                json=patch,
            )
            ok = r.status_code in (200, 204)
            if not ok:
                print(f"[sb_update_profile] status={r.status_code} body={r.text[:200]}")
            return ok
    except Exception as e:
        print(f"[sb_update_profile] exception: {e}")
        return False

async def sb_upsert_subscription(data: dict) -> bool:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return False
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(
                f"{SUPABASE_URL}/rest/v1/subscriptions",
                headers=_sb_headers("resolution=merge-duplicates,return=representation"),
                json=data,
            )
            print(f"[sb_upsert_subscription] status={r.status_code} body={r.text[:300]}")
            return r.status_code in (200, 201)
    except Exception as e:
        print(f"[sb_upsert_subscription] exception: {e}")
        return False

async def sb_insert_payment(data: dict) -> bool:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return False
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(
                f"{SUPABASE_URL}/rest/v1/payments",
                headers=_sb_headers(),
                json=data,
            )
            return r.status_code in (200, 201)
    except Exception:
        return False

# ── Razorpay config (no SDK — direct REST API via httpx) ─────
RZP_KEY_ID     = os.environ.get("RAZORPAY_KEY_ID", "")
RZP_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")

# ── Fernet (API key encryption) ───────────────────────────────
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

# ── Helpers: ensure subscription columns exist ────────────────
def _ensure_sub_columns(conn: sqlite3.Connection):
    for col, typ in [
        ("plan",                "TEXT DEFAULT 'free'"),
        ("trial_ends_at",       "TEXT"),
        ("razorpay_payment_id", "TEXT"),
    ]:
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {typ}")
            conn.commit()
        except Exception:
            pass  # column already exists

# ── Pydantic models ───────────────────────────────────────────
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

class CreateOrderRequest(BaseModel):
    amount: int          # smallest currency unit (INR paise OR USD cents)
    currency: str = "INR"
    receipt: str = ""

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id:   str
    razorpay_payment_id: str
    razorpay_signature:  str

class SaveSubscriptionRequest(BaseModel):
    token: str
    plan: str
    billing_cycle: str = "monthly"   # "monthly" | "yearly" — used for expiry calc only
    razorpay_payment_id: str
    razorpay_order_id:   str = ""
    amount:              int = 0     # cents (e.g. 600 = $6.00)
    currency:            str = "USD"

# ── Auth helpers ──────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_access_token(data: dict) -> str:
    payload = {**data, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> str:
    """Returns user_id from either our own JWT or a Supabase JWT."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = payload.get("sub") or payload.get("id")
        if uid:
            return uid
    except jwt.InvalidTokenError:
        pass
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        uid = payload.get("sub") or payload.get("id")
        if uid:
            return uid
    except Exception:
        pass
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
        c.execute(
            "INSERT INTO users VALUES (?,?,?,?,?)",
            (uid, user.full_name, user.email.lower(), hash_password(user.password), datetime.utcnow().isoformat()),
        )
        conn.commit()
        token = create_access_token({"sub": uid, "email": user.email})
        return {
            "token": token,
            "user": {
                "id": uid, "full_name": user.full_name,
                "email": user.email, "created_at": datetime.utcnow().isoformat(),
            },
        }
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
        return {
            "token": token,
            "user": {
                "id": user["id"], "full_name": user["full_name"],
                "email": user["email"], "created_at": user["created_at"],
            },
        }
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
    c.execute("SELECT id, full_name, email, created_at FROM users WHERE id=?", (uid,))
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
        c.execute(
            "UPDATE users SET full_name=?, email=? WHERE id=?",
            (data.full_name, data.email.lower(), uid),
        )
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
    conn.execute(
        '''INSERT INTO user_api_keys (user_id, encrypted_key, quota_exceeded, updated_at)
           VALUES (?,?,0,?)
           ON CONFLICT(user_id) DO UPDATE SET
               encrypted_key=excluded.encrypted_key,
               quota_exceeded=0,
               updated_at=excluded.updated_at''',
        (uid, enc, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"message": "API key saved", "masked_key": mask_api_key(payload.api_key.strip())}

@app.get("/api/apikey/status")
async def get_api_key_status(token: str):
    uid = decode_token(token)
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT encrypted_key, quota_exceeded FROM user_api_keys WHERE user_id=?", (uid,))
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
    return bool(re.match(r'^(https?://)?(www\.)?(youtube\.com|youtu\.be)/.+', url.strip()))

def _is_quota_error(e: Exception) -> bool:
    msg = str(e).lower()
    return any(k in msg for k in ("quota", "quotaexceeded", "dailylimitexceeded", "403", "ratelimitexceeded"))

@app.post("/api/scrape")
async def scrape_youtube(
    url:         str = Form(...),
    file_name:   str = Form(...),
    file_format: str = Form(...),
    token:       str = Form(default=""),
    api_key:     str = Form(default=""),
):
    if not validate_file_name(file_name):
        raise HTTPException(status_code=400, detail="Invalid file name.")
    if not is_valid_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL.")
    if file_format not in ("xlsx", "pdf", "json"):
        raise HTTPException(status_code=400, detail="Unsupported format. Use xlsx, pdf or json.")

    resolved_key = api_key.strip() if api_key and api_key.strip() else DEFAULT_API_KEY
    uid = None
    if not resolved_key and token:
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
            detail="No YouTube API key configured. Please add your API key in the scraper page.",
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

        temp_dir = tempfile.mkdtemp()
        out_name = f"{file_name}.{file_format}"
        out_path = os.path.join(temp_dir, out_name)

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
                detail="quota_exceeded: Your YouTube API key has reached its daily limit. Please enter a new API key.",
            )
        raise HTTPException(status_code=500, detail=f"YouTube API error: {str(e)}")
    except Exception as e:
        if _is_quota_error(e):
            raise HTTPException(status_code=429, detail="quota_exceeded: Daily API quota reached. Please enter a new key.")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.get("/")
async def root():
    return {"message": "YouTube Scraper API is running"}

# ── Razorpay: Create Order ────────────────────────────────────
@app.post("/api/create-order")
async def create_order(body: CreateOrderRequest):
    if not RZP_KEY_ID or not RZP_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay not configured on server.")
    if body.amount < 100:
        raise HTTPException(status_code=400, detail="Amount must be at least 100 (smallest currency unit).")
    try:
        receipt = body.receipt or f"rcpt_{uuid.uuid4().hex[:12]}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.razorpay.com/v1/orders",
                auth=(RZP_KEY_ID, RZP_KEY_SECRET),
                json={
                    "amount":   body.amount,
                    "currency": body.currency,
                    "receipt":  receipt,
                },
            )
        if not resp.is_success:
            raise HTTPException(status_code=500, detail=f"Razorpay error: {resp.text}")
        order = resp.json()
        return {
            "order_id": order["id"],
            "amount":   order["amount"],
            "currency": order["currency"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay error: {str(e)}")


# ── Razorpay: Verify Payment ──────────────────────────────────
@app.post("/api/verify-payment")
async def verify_payment(body: VerifyPaymentRequest):
    if not RZP_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay not configured on server.")
    if not all([body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature]):
        raise HTTPException(status_code=400, detail="Missing payment fields.")

    # HMAC-SHA256: sign "order_id|payment_id" with KEY_SECRET
    msg       = f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode("utf-8")
    generated = _hmac.new(RZP_KEY_SECRET.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    if not _hmac.compare_digest(generated, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature mismatch. Payment not verified.")

    return {
        "status":              "success",
        "message":             "Payment verified successfully.",
        "razorpay_payment_id": body.razorpay_payment_id,
        "razorpay_order_id":   body.razorpay_order_id,
    }

# ── Save subscription after verified payment ──────────────────
@app.post("/api/save-subscription")
async def save_subscription(body: SaveSubscriptionRequest):
    if body.plan not in ("basic", "standard"):
        raise HTTPException(status_code=400, detail="Invalid plan.")

    uid     = decode_token(body.token)
    now     = datetime.utcnow()
    now_iso = now.isoformat()

    # Compute expiry: monthly = 30 days, yearly = 365 days
    days    = 365 if body.billing_cycle == "yearly" else 30
    expires = (now + timedelta(days=days)).isoformat()

    # ── 1. Update Supabase profiles ───────────────────────────
    # NOTE: profiles.id is bigint in DB but user IDs are UUIDs — this will fail.
    # We skip it and rely on the subscriptions table as the source of truth.
    # sb_ok is only used for the SQLite fallback check below.
    sb_ok = True  # profiles update skipped intentionally — subscriptions table is authoritative
    print(f"[save-subscription] uid={uid} plan={body.plan} billing_cycle={body.billing_cycle} expires={expires}")

    # ── 2. Upsert subscriptions table ─────────────────────────
    # body.amount is sent as cents (e.g. 600 = $6.00 or 1000 = $10.00)
    # DB amount column is INTEGER — store as whole number of cents (not dollars)
    amount_stored = int(body.amount)  # keep as cents integer: 600, 1000, etc.

    # Use user_id as the conflict target so we UPDATE the existing row
    # instead of always inserting a new one.
    # NOTE: billing_cycle column does NOT exist in the DB — omit it.
    sub_data = {
        "user_id":    uid,
        "plan_name":  body.plan.capitalize(),
        "plan_type":  body.plan,
        "status":     "active",
        "payment_id": body.razorpay_payment_id,
        "order_id":   body.razorpay_order_id,
        "amount":     amount_stored,
        "currency":   body.currency,
        "starts_at":  now_iso,
        "expires_at": expires,
        "updated_at": now_iso,
    }

    # First try to update any existing active row for this user
    existing_updated = False
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            patch_headers = {
                "apikey":        SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type":  "application/json",
            }
            async with httpx.AsyncClient(timeout=8) as client:
                # Check if a row already exists for this user
                check = await client.get(
                    f"{SUPABASE_URL}/rest/v1/subscriptions",
                    headers=_sb_headers(),
                    params={"user_id": f"eq.{uid}", "select": "id", "limit": "1"},
                )
                if check.status_code == 200 and check.json():
                    # Update the existing row
                    upd = await client.patch(
                        f"{SUPABASE_URL}/rest/v1/subscriptions",
                        headers=patch_headers,
                        params={"user_id": f"eq.{uid}"},
                        json={**sub_data, "updated_at": now_iso},
                    )
                    print(f"[save-subscription] patch status={upd.status_code} body={upd.text[:200]}")
                    existing_updated = upd.status_code in (200, 204)
        except Exception as ex:
            print(f"[save-subscription] patch attempt error: {ex}")

    # If no existing row, insert a new one
    if not existing_updated:
        sub_ok = await sb_upsert_subscription({**sub_data, "id": str(uuid.uuid4()), "created_at": now_iso})
        print(f"[save-subscription] insert_ok={sub_ok}")
    else:
        sub_ok = True
        print(f"[save-subscription] updated existing row ok")

    # ── 3. Insert payments table ───────────────────────────────
    await sb_insert_payment({
        "id":             str(uuid.uuid4()),
        "user_id":        uid,
        "payment_id":     body.razorpay_payment_id,
        "order_id":       body.razorpay_order_id,
        "signature":      "",
        "amount":         amount_stored,
        "currency":       body.currency,
        "payment_method": "razorpay",
        "status":         "captured",
        "created_at":     now_iso,
    })

    # ── 4. SQLite fallback ─────────────────────────────────────
    if not sb_ok:
        try:
            conn = sqlite3.connect(DATABASE_URL)
            _ensure_sub_columns(conn)
            conn.execute(
                "UPDATE users SET plan=?, razorpay_payment_id=? WHERE id=?",
                (body.plan, body.razorpay_payment_id, uid),
            )
            conn.commit()
            conn.close()
        except Exception as ex:
            print(f"[save-subscription] SQLite fallback error: {ex}")

    # ── 5. Return the updated subscription state ───────────────
    return {
        "status":      "success",
        "plan":        body.plan,
        "expires_at":  expires,
        "can_scrape":  True,
    }

# ── Get subscription status ───────────────────────────────────
def _parse_iso(ts: str) -> Optional[datetime]:
    """Parse ISO timestamp from Supabase (handles +00:00 timezone suffix)."""
    try:
        # Replace trailing timezone info before fromisoformat (Python 3.10 handles it, 3.11 is fine)
        return datetime.fromisoformat(ts)
    except Exception:
        try:
            # Strip Z or +00:00 and parse as naive UTC
            clean = ts.replace("Z", "").split("+")[0].split("-")[0]
            # That's too aggressive; just strip last 6 chars if it ends with +HH:MM
            clean = re.sub(r"[+-]\d{2}:\d{2}$", "", ts.replace("Z", ""))
            return datetime.fromisoformat(clean)
        except Exception:
            return None

@app.get("/api/subscription")
async def get_subscription(token: str):
    uid = decode_token(token)

    plan:          str           = "free"
    trial_ends_at: Optional[str] = None
    can_scrape:    bool          = True
    expires_at:    Optional[str] = None
    billing_cycle: str           = "monthly"  # "monthly" | "yearly"

    # ══════════════════════════════════════════════════════════
    # STEP 1: Query subscriptions table FIRST — it's the
    #         authoritative source of truth for paid plans.
    #         This works even when profiles table is empty.
    # ══════════════════════════════════════════════════════════
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(
                    f"{SUPABASE_URL}/rest/v1/subscriptions",
                    headers=_sb_headers(),
                    params={
                        "user_id": f"eq.{uid}",
                        "status":  "eq.active",
                        "order":   "created_at.desc",
                        "limit":   "1",
                        "select":  "expires_at,plan_type,starts_at",
                    },
                )
                print(f"[get_subscription] subscriptions status={r.status_code} body={r.text[:300]}")
                if r.status_code == 200 and r.json():
                    sub_row  = r.json()[0]
                    sub_plan = sub_row.get("plan_type", "")
                    if sub_plan in ("basic", "standard"):
                        plan       = sub_plan
                        expires_at = sub_row.get("expires_at")
                        # Derive billing_cycle from starts_at vs expires_at duration
                        starts  = _parse_iso(sub_row.get("starts_at") or "")
                        expires = _parse_iso(expires_at or "")
                        if starts and expires:
                            diff_days = (expires.replace(tzinfo=None) - starts.replace(tzinfo=None)).days
                            billing_cycle = "yearly" if diff_days >= 300 else "monthly"
        except Exception as e:
            print(f"[get_subscription] subscriptions lookup error: {e}")

    # ══════════════════════════════════════════════════════════
    # STEP 2: If no paid plan found, derive trial info.
    #         Profiles table may be broken (bigint id vs uuid).
    #         Fall back to auth.users created_at via admin API.
    # ══════════════════════════════════════════════════════════
    if plan == "free" and SUPABASE_URL and SUPABASE_SERVICE_KEY:
        # Try profiles first (may fail if id column is bigint)
        profile = await sb_get_profile(uid)

        if profile is None:
            # Try to get created_at from Supabase Auth admin endpoint
            try:
                async with httpx.AsyncClient(timeout=8) as client:
                    auth_r = await client.get(
                        f"{SUPABASE_URL}/auth/v1/admin/users/{uid}",
                        headers={
                            "apikey":        SUPABASE_SERVICE_KEY,
                            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                        },
                    )
                    if auth_r.status_code == 200:
                        created_at_str = auth_r.json().get("created_at", "")
                        if created_at_str:
                            created = _parse_iso(created_at_str)
                            if created:
                                trial_ends_at = (created.replace(tzinfo=None) + timedelta(days=3)).isoformat()
                                print(f"[get_subscription] trial from auth.users created_at={created_at_str}")
            except Exception as e:
                print(f"[get_subscription] auth user lookup error: {e}")

            if not trial_ends_at:
                # Last resort: 3 days from now
                trial_ends_at = (datetime.utcnow() + timedelta(days=3)).isoformat()
        else:
            trial_ends_at = profile.get("trial_ends_at")
            if not trial_ends_at and profile.get("created_at"):
                created = _parse_iso(profile["created_at"])
                if created:
                    trial_ends_at = (created.replace(tzinfo=None) + timedelta(days=3)).isoformat()
                    await sb_update_profile(uid, {"trial_ends_at": trial_ends_at})

    # ══════════════════════════════════════════════════════════
    # STEP 3: If Supabase not configured, fall back to SQLite
    # ══════════════════════════════════════════════════════════
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        conn = sqlite3.connect(DATABASE_URL)
        _ensure_sub_columns(conn)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT plan, trial_ends_at, created_at FROM users WHERE id=?", (uid,))
        row = c.fetchone()
        conn.close()
        if not row:
            trial_end = (datetime.utcnow() + timedelta(days=3)).isoformat()
            return {
                "plan":          "free",
                "trial_ends_at": trial_end,
                "trial_active":  True,
                "can_scrape":    True,
                "expires_at":    None,
            }
        plan          = row["plan"] or "free"
        trial_ends_at = row["trial_ends_at"]
        if not trial_ends_at and row["created_at"]:
            created = _parse_iso(str(row["created_at"]))
            if created:
                trial_ends_at = (created.replace(tzinfo=None) + timedelta(days=3)).isoformat()
                c2 = sqlite3.connect(DATABASE_URL)
                c2.execute("UPDATE users SET trial_ends_at=? WHERE id=?", (trial_ends_at, uid))
                c2.commit()
                c2.close()

    # ══════════════════════════════════════════════════════════
    # STEP 4: Compute access rights
    # ══════════════════════════════════════════════════════════
    now = datetime.utcnow().isoformat()

    # Normalise trial_ends_at to naive ISO string for comparison
    trial_ends_naive: Optional[str] = None
    if trial_ends_at:
        t = _parse_iso(trial_ends_at)
        if t:
            trial_ends_naive = t.replace(tzinfo=None).isoformat()

    trial_active = (plan == "free") and bool(trial_ends_naive) and (trial_ends_naive > now)

    if plan in ("basic", "standard"):
        if expires_at:
            exp = _parse_iso(expires_at)
            exp_naive = exp.replace(tzinfo=None).isoformat() if exp else None
            can_scrape = bool(exp_naive and exp_naive > now)
        else:
            # No expiry set → subscription is open-ended, allow scraping
            can_scrape = True
    else:
        can_scrape = trial_active

    print(f"[get_subscription] uid={uid} plan={plan} trial_active={trial_active} can_scrape={can_scrape} expires_at={expires_at}")

    return {
        "plan":          plan,
        "trial_ends_at": trial_ends_naive or trial_ends_at,
        "trial_active":  trial_active,
        "can_scrape":    can_scrape,
        "expires_at":    expires_at,
        "billing_cycle": billing_cycle,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
