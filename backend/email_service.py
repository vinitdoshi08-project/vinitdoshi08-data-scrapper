import os
import httpx
import base64
from datetime import datetime

# Brevo (Sendinblue) setup
BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

# Use the verified Gmail address
raw_sender = os.environ.get("ADMIN_EMAIL") or os.environ.get("EMAIL_FROM") or "arjunvinit4@gmail.com"
SENDER_EMAIL = raw_sender.strip()
SENDER_NAME = "Scrapify"

print(f"[EmailService] Using Brevo API for emails with sender {SENDER_EMAIL}.", flush=True)

def _send_brevo_email(to_email, subject, html_content, text_content, attachments=None):
    if not BREVO_API_KEY:
        return False
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }
    payload = {
        "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": text_content
    }
    if attachments:
        payload["attachment"] = attachments

    try:
        response = httpx.post(BREVO_API_URL, headers=headers, json=payload, timeout=10.0)
        if response.status_code in (201, 200, 202):
            print(f"[EmailService] Email sent successfully via Brevo to {to_email}", flush=True)
            return True
        else:
            print(f"[EmailService] Brevo API Error: {response.status_code} - {response.text}", flush=True)
            return False
    except Exception as e:
        print(f"[EmailService] Failed to send email via Brevo: {e}", flush=True)
        return False

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

ADMIN_RECIPIENT = os.environ.get("ADMIN_EMAIL", "arjunvinit4@gmail.com").strip()
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME") or os.environ.get("EMAIL_FROM") or "arjunvinit4@gmail.com"
SMTP_PASSWORD = (os.environ.get("SMTP_PASSWORD") or os.environ.get("GMAIL_APP_PASSWORD") or "").replace(" ", "")

from email.utils import formatdate, make_msgid

def _send_smtp_email(to_email, subject, html_content, text_content, attachments=None):
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Scrapify <{SMTP_USERNAME}>"
        msg["To"] = to_email
        msg["Reply-To"] = SMTP_USERNAME
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid(domain="scrapify.app")

        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        if html_content:
            msg.attach(MIMEText(html_content, "html", "utf-8"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=12) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_USERNAME, [to_email], msg.as_string())
        print(f"[EmailService] Email sent via SMTP to {to_email}", flush=True)
        return True
    except Exception as e:
        print(f"[EmailService] SMTP error sending to {to_email}: {e}", flush=True)
        return False

def _send_email(to_email, subject, html_content, text_content, attachments=None):
    # Try Brevo if key exists
    if BREVO_API_KEY:
        ok = _send_brevo_email(to_email, subject, html_content, text_content, attachments)
        if ok:
            return True
    # Fallback to Gmail SMTP
    return _send_smtp_email(to_email, subject, html_content, text_content, attachments)

def send_admin_notification(full_name, email, plan, registration_time, ip_address="Unknown", os_type="Unknown", country="Unknown", city="Unknown", phone="Not provided"):
    text = f"New User Registration\n\nName: {full_name}\nEmail: {email}\nPhone: {phone}\nPlan: {plan}\nTime: {registration_time}\nCountry: {country}\nCity: {city}\nIP: {ip_address}\nOS: {os_type}"

    html = f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; background-color: #ffffff; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background-color: #0F172A; padding: 30px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="font-size: 14px; background: #3b82f6; color: #ffffff; padding: 3px 8px; border-radius: 6px; font-weight: bold; margin-right: 8px;">NEW SIGNUP</span> 
              New User Joined Scrapify
            </h2>
          </div>
          <div style="padding: 26px 24px;">
            <p style="color: #475569; font-size: 14px; margin-bottom: 24px; text-align: left;">A new user has just registered for a Scrapify account with the following details:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; width: 35%; color: #475569; font-size: 14px;">Full Name</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px; font-weight: 600;">{full_name}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Email Address</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;"><a href="mailto:{email}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">{email}</a></td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Phone Number</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px;">{phone or 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Plan</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #5B4FE8; font-weight: 700; font-size: 14px;">{plan}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Country</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px;">{country}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">City</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px;">{city}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">IP Address</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px; font-family: monospace;">{ip_address}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Registration Time</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">{registration_time}</td>
              </tr>
            </table>
            <div style="background-color: #ecfdf5; color: #059669; font-weight: 600; font-size: 13px; padding: 14px; text-align: center; margin-top: 28px; border-radius: 8px;">
              User Account Provisioned Successfully
            </div>
          </div>
        </div>
      </body>
    </html>
    """
    
    # Send to admin (both accounts)
    res = _send_email(ADMIN_RECIPIENT, f"New Signup on Scrapify: {full_name}", html, text)
    if ADMIN_RECIPIENT != "vinit@aivhub.com":
        try:
            _send_email("vinit@aivhub.com", f"New Signup on Scrapify: {full_name}", html, text)
        except Exception:
            pass
    return res

def send_subscription_admin_notification(full_name, email, plan, billing_cycle, action, amount_str, payment_id, ip_address="Unknown", country="Unknown", city="Unknown", phone="Not provided"):
    action_label = {
        "upgrade": "Plan Upgrade",
        "downgrade": "Plan Downgrade",
        "renewal": "Plan Renewal",
        "new": "New Plan Purchase",
        "immediate": "Plan Purchase"
    }.get(action, "Plan Change")

    text = f"""{action_label} on Scrapify!

