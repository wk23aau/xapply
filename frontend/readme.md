# Xapply Frontend

The Control Center for your autonomous job search agent. Built with React 19, TailwindCSS, and Lucide Icons.

## Features

*   **Dashboard**: Overview of application success rates and active campaigns.
*   **Live Agent View**: Real-time visualization of the Python agent's browser session (simulated connection via file watching/API).
    *   View browser screenshots.
    *   Read the "Neural Engine" logs (agent's thought process).
    *   Start/Stop the autonomous loop.
*   **Job Search**: Manual search interface that populates the shared JSON database.
*   **Settings**: Configure keywords and auto-apply rules.

## Development

```bash
npm install
npm run dev
```

## Connection to Backend

The frontend currently uses a loosely coupled architecture. For full integration:
1.  The Python backend updates `jobs.json` and agent output files.
2.  The Frontend can be configured to poll these files or connect via a future WebSocket bridge to display real-time status.
