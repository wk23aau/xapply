# Xapply Backend: The Agent Horde

This directory contains the intelligence and automation logic for Xapply. It uses a unique "Brain/Body" architecture to separate high-level reasoning from low-level browser interactions.

## Components

### 1. Orchestrator (`orchestrator.py`)
The central nervous system. It runs an infinite loop monitoring the `agents/` directory for tasks.
*   **Brain Mode**: Connects to an LLM (e.g., Gemini via AI Studio) to generate code or make decisions.
*   **Body Mode**: Dispatches commands to the `JobSurfer` to interact with real websites.

### 2. Job Surfer (`surfer.py`)
The "Body" of the agent.
*   Uses `undetected-chromedriver` to bypass bot detection.
*   **Capabilities**:
    *   `navigate(url)`: Browse to job boards.
    *   `capture_state()`: returns a screenshot (Base64) and simplified DOM text.
    *   `execute_action(json)`: Clicks, types, or scrolls based on AI commands.

### 3. Database (`database.py`)
A lightweight, file-based memory system.
*   Stores data in `xapply/backend/data/`.
*   `users.json`: Stores your resume, skills, and preferences.
*   `jobs.json`: Tracks scouted listings and application status.

## Installation

```bash
pip install -r requirements.txt
```

## Running the Agent

```bash
python orchestrator.py
```

1.  **Login Phase**: The script will open a browser for the AI. Log in to your account.
2.  **Surfing Phase**: When a task is detected (e.g., "Find React jobs"), it opens a second browser to perform the search.

## Agent Communication
To manually trigger the agent, create a file in `agents/`:

**File**: `agents/a1_frontend_input.txt`
**Content**:
```text
Browse LinkedIn for "Python Developer" jobs in "Remote" location.
```

The Orchestrator will pick this up, browse the site, and write the results to `a1_frontend_output.txt`.
