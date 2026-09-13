from __future__ import annotations

from fastapi import FastAPI, HTTPException, Form, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from googleapiclient.errors import HttpError
from cryptography.fernet import Fernet
import os
import re
import tempfile
import jwt
import uuid
import base64
import hashlib
import hmac as _hmac
import httpx
import random
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlparse, parse_qs
from pydantic import BaseModel, EmailStr
from scraper import (
    extract_id_from_url, fetch_playlist_videos, fetch_video_details,
    fetch_channel_uploads, fetch_search_videos,
    save_to_excel, save_to_pdf, save_to_json, DEFAULT_API_KEY,
)


# Load backend/.env first so imported modules get the vars
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

import threading
from email_service import (
    send_admin_notification,
    send_welcome_email,
    send_otp_email,
    send_subscription_admin_notification,
    send_subscription_customer_email,
)

app = FastAPI()

# ── CORS — reads ALLOWED_ORIGINS env var (comma-separated) ───
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
_extra_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
_allow_origins = list(set([
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:8000",
    "https://scrapify-01.netlify.app",
    "https://scrapify-02.netlify.app",
] + _extra_origins))
print(f"CORS allowed origins: {_allow_origins}")

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
                params={"id": f"eq.{user_id}", "select": "id,email,full_name,phone,plan,trial_ends_at,created_at,ip_address,ip_country,ip_city"},
            )
            print(f"[sb_get_profile] status={r.status_code}")
            if r.status_code == 200:
                rows = r.json()
                return rows[0] if rows else None
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
RZP_KEY_ID     = os.environ.get("RAZORPAY_KEY_ID", "").strip()
RZP_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()

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

# SQLite DB init removed

# ── Pydantic models ───────────────────────────────────────────
class SendOtpRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class SignupNotification(BaseModel):
    full_name: str
    email: EmailStr
    plan: str
    phone: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    ip_address: Optional[str] = None

# Removed unused Pydantic models

class CreateOrderRequest(BaseModel):
    amount: int          # smallest currency unit (INR paise OR USD cents)
    currency: str = "INR"
    receipt: str = ""

class CreateSubscriptionRequest(BaseModel):
    token:         str
    plan:          str           # "basic" | "standard"
    billing_cycle: str = "monthly"  # "monthly" | "yearly"

class CancelAutoRenewRequest(BaseModel):
    token:      str
    sub_id:     str   # razorpay subscription id

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id:   str
    razorpay_payment_id: str
    razorpay_signature:  str

class VerifySubscriptionRequest(BaseModel):
    razorpay_subscription_id: str
    razorpay_payment_id:      str
    razorpay_signature:       str
    token:                    str
    plan:                     str
    billing_cycle:            str = "monthly"
    amount:                   int = 0

class SaveSubscriptionRequest(BaseModel):
    token: str
    plan: str
    billing_cycle: str = "monthly"   # "monthly" | "yearly"
    razorpay_payment_id: str
    razorpay_order_id:   str = ""
    amount:              int = 0     # cents (e.g. 600 = $6.00)
    currency:            str = "USD"

PLAN_RANK = {"free": 0, "basic": 1, "standard": 2}

# ── Auth helpers ──────────────────────────────────────────────
# Removed unused Auth helpers

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
# ── Routes ────────────────────────────────────────────────────

@app.post("/api/notify-signup")
async def notify_signup(data: SignupNotification, request: Request):
    # Resolve real client IP address (handling proxies / Cloudflare / reverse proxies)
    x_forwarded = request.headers.get("X-Forwarded-For")
    cf_connecting = request.headers.get("CF-Connecting-IP")
    if cf_connecting:
        client_ip = cf_connecting.strip()
    elif x_forwarded:
        client_ip = x_forwarded.split(",")[0].strip()
    elif data.ip_address and data.ip_address != "Unknown":
        client_ip = data.ip_address
    elif request.client and request.client.host:
        client_ip = request.client.host
    else:
        client_ip = "Unknown"

    os_type = request.headers.get("User-Agent", "Unknown")
    registration_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    # Geolocation resolution
    country = data.country or "Unknown"
    city = data.city or "Unknown"

    # If IP is public (not private / loopback / unknown), attempt geo-lookup if not provided
    if client_ip and client_ip not in ("127.0.0.1", "localhost", "::1", "Unknown") and (country == "Unknown" or city == "Unknown"):
        try:
            async with httpx.AsyncClient(timeout=4) as geo_client:
                geo_res = await geo_client.get(f"http://ip-api.com/json/{client_ip}?fields=status,country,city")
                if geo_res.status_code == 200:
                    geo_json = geo_res.json()
                    if geo_json.get("status") == "success":
                        if country == "Unknown":
                            country = geo_json.get("country", "Unknown")
                        if city == "Unknown":
                            city = geo_json.get("city", "Unknown")
        except Exception as e:
            print(f"[notify-signup] Geo lookup failed for {client_ip}: {e}")

    # Update profiles table in Supabase with ip_address, ip_country, ip_city, and phone if available
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            patch_data = {
                "ip_address": client_ip,
                "ip_country": country,
                "ip_city": city,
            }
            if data.phone:
                patch_data["phone"] = data.phone

            headers = {
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
            }
            async with httpx.AsyncClient(timeout=8) as client:
                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/profiles",
                    headers=headers,
                    params={"email": f"eq.{data.email}"},
                    json=patch_data,
                )
        except Exception as e:
            print(f"[notify-signup] Failed to update profile with IP/geo/phone: {e}")

    threading.Thread(
        target=send_admin_notification, 
        args=(data.full_name, data.email, data.plan, registration_time, client_ip, os_type, country, city, data.phone or "Not provided")
    ).start()
    
    threading.Thread(
        target=send_welcome_email,
        args=(data.email, data.full_name)
    ).start()
    
    return {"status": "success", "ip_address": client_ip, "country": country, "city": city}


