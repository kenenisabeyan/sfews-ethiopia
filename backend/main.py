import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "sfews")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

db_pool: Optional[SimpleConnectionPool] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    try:
        db_pool = SimpleConnectionPool(
            minconn=1,
            maxconn=20,
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        if db_pool:
            logger.info("Production PostgreSQL connection pool established.")
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL pool: {e}")
        
    yield
    
    if db_pool:
        db_pool.closeall()
        logger.info("PostgreSQL connection pool safely closed.")

app = FastAPI(title="SFEWS Command Center API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    if db_pool is None:
        raise HTTPException(status_code=500, detail="Database connection pool unavailable.")
    conn = db_pool.getconn()
    try:
        yield conn
    finally:
        db_pool.putconn(conn)

class TelemetryData(BaseModel):
    node_id: str = Field(..., description="The empirical ID of the sensor station")
    water_level_cm: float = Field(..., description="Current water elevation in cm")
    rainfall_rate_mm: float = Field(..., description="Precipitation rate in mm/hr")
    battery_level: float = Field(..., description="Battery percentage (0-100)")

def predictive_flood_model(water_level_cm: float, rainfall_rate_mm: float) -> float:
    """
    CSE Team's Machine Learning Predictive Pipeline Placeholder.
    Mocks an LSTM/Random Forest algorithm outputting a flood probability [0.0 - 1.0].
    """
    # Normalize inputs for empirical thresholding
    normalized_water = min(water_level_cm / 500.0, 1.0)
    normalized_rain = min(rainfall_rate_mm / 100.0, 1.0)
    
    # Weighted ensemble simulation (60% water depth, 40% rain intensity)
    probability = (normalized_water * 0.6) + (normalized_rain * 0.4)
    
    # Non-linear activation to simulate rapid flooding escalation
    if probability > 0.6:
        probability += 0.15 
        
    return min(max(probability, 0.0), 1.0)

def evaluate_risk_tier(probability: float) -> str:
    if probability >= 0.75:
        return "Critical"
    elif probability >= 0.45:
        return "Warning"
    else:
        return "Safe"

@app.get("/")
def system_health_check(conn = Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT NOW();")
            db_time = cur.fetchone()[0]
        return {
            "status": "Operational",
            "api_version": "1.0.0",
            "database_connection": "Active",
            "server_time": db_time.isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Database handshake failed.")

@app.post("/api/v1/telemetry")
def ingest_telemetry(payload: TelemetryData, conn = Depends(get_db)):
    # 1. Compute ML probability
    probability = predictive_flood_model(payload.water_level_cm, payload.rainfall_rate_mm)
    
    # 2. Assign Tier
    risk_level = evaluate_risk_tier(probability)
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 3. Upsert sensor node to auto-register it
            cur.execute("""
                INSERT INTO sensor_nodes (id, name, latitude, longitude, status, battery_level, last_updated)
                VALUES (%s, %s, 9.0, 40.0, 'Active', %s, NOW())
                ON CONFLICT (id) DO UPDATE 
                SET battery_level = EXCLUDED.battery_level, 
                    status = EXCLUDED.status, 
                    last_updated = NOW()
                RETURNING id;
            """, (payload.node_id, f"Station {payload.node_id}", payload.battery_level))
            
            if not cur.fetchone():
                conn.rollback()
                raise HTTPException(status_code=500, detail=f"Sensor node {payload.node_id} registration failed.")
            
            # 4. Insert telemetry to hydro_logs
            cur.execute("""
                INSERT INTO hydro_logs 
                (node_id, water_level_cm, rainfall_rate_mm, flood_probability, risk_level, timestamp)
                VALUES (%s, %s, %s, %s, %s, NOW())
                RETURNING log_id, node_id, water_level_cm, rainfall_rate_mm, flood_probability, risk_level, timestamp;
            """, (
                payload.node_id,
                payload.water_level_cm,
                payload.rainfall_rate_mm,
                probability,
                risk_level
            ))
            
            inserted_log = cur.fetchone()
            conn.commit()
            return inserted_log
            
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Ingestion pipeline failure: {e}")
        raise HTTPException(status_code=500, detail="Internal ingestion server error.")

@app.get("/api/v1/dashboard")
def build_dashboard_payload(conn = Depends(get_db)):
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Fetch all nodes and join their LATEST log for realtime metrics
            cur.execute("""
                SELECT 
                    n.id as id, 
                    n.name as name, 
                    n.latitude, 
                    n.longitude, 
                    n.status, 
                    n.battery_level as "batteryLevel",
                    COALESCE(l.water_level_cm, 0) as "waterLevelCm",
                    COALESCE(l.rainfall_rate_mm, 0) as "rainfallRateMm",
                    COALESCE(l.risk_level, 'Safe') as "currentRisk"
                FROM sensor_nodes n
                LEFT JOIN LATERAL (
                    SELECT water_level_cm, rainfall_rate_mm, risk_level
                    FROM hydro_logs
                    WHERE node_id = n.id
                    ORDER BY timestamp DESC
                    LIMIT 1
                ) l ON true
                ORDER BY n.id ASC;
            """)
            nodes = cur.fetchall()
            
            # Fetch historical trends (last 24 logs total across the basin for the graph)
            cur.execute("""
                SELECT 
                    log_id as "logId", 
                    node_id as "nodeId", 
                    water_level_cm as "waterLevelCm", 
                    rainfall_rate_mm as "rainfallRateMm", 
                    flood_probability as "floodProbability", 
                    risk_level as "riskLevel", 
                    timestamp
                FROM hydro_logs
                ORDER BY timestamp DESC
                LIMIT 24;
            """)
            history = cur.fetchall()
            
            # Aggregate stats
            total_nodes = len(nodes)
            active_alerts = sum(1 for n in nodes if n["currentRisk"] in ["Warning", "Critical"])
            
            return {
                "summary": {
                    "totalNodes": total_nodes,
                    "activeAlerts": active_alerts,
                    "systemHealthStatus": "Operational"
                },
                "nodes": nodes,
                "history": history
            }
    except Exception as e:
        logger.error(f"Dashboard aggregation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to construct dashboard payload.")
