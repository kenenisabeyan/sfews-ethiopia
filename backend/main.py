import os
import logging
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "sfews")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

db_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    try:
        db_pool = SimpleConnectionPool(
            1, 20,
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        if db_pool:
            logger.info("Database connection pool created successfully")
    except Exception as e:
        logger.error(f"Error creating database connection pool: {e}")
        # Not raising here strictly to allow the app to boot for debugging, 
        # but in strict production, raising is preferred.
    
    yield
    
    if db_pool:
        db_pool.closeall()
        logger.info("Database connection pool closed")

app = FastAPI(title="SFEWS API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    if db_pool is None:
        raise HTTPException(status_code=500, detail="Database pool not initialized")
    try:
        conn = db_pool.getconn()
        yield conn
    finally:
        db_pool.putconn(conn)

class TelemetryPayload(BaseModel):
    node_id: str
    water_level_cm: float
    rainfall_rate_mm: float
    battery_level: float

def compute_flood_probability(water_level_cm: float, rainfall_rate_mm: float) -> float:
    """
    CSE Department Machine Learning Placeholder
    Pass readings into LSTM/Random Forest models here.
    """
    # Mock computation for demonstration
    base_prob = (water_level_cm / 500.0) * 0.6 + (rainfall_rate_mm / 100.0) * 0.4
    return min(max(base_prob, 0.0), 1.0)

def classify_status(flood_probability: float) -> str:
    if flood_probability >= 0.75:
        return "Critical"
    elif flood_probability >= 0.40:
        return "Warning"
    else:
        return "Safe"

@app.get("/")
def health_check(conn = Depends(get_db_connection)):
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT NOW();")
            db_time = cur.fetchone()[0]
        return {
            "status": "online",
            "api": "FastAPI is running",
            "database": "Connected",
            "db_time": db_time.isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Database health check failed")

@app.post("/api/v1/telemetry")
def receive_telemetry(payload: TelemetryPayload, conn = Depends(get_db_connection)):
    flood_probability = compute_flood_probability(
        water_level_cm=payload.water_level_cm,
        rainfall_rate_mm=payload.rainfall_rate_mm
    )
    status = classify_status(flood_probability)
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Upsert sensor node if it doesn't exist, or update its meta-states
            cur.execute("""
                INSERT INTO sensor_nodes (id, name, latitude, longitude, status, battery_level)
                VALUES (%s, %s, 0.0, 0.0, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    status = EXCLUDED.status,
                    battery_level = EXCLUDED.battery_level,
                    last_updated = NOW();
            """, (payload.node_id, f"Node {payload.node_id}", status, payload.battery_level))
            
            # Insert hydro log
            cur.execute("""
                INSERT INTO hydro_logs (node_id, water_level_cm, rainfall_rate_mm, flood_probability, risk_level, timestamp)
                VALUES (%s, %s, %s, %s, %s, NOW())
                RETURNING log_id, node_id, water_level_cm, rainfall_rate_mm, flood_probability, risk_level, timestamp;
            """, (
                payload.node_id, 
                payload.water_level_cm, 
                payload.rainfall_rate_mm, 
                flood_probability, 
                status
            ))
            
            inserted_log = cur.fetchone()
            conn.commit()
            
            return inserted_log
    except Exception as e:
        conn.rollback()
        logger.error(f"Error processing telemetry: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/dashboard")
def get_dashboard_data(conn = Depends(get_db_connection)):
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, latitude, longitude, status, battery_level
                FROM sensor_nodes;
            """)
            nodes = cur.fetchall()
            
            cur.execute("""
                SELECT log_id, node_id, water_level_cm, rainfall_rate_mm, flood_probability, risk_level, timestamp
                FROM hydro_logs
                ORDER BY timestamp DESC
                LIMIT 24;
            """)
            logs = cur.fetchall()
            
            return {
                "nodes": nodes,
                "history": logs
            }
    except Exception as e:
        logger.error(f"Error fetching dashboard data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
