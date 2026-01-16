import smtplib
import os
from dotenv import load_dotenv
from email.mime.text import MIMEText

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

def test_smtp():
    print(f"Testing SMTP connection to {SMTP_SERVER}:{SMTP_PORT}...")
    try:
        msg = MIMEText("This is a test email from Xapply verification script.")
        msg["Subject"] = "Xapply SMTP Test"
        msg["From"] = SMTP_USER
        msg["To"] = SMTP_USER  # Send to self

        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
                server.set_debuglevel(1)
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, SMTP_USER, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.set_debuglevel(1)
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, SMTP_USER, msg.as_string())
        
        print("✅ STMP Test Successful! Email sent.")
    except Exception as e:
        print(f"❌ SMTP Test Failed: {e}")

if __name__ == "__main__":
    test_smtp()