class UpdateProfileRequest(BaseModel):
    token: str
    full_name: Optional[str] = None
    phone: Optional[str] = None

@app.post("/api/update-profile")
async def api_update_profile(body: UpdateProfileRequest):
    uid = decode_token(body.token)
    patch: dict = {}
    if body.full_name is not None:
        patch["full_name"] = body.full_name.strip()
    if body.phone is not None:
        patch["phone"] = body.phone.strip()
    patch["updated_at"] = datetime.utcnow().isoformat()

    ok = await sb_update_profile(uid, patch)
    if not ok:
        # If the row didn't exist yet, try upserting with service key
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            try:
                headers = {
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates",
                }
                async with httpx.AsyncClient(timeout=8) as client:
                    await client.post(
                        f"{SUPABASE_URL}/rest/v1/profiles",
                        headers=headers,
                        json={"id": uid, **patch},
                    )
            except Exception as e:
                print(f"[api_update_profile] upsert failed: {e}")

class DeleteAccountRequest(BaseModel):
    token: str

@app.post("/api/delete-account")
async def api_delete_account(body: DeleteAccountRequest):
    uid = decode_token(body.token)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")

    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            # 1. Delete subscriptions
            try:
                await client.delete(f"{SUPABASE_URL}/rest/v1/subscriptions", headers=headers, params={"user_id": f"eq.{uid}"})
            except Exception as e:
                print(f"[delete-account] delete subscriptions err: {e}")

            # 2. Delete payments
            try:
                await client.delete(f"{SUPABASE_URL}/rest/v1/payments", headers=headers, params={"user_id": f"eq.{uid}"})
            except Exception as e:
                print(f"[delete-account] delete payments err: {e}")

            # 3. Delete profiles row completely
            try:
                r_prof = await client.delete(f"{SUPABASE_URL}/rest/v1/profiles", headers=headers, params={"id": f"eq.{uid}"})
                print(f"[delete-account] profiles deleted status={r_prof.status_code}")
            except Exception as e:
                print(f"[delete-account] delete profiles err: {e}")

            # 4. Delete user from Supabase Auth admin
            try:
                r_auth = await client.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{uid}", headers=headers)
                print(f"[delete-account] auth user deleted status={r_auth.status_code}")
            except Exception as e:
                print(f"[delete-account] delete auth admin err: {e}")

    return {"status": "success", "message": "Account completely deleted"}
def validate_file_name(name: str) -> bool:
    return bool(name and len(name) <= 100 and re.match(r'^[\w\-. ]+$', name))

def is_valid_youtube_url(url: str) -> bool:
    trimmed = url.strip()
    if re.match(r'^(https?://)?(www\.)?(youtube\.com|youtu\.be)/.+', trimmed):
        return True
    if trimmed.startswith('@'):
        return True
    # Allow search terms or handles
    if not trimmed.startswith('http://') and not trimmed.startswith('https://') and len(trimmed) >= 2:
        return True
    return False

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
    max_results: Optional[str] = Form(default="10"),
    sort_by:     Optional[str] = Form(default="newest"),
):
    if not validate_file_name(file_name):
        raise HTTPException(status_code=400, detail="Invalid file name.")
    if not is_valid_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL or search query.")
    if file_format not in ("xlsx", "pdf", "json"):
        raise HTTPException(status_code=400, detail="Unsupported format. Use xlsx, pdf or json.")

    resolved_key = api_key.strip() if api_key and api_key.strip() else DEFAULT_API_KEY
    uid = None

    if not resolved_key:
        raise HTTPException(
            status_code=400,
            detail="No YouTube API key configured. Please add your API key in the scraper page.",
        )

    # Parse max_results
    parsed_max = None
    if max_results and max_results.strip().lower() != "all":
        try:
            parsed_max = int(max_results.strip())
        except ValueError:
            parsed_max = 10

    clean_sort = (sort_by or "newest").strip().lower()

    try:
        url_type, id_value = extract_id_from_url(url)
        if not id_value:
            raise HTTPException(status_code=400, detail="Could not extract video/playlist ID from URL.")

        if url_type == "playlist":
            try:
                video_data = fetch_playlist_videos(id_value, resolved_key, max_results=parsed_max, sort_by=clean_sort)
            except Exception as e:
                query = parse_qs(urlparse(url.strip()).query)
                if 'v' in query:
                    print(f"Playlist fetch failed ({e}), falling back to single video {query['v'][0]}")
                    detail = fetch_video_details(query['v'][0], resolved_key)
                    video_data = [detail] if detail else []
                else:
                    raise e
        elif url_type == "handle":
            video_data = fetch_channel_uploads(id_value, resolved_key, is_handle=True, max_results=parsed_max, sort_by=clean_sort)
        elif url_type == "channel":
            video_data = fetch_channel_uploads(id_value, resolved_key, is_handle=False, max_results=parsed_max, sort_by=clean_sort)
        elif url_type == "search":
            video_data = fetch_search_videos(id_value, resolved_key, max_results=parsed_max, sort_by=clean_sort)
        else:
            detail = fetch_video_details(id_value, resolved_key)
            video_data = [detail] if detail else []

        if not video_data:
            raise HTTPException(status_code=404, detail="No videos found. The playlist or channel may be empty or private.")

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
            # user_api_keys quota update removed
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

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "razorpay_configured": bool(RZP_KEY_ID and RZP_KEY_SECRET),
        "razorpay_key_prefix": RZP_KEY_ID[:16] + "..." if RZP_KEY_ID else "NOT SET",
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_SERVICE_KEY),
    }

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
            error_body = resp.text
            print(f"[create-order] Razorpay error status={resp.status_code} body={error_body}")
            raise HTTPException(status_code=500, detail=f"Razorpay error: {error_body}")
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


