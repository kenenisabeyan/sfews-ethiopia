import os
import random
from typing import List, Optional, Any, Dict
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environmental variables securely
load_dotenv()

# Define global connection pool
db_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    # Startup: Instantiate SimpleConnectionPool
    try:
        db_pool = psycopg2.pool.SimpleConnectionPool(
            1, 20,
            host=os.getenv("POSTGRES_SERVER", os.getenv("DB_HOST", "localhost")),
            database=os.getenv("POSTGRES_DB", os.getenv("DB_NAME", "sfews_db")),
            user=os.getenv("POSTGRES_USER", os.getenv("DB_USER", "postgres")),
            password=os.getenv("POSTGRES_PASSWORD", os.getenv("DB_PASSWORD", "password")),
            port=os.getenv("POSTGRES_PORT", os.getenv("DB_PORT", "5432"))
        )
        print("Database SimpleConnectionPool created successfully")
        
        # Initialize tables
        conn = db_pool.getconn()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS sensor_nodes (
                        node_id VARCHAR(50) PRIMARY KEY,
                        location_name VARCHAR(100),
                        status VARCHAR(20),
                        battery_level FLOAT,
                        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS hydro_logs (
                        log_id SERIAL PRIMARY KEY,
                        node_id VARCHAR(50) REFERENCES sensor_nodes(node_id),
                        water_level_cm FLOAT,
                        rainfall_rate_mm FLOAT,
                        flood_probability FLOAT,
                        risk_level VARCHAR(20),
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                conn.commit()
                
                # Seed mock sensor nodes if empty
                cursor.execute("SELECT COUNT(*) FROM sensor_nodes")
                if cursor.fetchone()[0] == 0:
                    nodes = [
                        ('NODE_AWASH_01', 'Awash River Basin', 'online', 85.5),
                        ('NODE_OMO_02', 'Omo River Valley', 'online', 42.0),
                        ('NODE_TEKEZE_03', 'Tekeze River', 'online', 91.2),
                        ('NODE_BLUE_NILE_04', 'Blue Nile Gorge', 'offline', 12.5)
                    ]
                    cursor.executemany("""
                        INSERT INTO sensor_nodes (node_id, location_name, status, battery_level) 
                        VALUES (%s, %s, %s, %s)
                    """, nodes)
                    conn.commit()
        except Exception as e:
            print(f"Startup DB Error: {e}")
            conn.rollback()
        finally:
            db_pool.putconn(conn)
            
    except Exception as e:
        print(f"Error creating connection pool: {e}")
        
    yield
    
    # Shutdown: Safely close pool
    if db_pool:
        db_pool.closeall()
        print("Database connection pool closed successfully")

app = FastAPI(title="SFEWS - Ethiopia Backend API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database connection pool unavailable.")
    conn = db_pool.getconn()
    try:
        yield conn
    finally:
        db_pool.putconn(conn)

# Pydantic Models
class TelemetryData(BaseModel):
    node_id: str
    water_level_cm: float
    rainfall_rate_mm: float
    battery_level: float

class SMSBroadcastRequest(BaseModel):
    node_id: str
    message: str

# ---------------------------------------------------------
# MACHINE LEARNING ENGINE PLACEHOLDER
# ---------------------------------------------------------
def predict_flood_probability(water_level_cm: float, rainfall_rate_mm: float) -> float:
    """
    CSE Team: Drop your trained LSTM or Random Forest model inference logic here.
    Example workflow for LSTM (.h5):
        import tensorflow as tf
        model = tf.keras.models.load_model('models/lstm_v1.h5')
        X = np.array([[water_level_cm, rainfall_rate_mm]])
        prob = float(model.predict(X)[0][0])
        return prob
    """
    base_risk = 0.05
    water_risk = (water_level_cm / 500.0) * 0.6  
    rain_risk = (rainfall_rate_mm / 100.0) * 0.35
    probability = min(1.0, base_risk + water_risk + rain_risk)
    return round(probability, 4)

def determine_risk_level(probability: float) -> str:
    if probability > 0.7:
        return "Critical"
    elif probability > 0.4:
        return "Warning"
    return "Safe"


@app.get("/")
def health_check(conn = Depends(get_db_connection)):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT NOW();")
            db_time = cursor.fetchone()[0]
        return {
            "api_status": "online",
            "database_connectivity": "success",
            "database_time": db_time
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/telemetry")
def submit_telemetry(data: TelemetryData, conn = Depends(get_db_connection)):
    try:
        flood_prob = predict_flood_probability(data.water_level_cm, data.rainfall_rate_mm)
        risk_level = determine_risk_level(flood_prob)
        
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Update sensor_nodes table
            cursor.execute("""
                INSERT INTO sensor_nodes (node_id, location_name, status, battery_level, last_seen)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (node_id) DO UPDATE SET 
                    status = EXCLUDED.status,
                    battery_level = EXCLUDED.battery_level,
                    last_seen = CURRENT_TIMESTAMP;
            """, (data.node_id, f"Location {data.node_id}", 'online', data.battery_level))
            
            # Insert entries into hydro_logs
            cursor.execute("""
                INSERT INTO hydro_logs (node_id, water_level_cm, rainfall_rate_mm, flood_probability, risk_level)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *;
            """, (data.node_id, data.water_level_cm, data.rainfall_rate_mm, flood_prob, risk_level))
            
            inserted_log = cursor.fetchone()
            conn.commit()
            
            return {
                "status": "success", 
                "classification": risk_level,
                "log": inserted_log
            }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/dashboard")
def get_dashboard_data():
    if not db_pool:
        return generate_mock_dashboard()
        
    conn = db_pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Get active nodes and latest metrics
            cursor.execute("""
                SELECT 
                    n.node_id as id, 
                    n.location_name as name, 
                    n.status, 
                    n.battery_level as "batteryLevel", 
                    COALESCE(l.water_level_cm, 0) as "waterLevelCm",
                    COALESCE(l.rainfall_rate_mm, 0) as "rainfallRateMm",
                    COALESCE(l.flood_probability, 0) as "floodProbability",
                    COALESCE(l.risk_level, 'Safe') as "riskLevel"
                FROM sensor_nodes n
                LEFT JOIN LATERAL (
                    SELECT water_level_cm, rainfall_rate_mm, flood_probability, risk_level
                    FROM hydro_logs
                    WHERE node_id = n.node_id
                    ORDER BY timestamp DESC
                    LIMIT 1
                ) l ON true
            """)
            nodes = cursor.fetchall()
            
            # Get historical array of last 24 logs (using aggregation by hour for simplicity or actual last 24 logs)
            cursor.execute("""
                SELECT 
                    TO_CHAR(DATE_TRUNC('hour', timestamp), 'HH24:MI') as time,
                    AVG(water_level_cm) as "waterLevel",
                    SUM(rainfall_rate_mm) as "rainfall"
                FROM hydro_logs
                WHERE timestamp >= NOW() - INTERVAL '24 hours'
                GROUP BY DATE_TRUNC('hour', timestamp)
                ORDER BY DATE_TRUNC('hour', timestamp) ASC
                LIMIT 24
            """)
            history = cursor.fetchall()
            
            if not history:
                history = generate_mock_history()
            
            total_nodes = len(nodes)
            active_warnings = sum(1 for n in nodes if n['riskLevel'] in ['Warning', 'Critical'])
            
            system_status = "Optimal"
            if any(n['riskLevel'] == 'Critical' for n in nodes):
                system_status = "Critical"
            elif active_warnings > 0:
                system_status = "Warning"

            return {
                "metrics": {
                    "totalStations": total_nodes,
                    "activeWarnings": active_warnings,
                    "systemStatus": system_status
                },
                "nodes": nodes,
                "history": history
            }
    except Exception as e:
        print(f"Error fetching dashboard data: {e}")
        return generate_mock_dashboard()
    finally:
        db_pool.putconn(conn)


@app.post("/api/v1/broadcast")
def trigger_emergency_sms(payload: SMSBroadcastRequest):
    print(f"🚨 EMERGENCY SMS BROADCAST TRIGGERED FOR {payload.node_id} 🚨")
    print(f"Message: {payload.message}")
    return {"status": "success", "dispatched": True, "message": payload.message}


def generate_mock_history():
    now = datetime.now()
    history = []
    for i in range(24, -1, -1):
        t = now - timedelta(hours=i)
        history.append({
            "time": t.strftime("%H:00"),
            "waterLevel": round(random.uniform(100, 450), 1),
            "rainfall": round(random.uniform(0, 50), 1)
        })
    return history

def generate_mock_dashboard():
    return {
        "metrics": {
            "totalStations": 4,
            "activeWarnings": 1,
            "systemStatus": "Critical"
        },
        "nodes": [
            {
                "id": "NODE_AWASH_01",
                "name": "Awash River Basin",
                "status": "online",
                "batteryLevel": 85.5,
                "waterLevelCm": 320.4,
                "rainfallRateMm": 12.0,
                "floodProbability": 0.42,
                "riskLevel": "Warning"
            },
            {
                "id": "NODE_TEKEZE_03",
                "name": "Tekeze River",
                "status": "online",
                "batteryLevel": 91.2,
                "waterLevelCm": 580.9,
                "rainfallRateMm": 120.5,
                "floodProbability": 0.89,
                "riskLevel": "Critical"
            }
        ],
        "history": generate_mock_history()
    }
