"""
Authentication Module - Secure OTP via Email + JWT Sessions
"""
import os
import smtplib
import random
import string
import time
import jwt
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from functools import wraps
from flask import request, jsonify
from dotenv import load_dotenv

load_dotenv()

# ========================
# Configuration
# ========================
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.livemail.co.uk")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "admin@xvanced.co.uk")
SMTP_PASS = os.getenv("SMTP_PASS", "")
JWT_SECRET = os.getenv("JWT_SECRET", "xapply-secret-key-change-in-prod")
JWT_EXPIRY_HOURS = 24
OTP_EXPIRY_SECONDS = 300  # 5 minutes

# ========================
# OTP Generation
# ========================
def generate_otp(length=6):
    """Generate a secure numeric OTP."""
    return ''.join(random.choices(string.digits, k=length))

# ========================
# Email Sending
# ========================
def send_otp_email(to_email: str, otp_code: str) -> bool:
    """Send OTP code via SMTP."""
    if not SMTP_PASS:
        print("[AUTH] WARNING: SMTP_PASS not configured. Email not sent.")
        return False
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your Xapply Verification Code"
        msg["From"] = SMTP_USER
        msg["To"] = to_email
        
        # Plain text fallback
        text = f"Your verification code is: {otp_code}\n\nThis code expires in 5 minutes."
        
        # HTML version
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background: #0B0E14; color: #fff; padding: 40px;">
            <div style="max-width: 400px; margin: 0 auto; background: #151A23; border-radius: 12px; padding: 30px; text-align: center;">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1, #10b981); border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 24px; font-weight: bold; color: white;">X</span>
                </div>
                <h2 style="margin-bottom: 10px;">Verification Code</h2>
                <p style="color: #9ca3af;">Enter this code in Xapply to continue:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #0B0E14; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    {otp_code}
                </div>
                <p style="color: #6b7280; font-size: 12px;">This code expires in 5 minutes.</p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        
        print(f"[AUTH] OTP sent to {to_email}")
        return True
        
    except Exception as e:
        print(f"[AUTH] Email send failed: {e}")
        return False

# ========================
# JWT Token Management
# ========================
def create_token(email: str) -> str:
    """Create a signed JWT token for the user."""
    payload = {
        "email": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + (JWT_EXPIRY_HOURS * 3600)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(token: str) -> dict | None:
    """Verify and decode a JWT token. Returns payload or None if invalid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        print("[AUTH] Token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"[AUTH] Invalid token: {e}")
        return None

def get_token_from_header():
    """Extract token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None

# ========================
# Auth Decorator
# ========================
def require_auth(f):
    """Decorator to protect endpoints. Adds user_email to request context."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_header()
        if not token:
            return jsonify({"error": "Missing authorization token"}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        # Attach user email to request for downstream use
        request.user_email = payload.get("email")
        return f(*args, **kwargs)
    return decorated