# ── Razorpay: Create Subscription (auto-recurring) ───────────
# Razorpay plan IDs (monthly) — create these once in Razorpay dashboard
# or we create them dynamically below.
RZP_PLAN_IDS: dict = {}   # cache: "basic_monthly" → plan_id

async def _get_or_create_rzp_plan(plan: str, billing_cycle: str, amount_inr_paise: int) -> str:
    """Get or create a Razorpay plan and return its plan_id."""
    cache_key = f"{plan}_{billing_cycle}"
    if cache_key in RZP_PLAN_IDS:
        return RZP_PLAN_IDS[cache_key]

    interval       = 1
    period         = "monthly" if billing_cycle == "monthly" else "yearly"
    plan_name      = f"Scrapify {plan.capitalize()} ({billing_cycle.capitalize()})"

    async with httpx.AsyncClient(timeout=15) as client:
        # Check if plan already exists with this name
        list_r = await client.get(
            "https://api.razorpay.com/v1/plans",
            auth=(RZP_KEY_ID, RZP_KEY_SECRET),
            params={"count": 50},
        )
        if list_r.is_success:
            for p in list_r.json().get("items", []):
                if p.get("item", {}).get("name") == plan_name:
                    RZP_PLAN_IDS[cache_key] = p["id"]
                    return p["id"]

        # Create new plan
        create_r = await client.post(
            "https://api.razorpay.com/v1/plans",
            auth=(RZP_KEY_ID, RZP_KEY_SECRET),
            json={
                "period":   period,
                "interval": interval,
                "item": {
                    "name":     plan_name,
                    "amount":   amount_inr_paise,
                    "currency": "INR",
                },
            },
        )
        if not create_r.is_success:
            raise HTTPException(status_code=500, detail=f"Could not create Razorpay plan: {create_r.text}")
        plan_id = create_r.json()["id"]
        RZP_PLAN_IDS[cache_key] = plan_id
        return plan_id