Customer: {full_name}
Email: {email}
Phone: {phone}
Action: {action_label}
Plan: {plan.upper()} ({billing_cycle.capitalize()})
Amount: {amount_str}
Payment ID: {payment_id}
IP Address: {ip_address}
Location: {city}, {country}
Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
"""

    html = f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; background-color: #ffffff; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background-color: #0F172A; padding: 30px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="font-size: 13px; background: #10b981; color: #ffffff; padding: 3px 8px; border-radius: 6px; font-weight: bold; margin-right: 8px;">{action_label.upper()}</span> 
              Subscription Event
            </h2>
          </div>
          <div style="padding: 26px 24px;">
            <p style="color: #475569; font-size: 14px; margin-bottom: 24px; text-align: left;">A user has completed a subscription action on Scrapify:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; width: 35%; color: #475569; font-size: 14px;">Customer Name</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px; font-weight: 600;">{full_name}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Email Address</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;"><a href="mailto:{email}" style="color: #3b82f6; text-decoration: none;">{email}</a></td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Phone Number</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px;">{phone or 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Plan & Billing</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #5B4FE8; font-weight: 700; font-size: 14px;">{plan.upper()} ({billing_cycle.capitalize()})</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Action</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px; font-weight: 600;">{action_label}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Amount Paid</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #10b981; font-size: 14px; font-weight: 700;">{amount_str}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Payment ID</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px; font-family: monospace;">{payment_id}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">IP Address</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px; font-family: monospace;">{ip_address}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Location</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px;">{city}, {country}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 14px;">Timestamp</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
              </tr>
            </table>
          </div>
        </div>
      </body>
    </html>
    """
    return _send_email(ADMIN_RECIPIENT, f"[{action_label}] {full_name} purchased {plan.upper()}", html, text)

