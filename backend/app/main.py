from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from . import database
from .database import engine, Base
from .routers import telemetry, dashboard

# Automatically create all tables in PostgreSQL
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not create tables automatically. Make sure PostgreSQL is running. Error: {e}")

app = FastAPI(title="SFEWS Command Center API - Global Edition")

# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(telemetry.router)
app.include_router(dashboard.router)

from sqlalchemy import text
from datetime import datetime

@app.get("/")
def health_check(db = Depends(database.get_db)):
    try:
        # Simple query to check db connection
        db.execute(text("SELECT 1"))
        db_status = "Active"
    except Exception:
        db_status = "Inactive"
        
    return {
        "status": "Operational",
        "api_version": "2.0.0",
        "database_connection": db_status,
        "server_time": datetime.utcnow().isoformat()
    }