@app.post("/api/create-subscription")
async def create_rzp_subscription(body: CreateSubscriptionRequest):
    """
    Creates a Razorpay Subscription for auto-recurring billing.
    Returns { subscription_id, plan_id } to pass into Razorpay checkout.
    """
    if not RZP_KEY_ID or not RZP_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay not configured.")
    if body.plan not in ("basic", "standard"):
        raise HTTPException(status_code=400, detail="Invalid plan.")

    uid = decode_token(body.token)
    now = datetime.utcnow()

    # Check current active plan for downgrade restrictions
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                cr = await client.get(
                    f"{SUPABASE_URL}/rest/v1/subscriptions",
                    headers=_sb_headers(),
                    params={
                        "user_id": f"eq.{uid}",
                        "status":  "eq.active",
                        "order":   "created_at.desc",
                        "limit":   "1",
                        "select":  "plan_type,expires_at,billing_cycle",
                    },
                )
                if cr.status_code == 200 and cr.json():
                    c_sub = cr.json()[0]
                    c_exp = _parse_iso(c_sub.get("expires_at"))
                    is_active = c_exp and c_exp.replace(tzinfo=None) > now if c_exp else False
                    if is_active:
                        if c_sub.get("billing_cycle") == "yearly" and body.billing_cycle == "monthly":
                            raise HTTPException(
                                status_code=400,
                                detail="Switching from an active Yearly plan to Monthly is not permitted."
                            )
                        if c_sub.get("plan_type") == "standard" and body.plan == "basic" and body.billing_cycle == "monthly":
                            raise HTTPException(
                                status_code=400,
                                detail="Downgrading from Standard to Basic while active is not permitted."
                            )
        except HTTPException:
            raise
        except Exception as e:
            print(f"[create-subscription] check current error: {e}")

    # Amount in INR paise (fetch live rate)
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            fx = await client.get("https://open.er-api.com/v6/latest/USD")
            rate = fx.json().get("rates", {}).get("INR", 84) if fx.is_success else 84
    except Exception:
        rate = 84

    usd_amounts = {
        "basic_monthly": 6, "basic_yearly": 5 * 12,
        "standard_monthly": 9, "standard_yearly": 8 * 12,
    }
    usd = usd_amounts.get(f"{body.plan}_{body.billing_cycle}", 6)
    amount_paise = int(round(usd * rate * 100))

    try:
        plan_id = await _get_or_create_rzp_plan(body.plan, body.billing_cycle, amount_paise)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Plan creation error: {e}")

    # Create subscription
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            sub_r = await client.post(
                "https://api.razorpay.com/v1/subscriptions",
                auth=(RZP_KEY_ID, RZP_KEY_SECRET),
                json={
                    "plan_id":         plan_id,
                    "total_count":     120,   # max 120 billing cycles (~10 years)
                    "quantity":        1,
                    "customer_notify": 1,
                    "notes": {
                        "user_id": uid,
                        "plan":    body.plan,
                    },
                },
            )
        if not sub_r.is_success:
            raise HTTPException(status_code=500, detail=f"Razorpay subscription error: {sub_r.text}")
        sub = sub_r.json()
        return {
            "subscription_id": sub["id"],
            "plan_id":         plan_id,
            "amount_paise":    amount_paise,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Subscription error: {e}")


@app.post("/api/verify-subscription")
async def verify_subscription_payment(body: VerifySubscriptionRequest):
    """
    Verify a Razorpay Subscription payment and activate/extend subscription.
    Called after user completes payment in Razorpay checkout (subscription mode).
    """
    if not RZP_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay not configured.")

    secret_clean = RZP_KEY_SECRET.strip()

    # Razorpay subscription signature: HMAC-SHA256 of "subscription_id|payment_id"
    msg       = f"{body.razorpay_subscription_id}|{body.razorpay_payment_id}".encode("utf-8")
    generated = _hmac.new(secret_clean.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    print(f"[verify-subscription] key_id={RZP_KEY_ID.strip()}")
    print(f"[verify-subscription] secret_len={len(secret_clean)}")
    print(f"[verify-subscription] sub_id={body.razorpay_subscription_id}")
    print(f"[verify-subscription] pay_id={body.razorpay_payment_id}")
    print(f"[verify-subscription] received_sig ={body.razorpay_signature}")
    print(f"[verify-subscription] generated_sig={generated}")
    print(f"[verify-subscription] match={_hmac.compare_digest(generated, body.razorpay_signature)}")

    sig_ok = _hmac.compare_digest(generated, body.razorpay_signature)

    # In test mode Razorpay may send a dummy signature — still activate the plan
    # so the user isn't stuck. We log the mismatch for audit purposes.
    if not sig_ok:
        is_test = RZP_KEY_ID.strip().startswith("rzp_test_")
        if not is_test:
            raise HTTPException(status_code=400, detail="Signature mismatch. Payment not verified.")
        print(f"[verify-subscription] WARNING: sig mismatch in TEST mode — proceeding anyway for UX")

    # Activate/extend in our DB using the same save_subscription logic
    fake_body = SaveSubscriptionRequest(
        token=body.token,
        plan=body.plan,
        billing_cycle=body.billing_cycle,
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_order_id=body.razorpay_subscription_id,
        amount=body.amount,
        currency="INR",
    )
    result = await save_subscription(fake_body)

    # Also store razorpay_sub_id in subscriptions table
    uid = decode_token(body.token)
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/subscriptions",
                    headers={
                        "apikey": SUPABASE_SERVICE_KEY,
                        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                        "Content-Type": "application/json",
                    },
                    params={"user_id": f"eq.{uid}"},
                    json={
                        "razorpay_sub_id": body.razorpay_subscription_id,
                        "auto_renew": True,
                    },
                )
        except Exception as e:
            print(f"[verify-subscription] store sub_id error: {e}")

    return {**result, "subscription_id": body.razorpay_subscription_id, "auto_renew": True}


@app.post("/api/cancel-upcoming")
async def cancel_upcoming(body: CancelAutoRenewRequest):
    """Remove a queued upcoming plan from the subscription row."""
    uid = decode_token(body.token)
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/subscriptions",
                    headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}", "Content-Type": "application/json"},
                    params={"user_id": f"eq.{uid}"},
                    json={"upcoming_plan": None, "upcoming_billing": None, "upcoming_starts_at": None, "updated_at": datetime.utcnow().isoformat()},
                )
        except Exception as e:
            print(f"[cancel-upcoming] error: {e}")
    return {"status": "success", "message": "✅ Scheduled plan change cancelled. Your current plan continues normally."}


@app.post("/api/cancel-auto-renew")
async def cancel_auto_renew(body: CancelAutoRenewRequest):
    """Cancel a Razorpay Subscription (stops future auto-charges)."""
    if not RZP_KEY_ID or not RZP_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay not configured.")

    uid = decode_token(body.token)

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            cancel_r = await client.post(
                f"https://api.razorpay.com/v1/subscriptions/{body.sub_id}/cancel",
                auth=(RZP_KEY_ID, RZP_KEY_SECRET),
                json={"cancel_at_cycle_end": 1},  # cancel at end of current billing cycle
            )
        if not cancel_r.is_success:
            raise HTTPException(status_code=500, detail=f"Razorpay cancel error: {cancel_r.text[:200]}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cancel error: {e}")

    # Update DB
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/subscriptions",
                    headers={
                        "apikey": SUPABASE_SERVICE_KEY,
                        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                        "Content-Type": "application/json",
                    },
                    params={"user_id": f"eq.{uid}"},
                    json={"auto_renew": False},
                )
        except Exception as e:
            print(f"[cancel-auto-renew] DB update error: {e}")

    return {"status": "success", "message": "Auto-renew cancelled. Your plan stays active until the current period ends."}


