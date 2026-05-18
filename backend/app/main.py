import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from dotenv import load_dotenv

# Load environmental variables from a .env file
load_dotenv()

app = FastAPI(title="SFEWS - Ethiopia Backend API")

# Setup CORS so your React frontend can securely talk to your API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Test Database Connection on startup
def check_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_SERVER", os.getenv("DB_HOST", "localhost")),
            database=os.getenv("POSTGRES_DB", os.getenv("DB_NAME", "sfews_db")),
            user=os.getenv("POSTGRES_USER", os.getenv("DB_USER", "postgres")),
            password=os.getenv("POSTGRES_PASSWORD", os.getenv("DB_PASSWORD", "password")),
            port=os.getenv("POSTGRES_PORT", os.getenv("DB_PORT", "5432"))
        )
        conn.close()
        return "Connected Successfully"
    except Exception as e:
        return f"Connection Failed: {str(e)}"

@app.get("/")
def read_root():
    db_status = check_db_connection()
    return {
        "project": "Smart Flood Early Warning System (SFEWS) - Ethiopia",
        "status": "API Online",
        "database_status": db_status
    }
