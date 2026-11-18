import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text

from .database import engine, Base, SessionLocal, check_db_health, get_db
from .services.seed_service import seed_database_defaults
from .core.middleware import RequestTracingMiddleware
from .core.errors import (
    http_exception_handler,
    validation_exception_handler,
    global_exception_handler
)
from .routers import (
    auth,
    telemetry,
    nodes,
    alerts,
    dashboard,
    system,
    simulation,
    chat,
    ws
)

# Configure unified application logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("sfews.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle management:
    - Verifies database schema tables
    - Idempotently populates default hydrological anchors and credentials
    - Pre-warms cache and initializes event subscribers
    """
    logger.info("Starting SFEWS Command Center API Engine...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database schemas and relational tables verified successfully.")
        
        # Seed default data on startup
        db = SessionLocal()
        try:
            seed_database_defaults(db)
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error during database startup initialization: {e}")

    yield

    logger.info("Shutting down SFEWS Command Center API Engine cleanly...")

app = FastAPI(
    title="SFEWS Early Warning System API",
    description="Advanced Autonomous Flood Early Warning & Situational Command Center API for the Awash River Basin, Ethiopia.",
    version="2.1.0",
    lifespan=lifespan
)

# 1. Tracing, Observability & Security Middleware
app.add_middleware(RequestTracingMiddleware)

# 2. Cross-Origin Resource Sharing (CORS) Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time-Ms"]
)

# 3. Global Standardized Error Envelopes
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# 4. Register Decoupled Domain Routers
app.include_router(auth.router)
app.include_router(telemetry.router)
app.include_router(nodes.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(system.router)
app.include_router(simulation.router)
app.include_router(chat.router)
app.include_router(ws.router)

# 5. Root Health Check & Readiness Endpoint
@app.get("/", tags=["Health & Status"])
def health_check(db = Depends(get_db)):
    db_health = check_db_health()
    return {
        "status": "Operational",
        "service": "SFEWS Command Center Platform",
        "api_version": "2.1.0",
        "database_connection": db_health["status"],
        "database_driver": db_health.get("driver", "Unknown"),
        "server_time": datetime.now(timezone.utc).isoformat(),
        "registered_domains": [
            "auth", "telemetry", "nodes", "alerts", "dashboard", "system", "simulation", "chat", "ws"
        ]
    }