@app.post("/api/webhook/razorpay")
async def razorpay_webhook(request: Request):
    """
    Razorpay sends webhooks here for subscription events.
    Configure this URL in Razorpay Dashboard → Webhooks.
    """
    body_bytes = await request.body()
    signature  = request.headers.get("X-Razorpay-Signature", "")

    # Verify webhook signature
    if RZP_KEY_SECRET and signature:
        expected = _hmac.new(RZP_KEY_SECRET.encode(), body_bytes, hashlib.sha256).hexdigest()
        if not _hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Webhook signature invalid.")

    try:
        event = __import__("json").loads(body_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON.")

    event_type = event.get("event", "")
    payload    = event.get("payload", {})

    print(f"[webhook] event={event_type}")

    # ── subscription.charged — auto-payment succeeded ─────────
    if event_type == "subscription.charged":
        sub_data    = payload.get("subscription", {}).get("entity", {})
        pay_data    = payload.get("payment", {}).get("entity", {})
        rzp_sub_id  = sub_data.get("id", "")
        payment_id  = pay_data.get("id", "")
        amount      = pay_data.get("amount", 0)   # paise
        notes       = sub_data.get("notes", {})
        user_id     = notes.get("user_id", "")
        plan        = notes.get("plan", "basic")

        if user_id and SUPABASE_URL and SUPABASE_SERVICE_KEY:
            now     = datetime.utcnow()
            expires = (now + timedelta(days=30)).isoformat()
            try:
                async with httpx.AsyncClient(timeout=8) as client:
                    await client.patch(
                        f"{SUPABASE_URL}/rest/v1/subscriptions",
                        headers={
                            "apikey": SUPABASE_SERVICE_KEY,
                            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                            "Content-Type": "application/json",
                        },
                        params={"user_id": f"eq.{user_id}"},
                        json={
                            "plan_type":   plan,
                            "plan_name":   plan.capitalize(),
                            "status":      "active",
                            "expires_at":  expires,
                            "updated_at":  now.isoformat(),
                            "auto_renew":  True,
                        },
                    )
                # Record payment
                await sb_insert_payment({
                    "id":             str(uuid.uuid4()),
                    "user_id":        user_id,
                    "plan":           plan,
                    "payment_id":     payment_id,
                    "order_id":       rzp_sub_id,
                    "signature":      "",
                    "amount":         amount,
                    "currency":       "INR",
                    "payment_method": "razorpay_subscription",
                    "status":         "captured",
                    "created_at":     now.isoformat(),
                })
                print(f"[webhook] subscription.charged uid={user_id} plan={plan} extended to {expires}")
            except Exception as e:
                print(f"[webhook] subscription.charged error: {e}")

    # ── subscription.cancelled or subscription.completed ──────
    elif event_type in ("subscription.cancelled", "subscription.completed"):
        sub_data   = payload.get("subscription", {}).get("entity", {})
        notes      = sub_data.get("notes", {})
        user_id    = notes.get("user_id", "")
        if user_id and SUPABASE_URL and SUPABASE_SERVICE_KEY:
            try:
                async with httpx.AsyncClient(timeout=8) as client:
                    await client.patch(
                        f"{SUPABASE_URL}/rest/v1/subscriptions",
                        headers={
                            "apikey": SUPABASE_SERVICE_KEY,
                            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                            "Content-Type": "application/json",
                        },
                        params={"user_id": f"eq.{user_id}"},
                        json={"auto_renew": False},
                    )
                print(f"[webhook] {event_type} uid={user_id} auto_renew=False")
            except Exception as e:
                print(f"[webhook] {event_type} error: {e}")

    return {"status": "ok"}


# ── Razorpay: Verify Payment ──────────────────────────────────
@app.post("/api/verify-payment")
async def verify_payment(body: VerifyPaymentRequest):
    if not RZP_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay not configured on server.")
    if not all([body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature]):
        raise HTTPException(status_code=400, detail="Missing payment fields.")

    # HMAC-SHA256: sign "order_id|payment_id" with KEY_SECRET
    secret_clean = RZP_KEY_SECRET.strip()
    msg          = f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode("utf-8")
    generated    = _hmac.new(secret_clean.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    print(f"[verify-payment] key_id={RZP_KEY_ID}")
    print(f"[verify-payment] secret_len={len(secret_clean)}")
    print(f"[verify-payment] order_id={body.razorpay_order_id}")
    print(f"[verify-payment] payment_id={body.razorpay_payment_id}")
    print(f"[verify-payment] received_sig={body.razorpay_signature}")
    print(f"[verify-payment] generated_sig={generated}")
    print(f"[verify-payment] match={_hmac.compare_digest(generated, body.razorpay_signature)}")

    if not _hmac.compare_digest(generated, body.razorpay_signature):
        is_test = RZP_KEY_ID.strip().startswith("rzp_test_")
        if not is_test:
            raise HTTPException(status_code=400, detail="Payment signature mismatch. Payment not verified.")
        print(f"[verify-payment] WARNING: sig mismatch in TEST mode — proceeding anyway for UX")

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

    uid      = decode_token(body.token)
    now      = datetime.utcnow()
    now_iso  = now.isoformat()
    days     = 365 if body.billing_cycle == "yearly" else 30
    new_plan = body.plan
    new_rank = PLAN_RANK.get(new_plan, 0)

    amount_stored = int(body.amount)  # cents

    # ── Fetch current active subscription ─────────────────────
    current_sub = None
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
                        "select":  "id,plan_type,expires_at,starts_at,billing_cycle,upcoming_plan,upcoming_billing,upcoming_starts_at",
                    },
                )
                if r.status_code == 200 and r.json():
                    current_sub = r.json()[0]
        except Exception as e:
            print(f"[save-subscription] fetch current error: {e}")

    current_plan      = current_sub.get("plan_type", "free") if current_sub else "free"
    current_expires   = current_sub.get("expires_at") if current_sub else None
    current_rank      = PLAN_RANK.get(current_plan, 0)

    # Parse current expiry
    current_exp_dt = None
    if current_expires:
        current_exp_dt = _parse_iso(current_expires)
        if current_exp_dt:
            current_exp_dt = current_exp_dt.replace(tzinfo=None)

    plan_active = current_exp_dt and current_exp_dt > now if current_exp_dt else False

    # ── Strict Downgrade Prevention ─────────────────────────
    current_cycle = current_sub.get("billing_cycle", "monthly") if current_sub else "monthly"

    # If currently active on Yearly, cannot degrade to Monthly until yearly period ends
    if plan_active and current_cycle == "yearly" and body.billing_cycle == "monthly":
        raise HTTPException(
            status_code=400,
            detail="Your account is on an active Yearly plan. Changing to Monthly is not permitted during your yearly period."
        )

    # If active on Standard Monthly, user cannot downgrade to Basic Monthly (can only switch to Yearly)
    if plan_active and current_plan == "standard" and new_plan == "basic" and body.billing_cycle == "monthly":
        raise HTTPException(
            status_code=400,
            detail="Downgrading from Standard to Basic while your monthly plan is active is not permitted."
        )

    action = "immediate"  # default

    if plan_active and current_sub:
        if new_plan == current_plan:
            action = "renewal"       # same plan → stack after current
        elif new_rank > current_rank:
            action = "upgrade"       # better plan → immediate
        else:
            action = "downgrade"     # cheaper plan → queue after current

    print(f"[save-subscription] uid={uid} current={current_plan} new={new_plan} action={action} plan_active={plan_active}")

    response_payload: dict = {}

    if action == "immediate" or action == "upgrade":
        # Start from now
        starts  = now
        expires = (now + timedelta(days=days)).isoformat()
        starts_iso = now_iso

        sub_data = {
            "plan_name":     new_plan.capitalize(),
            "plan_type":     new_plan,
            "status":        "active",
            "billing_cycle": body.billing_cycle,
            "payment_id":    body.razorpay_payment_id,
            "order_id":      body.razorpay_order_id,
            "amount":        amount_stored,
            "currency":      body.currency,
            "starts_at":     starts_iso,
            "expires_at":    expires,
            "updated_at":    now_iso,
            # Clear any pending upcoming plan
            "upcoming_plan":      None,
            "upcoming_billing":   None,
            "upcoming_starts_at": None,
        }

        saved = False
        if current_sub and SUPABASE_URL and SUPABASE_SERVICE_KEY:
            try:
                async with httpx.AsyncClient(timeout=8) as client:
                    upd = await client.patch(
                        f"{SUPABASE_URL}/rest/v1/subscriptions",
                        headers={
                            "apikey":        SUPABASE_SERVICE_KEY,
                            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                            "Content-Type":  "application/json",
                        },
                        params={"user_id": f"eq.{uid}"},
                        json=sub_data,
                    )
                    saved = upd.status_code in (200, 204)
                    print(f"[save-subscription] {action} patch status={upd.status_code}")
            except Exception as ex:
                print(f"[save-subscription] patch error: {ex}")

        if not saved:
            insert_data = {**sub_data, "user_id": uid, "id": str(uuid.uuid4()), "created_at": now_iso}
            await sb_upsert_subscription(insert_data)

        response_payload = {
            "status":      "success",
            "action":      action,
            "plan":        new_plan,
            "starts_at":   starts_iso,
            "expires_at":  expires,
            "can_scrape":  True,
            "message":     f"🎉 {new_plan.capitalize()} plan {'upgraded and' if action == 'upgrade' else ''}activated! Valid for {days} days.",
        }

    elif action == "renewal":
        # Stack after current plan ends
        starts_dt  = current_exp_dt if current_exp_dt else now
        starts_iso = starts_dt.isoformat()
        expires    = (starts_dt + timedelta(days=days)).isoformat()

        sub_data = {
            "upcoming_plan":      new_plan,
            "upcoming_billing":   body.billing_cycle,
            "upcoming_starts_at": starts_iso,
            "updated_at":         now_iso,
        }

        if current_sub and SUPABASE_URL and SUPABASE_SERVICE_KEY:
            try:
                async with httpx.AsyncClient(timeout=8) as client:
                    upd = await client.patch(
                        f"{SUPABASE_URL}/rest/v1/subscriptions",
                        headers={
                            "apikey":        SUPABASE_SERVICE_KEY,
                            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                            "Content-Type":  "application/json",
                        },
                        params={"user_id": f"eq.{uid}"},
                        json=sub_data,
                    )
                    print(f"[save-subscription] renewal patch status={upd.status_code}")
            except Exception as ex:
                print(f"[save-subscription] renewal patch error: {ex}")

        response_payload = {
            "status":       "success",
            "action":       "renewal",
            "plan":         current_plan,
            "upcoming_plan": new_plan,
            "upcoming_starts_at": starts_iso,
            "expires_at":   current_expires,
            "can_scrape":   True,
            "message":      f"✅ Renewal booked! Your {new_plan.capitalize()} plan will start on {starts_dt.strftime('%d %b %Y')} after current plan ends.",
        }

    elif action == "downgrade":
        # Queue as upcoming, starts at current plan's expiry
        starts_dt  = current_exp_dt if current_exp_dt else now
        starts_iso = starts_dt.isoformat()

        sub_data = {
            "upcoming_plan":      new_plan,
            "upcoming_billing":   body.billing_cycle,
            "upcoming_starts_at": starts_iso,
            "updated_at":         now_iso,
        }

        if current_sub and SUPABASE_URL and SUPABASE_SERVICE_KEY:
            try:
                async with httpx.AsyncClient(timeout=8) as client:
                    upd = await client.patch(
                        f"{SUPABASE_URL}/rest/v1/subscriptions",
                        headers={
                            "apikey":        SUPABASE_SERVICE_KEY,
                            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                            "Content-Type":  "application/json",
                        },
                        params={"user_id": f"eq.{uid}"},
                        json=sub_data,
                    )
                    print(f"[save-subscription] downgrade patch status={upd.status_code}")
            except Exception as ex:
                print(f"[save-subscription] downgrade patch error: {ex}")

        response_payload = {
            "status":            "success",
            "action":            "downgrade",
            "plan":              current_plan,
            "upcoming_plan":     new_plan,
            "upcoming_starts_at": starts_iso,
            "expires_at":        current_expires,
            "can_scrape":        True,
            "message":           f"⏳ Downgrade scheduled. You'll stay on {current_plan.capitalize()} until {starts_dt.strftime('%d %b %Y')}, then switch to {new_plan.capitalize()}.",
        }

    # ── Insert payment record ──────────────────────────────────
    await sb_insert_payment({
        "id":             str(uuid.uuid4()),
        "user_id":        uid,
        "plan":           new_plan,
        "payment_id":     body.razorpay_payment_id,
        "order_id":       body.razorpay_order_id,
        "signature":      "",
        "amount":         amount_stored,
        "currency":       body.currency,
        "payment_method": "razorpay",
        "status":         "captured",
        "created_at":     now_iso,
    })

    # ── Send Notifications (Admin & Customer) in background ───
    try:
        profile_row = await sb_get_profile(uid)
        user_name = (profile_row.get("full_name") if profile_row else "") or "Customer"
        user_email = (profile_row.get("email") if profile_row else "") or ""
        user_phone = (profile_row.get("phone") if profile_row else "") or "Not provided"
        user_ip = (profile_row.get("ip_address") if profile_row else "") or "Unknown"
        user_country = (profile_row.get("ip_country") if profile_row else "") or "Unknown"
        user_city = (profile_row.get("ip_city") if profile_row else "") or "Unknown"

        # Format amount (e.g. "$6.00" or "$60.00")
        if body.currency == "USD":
            amount_display = f"${amount_stored / 100:.2f} USD"
        elif body.currency == "INR":
            amount_display = f"₹{amount_stored / 100:.2f} INR"
        else:
            amount_display = f"{amount_stored / 100:.2f} {body.currency}"

        # 1. Admin Email (Upgrade / Downgrade / Renewal)
        threading.Thread(
            target=send_subscription_admin_notification,
            args=(
                user_name,
                user_email,
                new_plan,
                body.billing_cycle,
                action,
                amount_display,
                body.razorpay_payment_id,
                user_ip,
                user_country,
                user_city,
                user_phone,
            ),
        ).start()

        # 2. Customer Receipt / Confirmation Email
        if user_email:
            threading.Thread(
                target=send_subscription_customer_email,
                args=(
                    user_email,
                    user_name,
                    new_plan,
                    body.billing_cycle,
                    action,
                    amount_display,
                    body.razorpay_payment_id,
                ),
            ).start()
    except Exception as notify_err:
        print(f"[save-subscription] email notification error: {notify_err}")

    return response_payload


