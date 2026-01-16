# Xapply

**Xapply** is an AI-powered job application assistant designed to streamline the job hunt. It features an intelligent "SmartCV Tailor" to customize resumes for specific job descriptions and a "Live Agent" capable of autonomous web navigation for job searching.

## Features

-   **SmartCV Tailor**: customize your CV for specific job descriptions using Gemini AI.
-   **Live Agent**: Autonomous browser agent to search and apply for jobs (experimental).
-   **Dashboard**: Track application history and success rates.
-   **Clean Print**: Export professional, A4-formatted PDFs of your tailored resumes.

## Prerequisites

-   **Node.js** (v16+)
-   **Python** (v3.9+)
-   **Gemini API Key** (for AI features)

## Setup

The project is divided into a Python backend and a React/Vite frontend.

### 1. Backend Setup

Navigate to the `backend` directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the orchestrator:

```bash
python orchestrator.py
```

The backend server will start (defaulting to port 5000).

### 2. Frontend Setup

Open a new terminal and navigate to the `frontend` directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to the URL shown (usually `http://localhost:5173`).

## Usage

1.  **Tailor CV**: Go to "SmartCV Tailor", upload your existing resume (or use the default), paste a job description, and click "Tailor Resume".
2.  **Export**: Click "Save as PDF" to generate a clean, print-ready version of your CV.
3.  **Live Agent**: Use the "Live Agent" tab to give commands to the autonomous browser (requires backend running).

## License

[MIT](LICENSE)

## Troubleshooting & Architecture

### Browser Profile Management
The backend uses persistent Chrome profiles (`backend/data/profiles/`) to save login sessions. 
- **Auto-Healing**: To prevent hanging issues when switching devices or user accounts, the system automatically checks the profile's signature (`hostname` + `user`). If a mismatch is detected, the profile is safely reset.
- **Manual Reset**: You can force a profile reset by setting the `FRESH_BROWSER=true` environment variable before running the orchestrator.

### Robust Browser Input
To handle emojis and special characters (non-BMP characters) that can crash ChromeDriver, the agent uses direct JavaScript injection (`execute_script`) instead of standard keyboard simulation (`send_keys`). This ensures reliable text entry for all AI-generated content.
