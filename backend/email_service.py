import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from email.utils import formatdate, make_msgid
import os

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
# Fallbacks use the credentials provided directly by the user
SENDER_EMAIL = os.environ.get("ADMIN_EMAIL", "arjunvinit4@gmail.com")
APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "iakf joyh kbxz kydr")

def send_admin_notification(full_name, email, plan, registration_time, ip_address, os_type, country="Unknown"):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"New Signup on Scrapify: {full_name}"
        msg["From"] = SENDER_EMAIL
        msg["To"] = SENDER_EMAIL
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid()

        text = f"New User Registration\n\nName: {full_name}\nEmail: {email}\nPlan: {plan}\nTime: {registration_time}\nCountry: {country}\nIP: {ip_address}\nOS: {os_type}"

        html = f"""
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; background-color: #ffffff; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">
              
              <!-- Dark Header -->
              <div style="background-color: #0F172A; padding: 30px; text-align: center; border-radius: 6px;">
                <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <span style="font-size: 16px; background: #94a3b8; color: #0F172A; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-right: 8px;">NEW</span> 
                  New User Joined Scrapify
                </h2>
              </div>
              
              <div style="padding: 30px 20px;">
                <p style="color: #475569; font-size: 14px; margin-bottom: 30px; text-align: left;">A new user has just registered for a Scrapify account.</p>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500; width: 40%; color: #475569; font-size: 14px;">Full Name</td>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px;">{full_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #475569; font-size: 14px;">Email Address</td>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;"><a href="mailto:{email}" style="color: #3b82f6; text-decoration: none;">{email}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #475569; font-size: 14px;">Registration Time</td>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px;">{registration_time}</td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #475569; font-size: 14px;">Plan</td>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0; color: #111827; font-size: 14px;">{plan}</td>
                  </tr>
                </table>
                
                <!-- Success Banner -->
                <div style="background-color: #ecfdf5; color: #059669; font-weight: 600; font-size: 13px; padding: 16px; text-align: center; margin-top: 40px; border-radius: 6px;">
                  User Account Provisioned Successfully
                </div>
              </div>
            </div>
          </body>
        </html>
        """
        
        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(msg)
            
        print("Admin notification sent successfully.")
        return True
    except Exception as e:
        print(f"Failed to send admin notification: {e}")
        return False

