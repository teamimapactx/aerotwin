@echo off
start "AeroTwin Backend" cmd /k "cd /d %~dp0backend && py -m pip install -r requirements.txt && py -m uvicorn backend:app --reload --port 8000"
timeout /t 3 >nul
start "AeroTwin Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"
echo.
echo AeroTwin is starting.
echo Backend: http://localhost:8000/docs
 echo Frontend: http://localhost:3000
pause
