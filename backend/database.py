import json
import os
import time

DB_DIR = os.path.join(os.path.dirname(__file__), "data")

class Database:
    def __init__(self):
        os.makedirs(DB_DIR, exist_ok=True)
        self.users_file = os.path.join(DB_DIR, "users.json")
        self.jobs_file = os.path.join(DB_DIR, "jobs.json")
        self._ensure_files()

    def _ensure_files(self):
        if not os.path.exists(self.users_file):
            with open(self.users_file, 'w') as f: 
                json.dump({
                    "profile": {
                        "name": "Alex Morgan",
                        "email": "alex.morgan@example.com",
                        "skills": ["React", "Python", "TypeScript", "Automation"],
                        "experience": "5 years"
                    }
                }, f, indent=2)
        
        if not os.path.exists(self.jobs_file):
            with open(self.jobs_file, 'w') as f: 
                json.dump({"scouted": [], "applied": []}, f, indent=2)

    def get_profile(self):
        with open(self.users_file, 'r') as f:
            return json.load(f).get("profile", {})

    def log_job(self, job_data):
        """Saves a found job to the database."""
        with open(self.jobs_file, 'r+') as f:
            data = json.load(f)
            job_data['scouted_at'] = time.time()
            data['scouted'].append(job_data)
            f.seek(0)
            json.dump(data, f, indent=2)
            
    def mark_applied(self, job_url):
        with open(self.jobs_file, 'r+') as f:
            data = json.load(f)
            data['applied'].append({"url": job_url, "timestamp": time.time()})
            f.seek(0)
            json.dump(data, f, indent=2)
