Write-Host "Setting up Smart Flood Early Warning System (SFEWS)..." -ForegroundColor Cyan

# 1. Setup Backend
Write-Host "`n[1/3] Setting up Backend Python Environment..." -ForegroundColor Yellow
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..

# 2. Setup Frontend
Write-Host "`n[2/3] Installing Frontend Dependencies..." -ForegroundColor Yellow
cd frontend
pnpm install
cd ..

# 3. Reminder about Database
Write-Host "`n[3/3] PostgreSQL Database Setup Reminder..." -ForegroundColor Yellow
Write-Host "Please ensure you have PostgreSQL installed and running."
Write-Host "1. Create a database named 'sfews'."
Write-Host "2. Run the SQL schema found in database\schema.sql against your 'sfews' database."
Write-Host "3. Create a '.env' file in the backend directory with your credentials:"
Write-Host "   DB_HOST=localhost"
Write-Host "   DB_PORT=5432"
Write-Host "   DB_NAME=sfews"
Write-Host "   DB_USER=postgres"
Write-Host "   DB_PASSWORD=your_password_here"

Write-Host "`nSetup Complete!" -ForegroundColor Green
Write-Host "--------------------------------------------------------"
Write-Host "To start the application, open 3 separate terminals:"
Write-Host "Terminal 1 (Backend):   cd backend; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload"
Write-Host "Terminal 2 (Frontend):  cd frontend; pnpm dev"
Write-Host "Terminal 3 (Simulator): cd backend; .\venv\Scripts\Activate.ps1; cd ..\simulator; python run_simulation.py"
Write-Host "--------------------------------------------------------"
