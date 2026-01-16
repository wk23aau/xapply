import sqlite3
import json
import os
import time

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DB_DIR, "xapply.db")

class Database:
    def __init__(self):
        os.makedirs(DB_DIR, exist_ok=True)
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self):
        """Creates tables if they don't exist."""
        cursor = self.conn.cursor()
        
        # Users table - stores profile as JSON blob for flexibility
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_json TEXT NOT NULL,
                has_onboarded INTEGER DEFAULT 0,
                created_at REAL,
                updated_at REAL
            )
        """)
        
        # Jobs table - stores job history
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT,
                title TEXT,
                company TEXT,
                location TEXT,
                status TEXT DEFAULT 'scouted',
                scouted_at REAL,
                applied_at REAL
            )
        """)
        
        self.conn.commit()
        
        # Ensure at least one user row exists (default profile)
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            default_profile = {
                "personalInfo": {
                    "name": "",
                    "title": "",
                    "address": "",
                    "phone": "",
                    "email": ""
                },
                "summary": "",
                "skills": [],
                "experience": [],
                "education": []
            }
            cursor.execute(
                "INSERT INTO users (profile_json, has_onboarded, created_at, updated_at) VALUES (?, 0, ?, ?)",
                (json.dumps(default_profile), time.time(), time.time())
            )
            self.conn.commit()

    # ========================
    # Profile Methods
    # ========================
    def get_profile(self):
        """Returns the user's profile as a dictionary."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT profile_json FROM users WHERE id = 1")
        row = cursor.fetchone()
        if row:
            return json.loads(row["profile_json"])
        return {}

    def save_profile(self, profile_data: dict):
        """Saves the user's profile."""
        cursor = self.conn.cursor()
        cursor.execute(
            "UPDATE users SET profile_json = ?, updated_at = ? WHERE id = 1",
            (json.dumps(profile_data), time.time())
        )
        self.conn.commit()

    def has_onboarded(self) -> bool:
        """Checks if the user has completed onboarding."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT has_onboarded FROM users WHERE id = 1")
        row = cursor.fetchone()
        return bool(row["has_onboarded"]) if row else False

    def set_onboarded(self, status: bool = True):
        """Marks onboarding as complete."""
        cursor = self.conn.cursor()
        cursor.execute(
            "UPDATE users SET has_onboarded = ?, updated_at = ? WHERE id = 1",
            (1 if status else 0, time.time())
        )
        self.conn.commit()

    # ========================
    # Jobs Methods
    # ========================
    def get_jobs(self, status: str = None):
        """Returns jobs, optionally filtered by status."""
        cursor = self.conn.cursor()
        if status:
            cursor.execute("SELECT * FROM jobs WHERE status = ? ORDER BY scouted_at DESC", (status,))
        else:
            cursor.execute("SELECT * FROM jobs ORDER BY scouted_at DESC")
        return [dict(row) for row in cursor.fetchall()]

    def add_job(self, job_data: dict):
        """Adds a new job to the database."""
        cursor = self.conn.cursor()
        cursor.execute(
            """INSERT INTO jobs (url, title, company, location, status, scouted_at)
               VALUES (?, ?, ?, ?, 'scouted', ?)""",
            (
                job_data.get("url", ""),
                job_data.get("title", ""),
                job_data.get("company", ""),
                job_data.get("location", ""),
                time.time()
            )
        )
        self.conn.commit()
        return cursor.lastrowid

    def mark_applied(self, job_url: str):
        """Marks a job as applied."""
        cursor = self.conn.cursor()
        cursor.execute(
            "UPDATE jobs SET status = 'applied', applied_at = ? WHERE url = ?",
            (time.time(), job_url)
        )
        self.conn.commit()

    def close(self):
        """Closes the database connection."""
        self.conn.close()
