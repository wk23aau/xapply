import os
import time
import json
import threading
import undetected_chromedriver as uc
from flask import Flask, jsonify, request
from flask_cors import CORS
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from utils.file_patcher import FilePatcher
from database import Database
from surfer import JobSurfer
import google.generativeai as genai
from dotenv import load_dotenv
from auth import generate_otp, send_otp_email, create_token, verify_token, require_auth, OTP_EXPIRY_SECONDS

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
AGENTS_DIR = os.path.join(os.path.dirname(__file__), "agents")
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
PROFILE_DIR = os.path.join(os.path.dirname(__file__), "data", "profiles")

# --- Shared State ---
agent_state = {
    "active": False,
    "status": "Idle",
    "logs": [],
    "latest_screenshot": None,
    "current_task": None
}

def log_event(message):
    timestamp = time.strftime("%H:%M:%S")
    entry = f"[{timestamp}] {message}"
    print(entry)
    agent_state["logs"].append(entry)
    if len(agent_state["logs"]) > 50:
        agent_state["logs"].pop(0)

# --- Flask API ---
app = Flask(__name__)
CORS(app)

@app.route('/state', methods=['GET'])
def get_state():
    return jsonify(agent_state)

@app.route('/jobs', methods=['GET'])
def get_jobs():
    db = Database()
    try:
        jobs = db.get_jobs()
        return jsonify({"scouted": [j for j in jobs if j['status'] == 'scouted'], "applied": [j for j in jobs if j['status'] == 'applied']})
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/profile', methods=['GET', 'POST'])
def handle_profile():
    db = Database()
    if request.method == 'GET':
        try:
            return jsonify(db.get_profile())
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            new_data = request.json
            db.save_profile(new_data)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/onboarding', methods=['GET', 'POST'])
def handle_onboarding():
    """Check or update onboarding status."""
    db = Database()
    if request.method == 'GET':
        return jsonify({"hasOnboarded": db.has_onboarded()})
    elif request.method == 'POST':
        db.set_onboarded(True)
        return jsonify({"success": True})