def send_subscription_customer_email(user_email, full_name, plan, billing_cycle, action, amount_str, payment_id):
    action_title = {
        "upgrade": "Plan Upgrade Confirmed",
        "downgrade": "Plan Change Scheduled",
        "renewal": "Plan Renewal Confirmed",
        "new": "Subscription Activated",
        "immediate": "Subscription Activated"
    }.get(action, "Subscription Confirmed")

    text = f"""Hi {full_name},

Thank you for your purchase! Your Scrapify {plan.capitalize()} plan ({billing_cycle.capitalize()}) is now active.

Order Summary:
- Plan: {plan.upper()}
- Billing Cycle: {billing_cycle.capitalize()}
- Amount Paid: {amount_str}
- Payment Reference: {payment_id}

Available Scrapers:
• YouTube Scraper: Video metadata, transcripts, stats & comments
• Website Scraper: Fast text, tables, and AI-extracted media
• Map Scraper: Leads, phone numbers, addresses, ratings & reviews from Google Maps

Open Dashboard: https://scrapify-02.netlify.app/dashboard

If you have any questions, just reply to this email.

Best regards,
The Scrapify Team
"""

    html = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Hero Header with Mesh Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #4338ca 0%, #4f46e5 50%, #6366f1 100%); padding: 44px 36px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px;">
                <tr>
                  <td style="background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); padding: 6px 18px; border-radius: 30px; border: 1px solid rgba(255, 255, 255, 0.25);">
                    <span style="color: #ffffff; font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">✓ PAYMENT CONFIRMED</span>
                  </td>
                </tr>
              </table>
              <h1 style="color: #ffffff; margin: 0 0 10px; font-size: 28px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.25;">{action_title}</h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 15px; margin: 0; line-height: 1.5;">Your premium scraping limits and tools are ready to use.</p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 36px 24px;">
              <p style="font-size: 16px; color: #0f172a; margin: 0 0 14px; font-weight: 600;">Hi {full_name},</p>
              <p style="font-size: 14px; color: #475569; line-height: 1.65; margin: 0 0 28px;">
                Thank you for choosing Scrapify! We've successfully processed your payment. Below are your purchase details and instant access links:
              </p>

              <!-- Order Receipt Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 32px;">
                <tr>
                  <td colspan="2" style="background: #f1f5f9; padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Receipt Summary</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b; font-weight: 500;">Plan</td>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 15px; color: #4338ca; font-weight: 700; text-align: right;">{plan.upper()}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b; font-weight: 500;">Billing Cycle</td>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">{billing_cycle.capitalize()}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b; font-weight: 500;">Amount Paid</td>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 16px; color: #059669; font-weight: 800; text-align: right;">{amount_str}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; font-size: 13px; color: #94a3b8; font-weight: 500;">Payment Reference</td>
                  <td style="padding: 14px 20px; font-size: 12px; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; text-align: right;">{payment_id}</td>
                </tr>
              </table>

              <!-- Scrapers Grid -->
              <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 16px; letter-spacing: -0.01em;">Scrapers Included in Your Plan</h3>
              
              <!-- Scraper 1: YouTube -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 15px; font-weight: 700; color: #e11d48; margin-bottom: 4px;">🎬 YouTube Scraper</div>
                    <div style="font-size: 13px; color: #475569; line-height: 1.5;">Extract full video details, transcriptions, statistics, channel info, and comments.</div>
                  </td>
                </tr>
              </table>

              <!-- Scraper 2: Website -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 15px; font-weight: 700; color: #0284c7; margin-bottom: 4px;">🌐 Website Scraper</div>
                    <div style="font-size: 13px; color: #475569; line-height: 1.5;">Crawl web pages, parse HTML tables, and extract structured text cleanly.</div>
                  </td>
                </tr>
              </table>

              <!-- Scraper 3: Map -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 15px; font-weight: 700; color: #16a34a; margin-bottom: 4px;">📍 Map Scraper</div>
                    <div style="font-size: 13px; color: #475569; line-height: 1.5;">Search Google Maps businesses, extract addresses, contact phone numbers, ratings, and customer reviews.</div>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 28px;">
                <tr>
                  <td align="center">
                    <a href="https://scrapify-02.netlify.app/dashboard" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 15px 40px; border-radius: 12px; box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4); text-align: center;">
                      Go to Your Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; text-align: center; margin: 0;">
                Need help or have questions? Just reply to this email — our support team is happy to assist.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 24px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color: #475569;">Scrapify — Clean data, three clicks away.</p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">© 2026 Scrapify. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """

    attachments = []
    try:
        logo_path = os.path.join(os.path.dirname(__file__), "..", "public", "scrapify.png")
        if os.path.exists(logo_path):
            with open(logo_path, "rb") as f:
                img_data = f.read()
            b64_content = base64.b64encode(img_data).decode('utf-8')
            attachments.append({
                "name": "scrapify.png",
                "content": b64_content
            })
    except Exception as img_e:
        print(f"Could not attach logo to receipt: {img_e}", flush=True)

    return _send_email(user_email, f"Receipt: Your Scrapify {plan.capitalize()} Plan is Active", html, text, attachments if attachments else None)

