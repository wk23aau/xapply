@echo off
echo [*] Starting Backend with FRESH_BROWSER=true
echo [*] This will clear the 'brain' and 'surfer' browser profiles to fix hanging issues.
set FRESH_BROWSER=true
python backend/orchestrator.py
pause
