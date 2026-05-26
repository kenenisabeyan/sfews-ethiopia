from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from sqlalchemy import text
from . import database
from .database import engine, Base
from .routers import telemetry, dashboard, nodes, system, ws, chat, auth

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
app.include_router(nodes.router)
app.include_router(system.router)
app.include_router(ws.router)
app.include_router(chat.router)
from pydantic import BaseModel

class FloodPayload(BaseModel):
    level: int

# SFEWS Core Simulation Global State
global_water_level: int = 0

@app.post("/flood")
async def update_flood_level(payload: FloodPayload):
    global global_water_level
    global_water_level = payload.level
    print(f"[SFEWS CORE SIMULATOR] Ingested telemetry water level: {global_water_level}")
    return {"status": "success", "level": global_water_level}

@app.get("/flood")
async def get_flood_level():
    global global_water_level
    return {"level": global_water_level}

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
        "server_time": datetime.now(timezone.utc).isoformat()
    }