def send_welcome_email(user_email, full_name):
    text = f"""Hi {full_name},

Welcome to Scrapify! Pick a scraper, paste a URL or keyword, and ship clean data in seconds.

Scrapers available:
• YouTube Scraper: Video details, comments, transcripts & statistics
• Website Scraper: Full site content & structured data tables
• Map Scraper: Google Maps business leads, phone numbers & ratings

Go to Dashboard: https://scrapify-02.netlify.app/dashboard

Thank you for choosing Scrapify!
"""

    html = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Hero Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 48px 36px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px;">
                <tr>
                  <td style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); padding: 6px 18px; border-radius: 30px; border: 1px solid rgba(255, 255, 255, 0.2);">
                    <span style="color: #ffffff; font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">WELCOME TO SCRAPIFY</span>
                  </td>
                </tr>
              </table>
              <h1 style="color: #ffffff; margin: 0 0 10px; font-size: 28px; font-weight: 800; letter-spacing: -0.03em;">Your account is ready!</h1>
              <p style="color: rgba(255, 255, 255, 0.85); font-size: 15px; margin: 0; max-width: 440px; line-height: 1.5;">Pick a scraper, paste a URL or keyword, and download clean data in seconds.</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <p style="font-size: 16px; color: #0f172a; margin: 0 0 12px; font-weight: 600;">Hi {full_name},</p>
              <p style="font-size: 14px; color: #475569; line-height: 1.65; margin: 0 0 28px;">
                Welcome aboard! We are thrilled to have you. Scrapify gives you instant access to 3 powerful scrapers to extract and export data with zero code:
              </p>

              <!-- Scraper 1: YouTube -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 15px; font-weight: 700; color: #e11d48; margin-bottom: 4px;">🎬 YouTube Scraper</div>
                    <div style="font-size: 13.5px; color: #475569; line-height: 1.5;">Extract video data, full transcripts, statistics, channels, and viewer comments.</div>
                  </td>
                </tr>
              </table>

              <!-- Scraper 2: Website -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 15px; font-weight: 700; color: #0284c7; margin-bottom: 4px;">🌐 Website Scraper</div>
                    <div style="font-size: 13.5px; color: #475569; line-height: 1.5;">Scrape any public webpage with advanced parsing, text, and structured tables.</div>
                  </td>
                </tr>
              </table>

              <!-- Scraper 3: Map Scraper -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 15px; font-weight: 700; color: #16a34a; margin-bottom: 4px;">📍 Map Scraper</div>
                    <div style="font-size: 13.5px; color: #475569; line-height: 1.5;">Extract business leads from Google Maps with phone numbers, addresses, ratings, and customer reviews.</div>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 28px;">
                <tr>
                  <td align="center">
                    <a href="https://scrapify-02.netlify.app/dashboard" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 15px 42px; border-radius: 12px; box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4); text-align: center;">
                      Launch Your Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; text-align: center; margin: 0;">
                If you have any questions or feedback, simply reply directly to this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 24px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color: #475569;">Thank you for choosing Scrapify.</p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">© 2026 Scrapify. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """

    attachments = []
    try:
        logo_path = os.path.join(os.path.dirname(__file__), "..", "public", "scrapify.png")
        if os.path.exists(logo_path):
            with open(logo_path, "rb") as f:
                img_data = f.read()
            b64_content = base64.b64encode(img_data).decode('utf-8')
            attachments.append({
                "name": "scrapify.png",
                "content": b64_content
            })
    except Exception as img_e:
        print(f"Could not attach logo: {img_e}", flush=True)

    return _send_email(user_email, "Welcome to Scrapify!", html, text, attachments if attachments else None)

def send_otp_email(user_email, otp_code):
    text = f"Your Scrapify Verification Code is: {otp_code}\n\nPlease enter this code to verify your email address. It expires in 10 minutes."

    html = f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; background-color: #f3f4f6; padding: 30px;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #5B4FE8 0%, #7C6FEF 100%); padding: 24px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Verify Your Email</h2>
          </div>
          <div style="padding: 32px; text-align: center;">
            <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">Please use the following verification code to complete your signup.</p>
            
            <div style="background: #f9fafb; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: 800; color: #5B4FE8; letter-spacing: 4px;">{otp_code}</span>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
    """
    
    return _send_email(user_email, f"Your Scrapify Verification Code: {otp_code}", html, text)
