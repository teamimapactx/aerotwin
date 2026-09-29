@echo off
echo =======================================================
echo AEROTWIN PRODUCTION DEPLOYMENT BUILDER
echo =======================================================
echo.

echo [1/3] Building React Frontend for Production...
cd frontend
call npm install
call npm run build
cd ..
echo.

echo [2/3] Checking Python Dependencies...
cd backend
pip install -r requirements.txt
echo.

echo [3/3] Starting Unified Server...
echo The backend is now serving the API AND the Frontend UI!
echo Please open your browser to: http://127.0.0.1:8000
echo.
python -m uvicorn backend:app --host 0.0.0.0 --port 8000