def send_welcome_email(user_email, full_name):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Welcome to Scrapify!"
        msg["From"] = SENDER_EMAIL
        msg["To"] = user_email
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid()

        text = f"""Hi {full_name},

Welcome to Scrapify. Pick a scraper, paste a URL, and ship clean data in seconds. 
We hope this gives you everything you need to extract perfect content.

Go to Dashboard: https://scrapify.app/dashboard

Thank you for choosing Scrapify.
"""

        html = f"""
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; background-color: #f9fafb; padding: 20px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
              
              <!-- Header with Logo -->
              <div style="text-align: center; padding: 40px 20px 30px;">
                  <img src="cid:logo" alt="Scrapify" style="height: 48px; width: auto; margin-bottom: 24px; display: block; margin: 0 auto 24px auto;">
                  <h1 style="color: #111827; margin: 0 0 12px; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Welcome to Scrapify</h1>
                  <p style="color: #6b7280; font-size: 16px; margin: 0; max-width: 400px; margin: 0 auto; line-height: 1.5;">Pick a scraper, paste a URL, and ship clean data in seconds.</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 0 40px 40px;">
                  <p style="font-size: 16px; color: #374151; margin-bottom: 32px;">Hi {full_name},</p>
                  
                  <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 16px;">Scrapers</h2>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 16px;">
                      <h3 style="margin: 0 0 8px; color: #5B4FE8; font-size: 16px;">YouTube Scraper</h3>
                      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">Extract video data, channel info, and statistics from YouTube videos and playlists.</p>
                  </div>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 32px;">
                      <h3 style="margin: 0 0 8px; color: #5B4FE8; font-size: 16px;">Website Scraper</h3>
                      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">Scrape data from any website with advanced parsing and AI-powered extraction.</p>
                  </div>
                  
                  <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 16px;">How It Works</h2>
                  <p style="color: #6b7280; font-size: 15px; margin-bottom: 24px;">From URL to insight in four steps.</p>
                  
                  <table style="width: 100%; margin-bottom: 32px; border-collapse: collapse;">
                      <tr>
                          <td style="vertical-align: top; padding: 0 16px 24px 0; width: 50%;">
                              <div style="color: #5B4FE8; font-size: 13px; font-weight: 700; margin-bottom: 4px;">01</div>
                              <strong style="color: #1e293b; display: block; margin-bottom: 4px;">Sign up</strong>
                              <span style="font-size: 13px; color: #64748b; line-height: 1.5; display: block;">Create your free account. No credit card needed.</span>
                          </td>
                          <td style="vertical-align: top; padding: 0 0 24px 16px; width: 50%;">
                              <div style="color: #5B4FE8; font-size: 13px; font-weight: 700; margin-bottom: 4px;">02</div>
                              <strong style="color: #1e293b; display: block; margin-bottom: 4px;">Choose scraper</strong>
                              <span style="font-size: 13px; color: #64748b; line-height: 1.5; display: block;">Pick from YouTube, Website, or Map scraper.</span>
                          </td>
                      </tr>
                      <tr>
                          <td style="vertical-align: top; padding: 0 16px 0 0;">
                              <div style="color: #5B4FE8; font-size: 13px; font-weight: 700; margin-bottom: 4px;">03</div>
                              <strong style="color: #1e293b; display: block; margin-bottom: 4px;">Enter input</strong>
                              <span style="font-size: 13px; color: #64748b; line-height: 1.5; display: block;">Paste a URL and configure output options.</span>
                          </td>
                          <td style="vertical-align: top; padding: 0 0 0 16px;">
                              <div style="color: #5B4FE8; font-size: 13px; font-weight: 700; margin-bottom: 4px;">04</div>
                              <strong style="color: #1e293b; display: block; margin-bottom: 4px;">Download data</strong>
                              <span style="font-size: 13px; color: #64748b; line-height: 1.5; display: block;">Export to Excel, PDF, or JSON.</span>
                          </td>
                      </tr>
                  </table>
                  
                  <div style="text-align: center; margin-top: 40px; padding-top: 32px; border-top: 1px solid #e5e7eb;">
                      <a href="https://scrapify.app/dashboard" style="background: linear-gradient(135deg, #5B4FE8 0%, #7C6FEF 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(91,79,232,0.3);">Go to Dashboard →</a>
                  </div>
              </div>
              
              <!-- Footer -->
              <div style="background: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 16px; font-size: 14px; color: #475569; font-weight: 500;">Thank you for choosing Scrapify.</p>
                  <p style="margin: 0; font-size: 13px; color: #94a3b8;">© 2026 Scrapify. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
        """
        
        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))
        
        # Attach logo
        try:
            logo_path = os.path.join(os.path.dirname(__file__), "..", "public", "scrapify.png")
            with open(logo_path, "rb") as f:
                img_data = f.read()
            image = MIMEImage(img_data, name="scrapify.png")
            image.add_header("Content-ID", "<logo>")
            image.add_header("Content-Disposition", "inline", filename="scrapify.png")
            msg.attach(image)
        except Exception as img_e:
            print(f"Could not attach logo: {img_e}")

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(msg)
            
        print("Welcome email sent successfully.")
        return True
    except Exception as e:
        print(f"Failed to send welcome email: {e}")
        return False

def send_otp_email(user_email, otp_code):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your Scrapify Verification Code: {otp_code}"
        msg["From"] = SENDER_EMAIL
        msg["To"] = user_email
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid()

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
        
        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(msg)
            
        print("OTP email sent successfully.")
        return True
    except Exception as e:
        print(f"Failed to send OTP email: {e}")
        return False
