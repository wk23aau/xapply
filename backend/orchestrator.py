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
        with open(db.jobs_file, 'r') as f:
            data = json.load(f)
        return jsonify(data)
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
            # Save to users.json (full overwrite for now)
            with open(db.users_file, 'w') as f:
                json.dump({"profile": new_data}, f, indent=2)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/upload_resume', methods=['POST'])
def upload_resume():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    try:
        # Save temp file
        db = Database()
        temp_path = os.path.join(os.path.dirname(db.users_file), f"temp_{file.filename}")
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
        with open(db.users_file, 'w') as f:
            json.dump({"profile": resume_data}, f, indent=2)
            
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
        """Initializes the AI Interface (Brain)."""
        # Try API First
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                genai.configure(api_key=api_key)
                self.brain_model = genai.GenerativeModel('gemini-2.5-flash')
                self.brain_mode = "api"
                log_event("Brain connected via Gemini API (Headless Mode).")
                return
            except Exception as e:
                log_event(f"API Connection failed: {e}. Falling back to Browser.")

        # Fallback to Browser
        if self.brain_driver: return
        log_event("Launching Browser Brain (Requires Manual Login)...")
        
        # Use persistent profile to save login sessions
        brain_profile_dir = os.path.join(PROFILE_DIR, "brain")
        os.makedirs(brain_profile_dir, exist_ok=True)
        
        options = uc.ChromeOptions()
        options.add_argument(f"--user-data-dir={brain_profile_dir}")
        self.brain_driver = uc.Chrome(options=options)
        self.brain_driver.get("https://aistudio.google.com/app/prompts/new_chat") 
        log_event("Brain Browser Ready.")

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
            full_prompt += f"\n\nCURRENT BROWSER STATE:\nURL: {context['url']}\nTEXT: {context['text_content']}\n"
            full_prompt += "\nINSTRUCTION: You are a browsing agent. Return a JSON object with the next action. Format: { \"action\": \"click\", \"selector\": \"...\" } or { \"action\": \"type\", \"selector\": \"...\", \"value\": \"...\" }"

        # --- API MODE ---
        if self.brain_mode == "api":
            try:
                log_event("Consulting AI Brain (API)...")
                response = self.brain_model.generate_content(full_prompt)
                log_event("AI Brain responded.")
                # Clean markdown code blocks if present
                text = response.text.replace("```json", "").replace("```", "").strip()
                return text
            except Exception as e:
                log_event(f"Brain API Error: {e}")
                return None

        # --- BROWSER MODE ---
        driver = self.brain_driver
        try:
            log_event("Consulting AI Brain (Browser)...")
            text_area = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "textarea"))
            )
            # Clear and paste (using script for speed/reliability)
            driver.execute_script("arguments[0].value = '';", text_area)
            text_area.send_keys(full_prompt)
            time.sleep(1)
            
            # Find run button (can vary based on UI updates)
            send_btns = driver.find_elements(By.XPATH, "//button[contains(@aria-label, 'Run') or contains(@aria-label, 'Send')]")
            if send_btns:
                send_btns[-1].click()
            else:
                log_event("Could not find Send button in Brain UI.")
                return None

            # Wait longer for AI response
            time.sleep(10) 
            
            # Try multiple selectors for Google AI Studio response
            response = None
            selectors_to_try = [
                ".response-content",
                ".model-response-text",
                "[data-text-content]",
                ".message-content",
                "ms-chat-turn .text-content",
                ".markdown-content",
                "div[class*='response']",
                "div[class*='output']"
            ]
            
            for selector in selectors_to_try:
                try:
                    response_elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    if response_elements:
                        response = response_elements[-1].text
                        if response and len(response) > 10:
                            log_event(f"Found response via: {selector}")
                            break
                except:
                    continue
            
            # Fallback: try to get any large text block in the page
            if not response or len(response) < 10:
                try:
                    # Get all text divs and find the likely response
                    all_divs = driver.find_elements(By.XPATH, "//div[string-length(text()) > 50]")
                    for div in reversed(all_divs):
                        text = div.text
                        if "{" in text and "}" in text:  # Likely JSON
                            response = text
                            log_event("Found JSON-like response in page content")
                            break
                except:
                    pass
            
            if not response:
                response = "No response"
                
            log_event("AI Brain responded.")
            log_event(f"Response preview: {response[:100]}...")
            
            # Clean markdown code blocks
            response = response.replace("```json", "").replace("```", "").strip()
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
                                
                                # 1. Observe
                                log_event("Capturing browser state...")
                                observation = self.surfer.capture_state()
                                agent_state["latest_screenshot"] = observation["screenshot"]
                                
                                # 2. Orient
                                plan = self.ask_ai(content, context=observation)
                                
                                # 3. Act
                                if plan:
                                    log_event(f"Executing Plan: {plan[:50]}...")
                                    try:
                                        action_data = json.loads(plan)
                                        # Normalize keys
                                        if "action" in action_data:
                                            action_data["type"] = action_data["action"]
                                        self.surfer.execute_action(action_data)
                                    except json.JSONDecodeError:
                                        log_event("Failed to parse AI Plan as JSON.")
                                    
                                with open(os.path.join(AGENTS_DIR, f"{agent_id}_output.txt"), 'w') as f:
                                    f.write(f"BROWSER STATE CAPTURED.\nAI PLAN: {plan}")
                                    
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