# ========================
# Auth Endpoints
# ========================
@app.route('/auth/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to user's email."""
    data = request.json
    email = data.get('email', '').strip().lower()
    
    if not email or '@' not in email:
        return jsonify({"error": "Invalid email address"}), 400
    
    # Generate and store OTP
    otp_code = generate_otp()
    expires_at = time.time() + OTP_EXPIRY_SECONDS
    
    db = Database()
    db.save_otp(email, otp_code, expires_at)
    
    # Send email
    success = send_otp_email(email, otp_code)
    
    if success:
        return jsonify({"success": True, "message": "Verification code sent"})
    else:
        # Still return success for testing (but log warning)
        return jsonify({"success": True, "message": "Verification code sent (SMTP may be disabled)"})

@app.route('/auth/verify-otp', methods=['POST'])
def verify_otp_endpoint():
    """Verify OTP and return JWT token."""
    data = request.json
    email = data.get('email', '').strip().lower()
    otp_code = data.get('otp', '').strip()
    
    if not email or not otp_code:
        return jsonify({"error": "Email and OTP required"}), 400
    
    db = Database()
    is_valid = db.verify_otp(email, otp_code)
    
    if is_valid:
        token = create_token(email)
        return jsonify({"success": True, "token": token, "email": email})
    else:
        return jsonify({"error": "Invalid or expired verification code"}), 401

@app.route('/auth/me', methods=['GET'])
@require_auth
def get_current_user():
    """Returns current authenticated user info."""
    return jsonify({"email": request.user_email, "authenticated": True})

@app.route('/upload_resume', methods=['POST'])
def upload_resume():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    try:
        # Save temp file
        # Save temp file
        db = Database()
        data_dir = os.path.join(os.path.dirname(__file__), "data")
        os.makedirs(data_dir, exist_ok=True)
        temp_path = os.path.join(data_dir, f"temp_{file.filename}")
        file.save(temp_path)
        
        # Configure Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
             return jsonify({"error": "Missing GEMINI_API_KEY"}), 500
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Upload to Gemini (or pass as data)
        # For simplicity with the SDK, we'll assume image/pdf support via mime_type
        mime_type = file.content_type or "application/pdf"
        
        with open(temp_path, "rb") as f:
            file_data = f.read()

        prompt = """
        Extract the resume information from this document into the following JSON structure:
        {
            "personalInfo": {
                "name": "Full Name",
                "title": "Current Job Title",
                "address": "Location/City",
                "phone": "Phone Number",
                "email": "Email Address"
            },
            "summary": "Professional summary text",
            "skills": [
                { "category": "Category Name (e.g. Languages)", "items": ["Skill1", "Skill2"] }
            ],
            "experience": [
                {
                    "company": "Company Name",
                    "location": "Location",
                    "role": "Job Title",
                    "dates": "Date Range",
                    "bullets": ["Achievement 1", "Achievement 2"]
                }
            ],
            "education": [
                {
                    "degree": "Degree Name",
                    "institution": "University Name",
                    "location": "Location",
                    "dates": "Date Range",
                    "details": ["Honors", "GPA"]
                }
            ]
        }
        Return ONLY valid JSON.
        """
        
        content = [
            {"mime_type": mime_type, "data": file_data},
            prompt
        ]
        
        response = model.generate_content(content)
        cleaned_json = response.text.replace("```json", "").replace("```", "").strip()
        resume_data = json.loads(cleaned_json)
        
        # Save to DB
        db = Database()
        db.save_profile(resume_data)
        db.set_onboarded(True)  # Mark onboarding complete after successful upload
            
        # Clean up
        os.remove(temp_path)
        
        return jsonify(resume_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/control', methods=['POST'])
def control_agent():
    data = request.json
    command = data.get("command")
    
    if command == "start":
        agent_state["active"] = True
        agent_state["status"] = "Starting..."
        log_event("Received START command from frontend.")
        
        task_file = os.path.join(AGENTS_DIR, "a1_frontend_input.txt")
        if not os.path.exists(task_file) or os.path.getsize(task_file) == 0 or data.get("task"):
            with open(task_file, 'w') as f:
                task_content = data.get("task") or "Browse https://testdevjobs.com/ for 'Software Engineer' jobs and apply."
                f.write(task_content)
            log_event(f"Injected browsing task: {task_content[:50]}...")
            
    elif command == "stop":
        agent_state["active"] = False
        agent_state["status"] = "Stopping..."
        log_event("Received STOP command.")
        
    return jsonify({"success": True})

def run_api():
    app.run(port=5000, debug=False, use_reloader=False)

# --- Agent Logic ---

class AgentOrchestrator:
    def __init__(self):
        self.brain_mode = "browser" # 'browser' or 'api'
        self.brain_driver = None
        self.brain_model = None
        self.surfer = None
        self.db = Database()
        self.ensure_agent_files()
        
    def setup_brain(self):
        """Initializes the AI Interface (Brain) using Outlier AI Playground."""
        if self.brain_driver: 
            return
        
        log_event("Launching Outlier AI Playground Brain...")
        
        # Use persistent profile to save Google login
        brain_profile_dir = os.path.join(PROFILE_DIR, "brain")
        
        # Auto-manage profile compatibility
        from utils.profile_manager import ensure_profile_compatibility
        ensure_profile_compatibility(brain_profile_dir)
        
        options = uc.ChromeOptions()
        options.add_argument(f"--user-data-dir={brain_profile_dir}")
        self.brain_driver = uc.Chrome(options=options)
        self.brain_mode = "browser"
        
        # Navigate to Outlier playground
        self.brain_driver.get("https://app.outlier.ai/playground")
        time.sleep(3)
        
        driver = self.brain_driver
        
        # Check if we're on login page and auto-complete login
        if "login" in driver.current_url:
            log_event("On login page. Auto-logging in with Google...")
            
            try:
                # Click "Continue with Google" button
                google_btns = driver.find_elements(By.XPATH, "//button[contains(text(), 'Google') or contains(text(), 'google')]")
                if not google_btns:
                    google_btns = driver.find_elements(By.CSS_SELECTOR, "button.scaleui")
                for btn in google_btns:
                    if btn.is_displayed():
                        btn.click()
                        log_event("Clicked Continue with Google")
                        time.sleep(3)
                        break
                
                # Handle Google login form
                # Enter email
                try:
                    email_input = WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
                    )
                    email_input.send_keys("mistrcrunchy")
                    log_event("Entered email")
                    time.sleep(0.5)
                    
                    # Click Next
                    next_btns = driver.find_elements(By.XPATH, "//button[contains(text(), 'Next')] | //span[contains(text(), 'Next')]/parent::button")
                    for btn in next_btns:
                        if btn.is_displayed():
                            btn.click()
                            break
                    time.sleep(3)
                    
                    # Enter password
                    password_input = WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password']"))
                    )
                    password_input.send_keys("fb3bbc2c")
                    log_event("Entered password")
                    time.sleep(0.5)
                    
                    # Click Next again
                    next_btns = driver.find_elements(By.XPATH, "//button[contains(text(), 'Next')] | //span[contains(text(), 'Next')]/parent::button")
                    for btn in next_btns:
                        if btn.is_displayed():
                            btn.click()
                            break
                    time.sleep(5)
                    
                    # Handle any "Continue" consent screen
                    try:
                        continue_btns = driver.find_elements(By.XPATH, "//button[contains(text(), 'Continue') or contains(text(), 'Allow')]")
                        for btn in continue_btns:
                            if btn.is_displayed():
                                btn.click()
                                time.sleep(2)
                                break
                    except:
                        pass
                        
                except Exception as e:
                    log_event(f"Google login form error (may be already logged in): {e}")
                
                # Wait for redirect back to Outlier
                for _ in range(30):
                    time.sleep(1)
                    if "outlier" in driver.current_url:
                        break
                
                # Skip onboarding by going directly to playground
                driver.get("https://app.outlier.ai/playground")
                log_event("Navigated to playground (skipping onboarding)")
                time.sleep(2)
                        
            except Exception as e:
                log_event(f"Login automation error: {e}")
        
        # If we're on onboarding, go to playground directly
        if "onboarding" in driver.current_url:
            driver.get("https://app.outlier.ai/playground")
            log_event("Skipped onboarding - went to playground")
            time.sleep(2)
        
        # Ensure we're on playground
        if "playground" not in driver.current_url:
            driver.get("https://app.outlier.ai/playground")
            time.sleep(2)
        
        log_event("Outlier AI Playground Ready.")

    def setup_body(self):
        """Initializes the browser for Job Surfing (Body)."""
        if self.surfer: return
        self.surfer = JobSurfer()

    def ensure_agent_files(self):
        config_path = os.path.join(AGENTS_DIR, "config.json")
        if not os.path.exists(config_path):
            os.makedirs(AGENTS_DIR, exist_ok=True)
            with open(config_path, 'w') as f: json.dump({"agents": [{"id": "a1_frontend"}]}, f)
        
        # Ensure input/output files exist
        for filename in os.listdir(AGENTS_DIR):
             if filename.endswith(".txt"): return
        
        # Create default if empty
        with open(os.path.join(AGENTS_DIR, "a1_frontend_input.txt"), 'w') as f: f.write("")
        with open(os.path.join(AGENTS_DIR, "a1_frontend_output.txt"), 'w') as f: f.write("")

    def ask_ai(self, prompt, context=None):
        """Sends prompt + context to AI Brain."""
        self.setup_brain()
        
        full_prompt = prompt
        if context:
            # Build interactive elements list
            elements_text = ""
            if context.get('interactive_elements'):
                elements_text = "\n\nAVAILABLE INTERACTIVE ELEMENTS (use these selectors exactly):\n"
                for el in context['interactive_elements']:
                    el_desc = f"  [{el['index']}] {el['tag']} | selector: \"{el['selector']}\" | text: \"{el['text']}\""
                    if el.get('type'):
                        el_desc += f" | type: {el['type']}"
                    if el.get('href'):
                        el_desc += f" | href: {el['href']}"
                    elements_text += el_desc + "\n"
            
            full_prompt += f"\n\nCURRENT BROWSER STATE:\nURL: {context['url']}\nPAGE TEXT (excerpt): {context['text_content'][:1500]}\n"
            full_prompt += elements_text
            full_prompt += """
YOU MUST RESPOND WITH ONLY A JSON OBJECT. NO TEXT BEFORE OR AFTER.

You are a web browsing agent. Based on the current page state and available elements, decide the next action.

RESPONSE FORMAT (pick one):
{"action": "click", "selector": "EXACT_SELECTOR_FROM_LIST"}
{"action": "type", "selector": "EXACT_SELECTOR_FROM_LIST", "value": "text to type"}
{"action": "navigate", "url": "https://..."}
{"action": "scroll"}
{"action": "done", "reason": "brief reason"}

RULES:
1. Output ONLY the JSON object, nothing else
2. Use selectors EXACTLY as shown in the AVAILABLE INTERACTIVE ELEMENTS list
3. For job searching, look for search inputs or job listing links"""

        # --- BROWSER MODE (Outlier AI Playground) ---
        driver = self.brain_driver
        try:
            log_event("Consulting AI Brain (Outlier)...")
            
            # Start a new conversation by navigating to playground
            driver.get("https://app.outlier.ai/playground")
            time.sleep(3)
            
            # Step 1: Click model picker button using data-testid
            try:
                model_picker = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='model-picker-button']"))
                )
                model_picker.click()
                log_event("Opened model picker")
                time.sleep(2)
                
                # Step 2: Select Claude Opus 4.5
                claude_card = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='model-card-claude-opus-4-5-20251101']"))
                )
                claude_card.click()
                log_event("Selected Claude Opus 4.5")
                time.sleep(2)
            except Exception as e:
                log_event(f"Model selection issue: {e}")
            
            # Filter out non-BMP characters
            clean_prompt = ''.join(c for c in full_prompt if ord(c) <= 0xFFFF)
            
            # Step 3: Type message in textarea
            textarea = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "textarea"))
            )
            textarea.clear()
            textarea.send_keys(clean_prompt + " ")  # Add space to activate button
            log_event("Typed message")
            time.sleep(1)
            
            # Step 4: Wait for send button to be enabled and click it
            send_button = None
            for attempt in range(10):
                try:
                    buttons = driver.find_elements(By.CSS_SELECTOR, "button.rt-IconButton")
                    for btn in buttons:
                        try:
                            # Check if button contains paper plane SVG
                            btn.find_element(By.CSS_SELECTOR, "svg.fa-paper-plane-top")
                            
                            # Check if enabled
                            classes = btn.get_attribute("class") or ""
                            is_disabled = btn.get_attribute("disabled")
                            data_disabled = btn.get_attribute("data-disabled")
                            
                            if "cursor-pointer" in classes and is_disabled is None and data_disabled != "true":
                                send_button = btn
                                break
                        except:
                            continue
                    
                    if send_button:
                        break
                except:
                    pass
                
                time.sleep(0.5)
                if attempt == 5:
                    textarea.send_keys(" ")  # Extra space if button not activating
            
            if send_button:
                send_button.click()
                log_event("Clicked send button")
            else:
                # Fallback: JavaScript click
                try:
                    btn_elem = driver.find_element(By.CSS_SELECTOR, "button.rt-IconButton svg.fa-paper-plane-top")
                    parent = btn_elem.find_element(By.XPATH, "./..")
                    driver.execute_script("arguments[0].click();", parent)
                    log_event("Clicked send button (JS fallback)")
                except:
                    log_event("Could not click send button")
            
            # Wait for response (poll until response appears or timeout)
            log_event("Waiting for AI response...")
            response = None
            for _ in range(30):  # Max 30 seconds
                time.sleep(1)
                
                # Try to find response content
                response_selectors = [
                    "[class*='response']",
                    "[class*='message']",
                    "[class*='output']",
                    "[class*='answer']",
                    "[class*='assistant']",
                    "pre",
                    "code"
                ]
                
                for sel in response_selectors:
                    try:
                        elements = driver.find_elements(By.CSS_SELECTOR, sel)
                        for el in reversed(elements):
                            text = el.text.strip()
                            if text and len(text) > 10 and "{" in text:
                                response = text
                                break
                        if response:
                            break
                    except:
                        continue
                
                if response:
                    break
                    
            if not response:
                # Fallback: get any div with JSON-like content
                all_text = driver.execute_script("return document.body.innerText;")
                import re
                json_match = re.search(r'\{[^{}]*"action"[^{}]*\}', all_text)
                if json_match:
                    response = json_match.group(0)
            
            if not response:
                log_event("No response from Outlier AI")
                return None
                
            log_event(f"AI responded: {response[:80]}...")
            
            # Clean and extract JSON
            response = response.replace("```json", "").replace("```", "").strip()
            
            # Extract JSON if mixed with text
            if not response.startswith("{"):
                import re
                json_match = re.search(r'\{[^{}]*\}', response)
                if json_match:
                    response = json_match.group(0)
            
            return response
            
        except Exception as e:
            log_event(f"Brain Browser Error: {e}")
            return None

    def run_loop(self):
        log_event("Orchestrator Active. Waiting for command...")
        
        # Pre-initialize brain to check for API key
        self.setup_brain()

        while True:
            if not agent_state["active"]:
                time.sleep(1)
                continue

            # Process Tasks
            for filename in os.listdir(AGENTS_DIR):
                if filename.endswith("_input.txt"):
                    file_path = os.path.join(AGENTS_DIR, filename)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read().strip()
                        
                        if content:
                            agent_id = filename.replace("_input.txt", "")
                            agent_state["current_task"] = content
                            log_event(f"Processing Task: {content[:50]}...")

                            if "browse" in content.lower() or "apply" in content.lower() or "job" in content.lower():
                                # === SURFING MODE ===
                                self.setup_body()
                                agent_state["status"] = "Surfing"
                                
                                max_steps = 20  # Safety limit
                                step = 0
                                
                                while agent_state["active"] and step < max_steps:
                                    step += 1
                                    log_event(f"Step {step}/{max_steps}: Observing...")
                                    
                                    # 1. Observe
                                    observation = self.surfer.capture_state()
                                    agent_state["latest_screenshot"] = observation["screenshot"]
                                    
                                    # 2. Orient - Ask AI what to do
                                    plan = self.ask_ai(content, context=observation)
                                    
                                    # 3. Act
                                    if not plan:
                                        log_event("No plan from AI. Stopping.")
                                        break
                                        
                                    log_event(f"AI Plan: {plan[:80]}...")
                                    
                                    try:
                                        action_data = json.loads(plan)
                                        
                                        # Check for done action
                                        action_type = action_data.get("action") or action_data.get("type")
                                        if action_type == "done":
                                            log_event(f"Task complete: {action_data.get('reason', 'No reason given')}")
                                            break
                                        
                                        # Normalize keys for execute_action
                                        if "action" in action_data:
                                            action_data["type"] = action_data["action"]
                                        
                                        success = self.surfer.execute_action(action_data)
                                        if not success:
                                            log_event("Action failed. Continuing anyway...")
                                        
                                        time.sleep(2)  # Wait for page to update
                                        
                                    except json.JSONDecodeError as e:
                                        log_event(f"Failed to parse AI Plan as JSON: {e}")
                                        break
                                
                                if step >= max_steps:
                                    log_event(f"Reached max steps ({max_steps}). Stopping.")
                                
                                with open(os.path.join(AGENTS_DIR, f"{agent_id}_output.txt"), 'w') as f:
                                    f.write(f"Completed {step} steps.\nLast AI Plan: {plan if plan else 'None'}")
                                    
                            else:
                                # === CODING MODE ===
                                self.setup_brain()
                                response = self.ask_ai(content)
                                if response:
                                    FilePatcher.apply_xml_changes(response, root_dir=ROOT_DIR)
                                    with open(os.path.join(AGENTS_DIR, f"{agent_id}_output.txt"), 'w') as f:
                                        f.write(response)

                            # Clear input
                            with open(file_path, 'w') as f: f.write("")
                            agent_state["status"] = "Idle"
                                
                    except Exception as e:
                        log_event(f"Error: {e}")

            time.sleep(2)

if __name__ == "__main__":
    api_thread = threading.Thread(target=run_api, daemon=True)
    api_thread.start()
    
    orchestrator = AgentOrchestrator()
    try:
        orchestrator.run_loop()
    except KeyboardInterrupt:
        if orchestrator.brain_driver: orchestrator.brain_driver.quit()
        if orchestrator.surfer: orchestrator.surfer.close()