# ── Get payments history ───────────────────────────────────────
@app.get("/api/payments")
async def get_payments(token: str):
    uid = decode_token(token)
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {"payments": []}
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/payments",
                headers=_sb_headers(),
                params={
                    "user_id": f"eq.{uid}",
                    "order":   "created_at.desc",
                    "select":  "id,plan,payment_id,order_id,amount,currency,status,created_at",
                },
            )
            if r.status_code == 200:
                return {"payments": r.json()}
    except Exception as e:
        print(f"[get_payments] error: {e}")
    return {"payments": []}


# ── Sync subscription from payments (recovery endpoint) ───────
class SyncRequest(BaseModel):
    token: str

@app.post("/api/sync-subscription")
async def sync_subscription(body: SyncRequest):
    """
    Rebuilds the subscriptions row from the most recent captured payment.
    Call this if a payment succeeded but the plan wasn't activated.
    """
    uid = decode_token(body.token)
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured.")

    # 1. Get the most recent captured payment
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/payments",
                headers=_sb_headers(),
                params={
                    "user_id": f"eq.{uid}",
                    "status":  "eq.captured",
                    "order":   "created_at.desc",
                    "limit":   "1",
                    "select":  "plan,payment_id,order_id,amount,currency,created_at",
                },
            )
            if r.status_code != 200 or not r.json():
                raise HTTPException(status_code=404, detail="No captured payment found for this user.")
            payment = r.json()[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment lookup error: {e}")

    plan_from_payment = payment.get("plan", "basic")
    if plan_from_payment not in ("basic", "standard"):
        raise HTTPException(status_code=400, detail=f"Invalid plan in payment: {plan_from_payment}")

    # 2. Check if subscription row already exists and is active
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            sr = await client.get(
                f"{SUPABASE_URL}/rest/v1/subscriptions",
                headers=_sb_headers(),
                params={"user_id": f"eq.{uid}", "select": "id,plan_type,status,expires_at"},
            )
            existing = sr.json() if sr.status_code == 200 else []
    except Exception:
        existing = []

    # 3. Build subscription data
    created_at_str = payment.get("created_at", datetime.utcnow().isoformat())
    created_dt = _parse_iso(created_at_str)
    if not created_dt:
        created_dt = datetime.utcnow()
    created_dt = created_dt.replace(tzinfo=None)

    now     = datetime.utcnow()
    days    = 30  # default monthly
    starts  = created_dt
    expires = (starts + timedelta(days=days)).isoformat()

    sub_data = {
        "user_id":       uid,
        "plan_name":     plan_from_payment.capitalize(),
        "plan_type":     plan_from_payment,
        "status":        "active",
        "billing_cycle": "monthly",
        "payment_id":    payment.get("payment_id", ""),
        "order_id":      payment.get("order_id", ""),
        "amount":        payment.get("amount", 0),
        "currency":      payment.get("currency", "INR"),
        "starts_at":     starts.isoformat(),
        "expires_at":    expires,
        "updated_at":    now.isoformat(),
        "upcoming_plan":      None,
        "upcoming_billing":   None,
        "upcoming_starts_at": None,
    }

    if existing:
        # Update existing row
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                upd = await client.patch(
                    f"{SUPABASE_URL}/rest/v1/subscriptions",
                    headers={
                        "apikey":        SUPABASE_SERVICE_KEY,
                        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                        "Content-Type":  "application/json",
                    },
                    params={"user_id": f"eq.{uid}"},
                    json={k: v for k, v in sub_data.items() if k != "user_id"},
                )
                print(f"[sync-subscription] patch status={upd.status_code} body={upd.text[:200]}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Update error: {e}")
    else:
        # Insert new row
        insert_data = {**sub_data, "id": str(uuid.uuid4()), "created_at": now.isoformat()}
        ok = await sb_upsert_subscription(insert_data)
        if not ok:
            raise HTTPException(status_code=500, detail="Failed to create subscription record.")

    return {
        "status":     "success",
        "plan":       plan_from_payment,
        "expires_at": expires,
        "message":    f"✅ {plan_from_payment.capitalize()} plan activated! Valid until {expires[:10]}.",
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
    upcoming_plan:       Optional[str] = None
    upcoming_billing:    Optional[str] = None
    upcoming_starts_at:  Optional[str] = None
    auto_renew:          bool          = False
    razorpay_sub_id:     Optional[str] = None

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
                        "select":  "expires_at,plan_type,starts_at,billing_cycle,upcoming_plan,upcoming_billing,upcoming_starts_at",
                    },
                )
                print(f"[get_subscription] subscriptions status={r.status_code} body={r.text[:300]}")
                if r.status_code == 200 and r.json():
                    sub_row  = r.json()[0]
                    sub_plan = sub_row.get("plan_type", "")
                    if sub_plan in ("basic", "standard"):
                        plan       = sub_plan
                        expires_at = sub_row.get("expires_at")
                        # billing_cycle: stored in DB or infer from duration
                        stored_bc = sub_row.get("billing_cycle")
                        if stored_bc in ("monthly", "yearly"):
                            billing_cycle = stored_bc
                        else:
                            starts  = _parse_iso(sub_row.get("starts_at") or "")
                            expires = _parse_iso(expires_at or "")
                            if starts and expires:
                                diff_days = (expires.replace(tzinfo=None) - starts.replace(tzinfo=None)).days
                                billing_cycle = "yearly" if diff_days >= 300 else "monthly"
                        # Upcoming plan info
                        upcoming_plan       = sub_row.get("upcoming_plan")
                        upcoming_billing    = sub_row.get("upcoming_billing")
                        upcoming_starts_at  = sub_row.get("upcoming_starts_at")
                        auto_renew          = bool(sub_row.get("auto_renew", False))
                        razorpay_sub_id     = sub_row.get("razorpay_sub_id")
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
    # STEP 3: If Supabase not configured (SQLite fallback removed)
    # ══════════════════════════════════════════════════════════
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        pass

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
        "plan":               plan,
        "trial_ends_at":      trial_ends_naive or trial_ends_at,
        "trial_active":       trial_active,
        "can_scrape":         can_scrape,
        "expires_at":         expires_at,
        "billing_cycle":      billing_cycle,
        "upcoming_plan":      upcoming_plan,
        "upcoming_billing":   upcoming_billing,
        "upcoming_starts_at": upcoming_starts_at,
        "auto_renew":         auto_renew,
        "razorpay_sub_id":    razorpay_sub_id,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
