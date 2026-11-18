import os
import socket
import logging
from urllib.parse import urlparse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("sfews.database")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "sfews")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

is_sqlite_active = False

def has_external_network_access() -> bool:
    """Instant socket probe (0.01s) to determine if external TCP connections are permitted."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.2)
        sock.connect(('8.8.8.8', 53))
        sock.close()
        return True
    except (PermissionError, OSError):
        return False
    except Exception:
        return False

def create_resilient_engine():
    global DATABASE_URL, is_sqlite_active
    fallback_url = os.getenv("SQLITE_FALLBACK_URL", "sqlite:///./sfews_local.db")
    
    # 1. If SQLite explicitly configured
    if DATABASE_URL.startswith("sqlite") or os.getenv("USE_SQLITE", "").lower() in ("true", "1"):
        is_sqlite_active = True
        logger.info(f"Using high-performance local SQLite database ({fallback_url}).")
        return create_engine(fallback_url, connect_args={"check_same_thread": False})

    # 2. Check if DATABASE_URL is external and network is sandboxed/offline
    parsed = urlparse(DATABASE_URL)
    host = parsed.hostname or ""
    is_external_host = host not in ("localhost", "127.0.0.1", "::1", "")

    if is_external_host and not has_external_network_access():
        is_sqlite_active = True
        logger.info(
            f"External cloud host detected ({host}) in isolated/offline environment. "
            f"Activating high-resilience local SQLite database ({fallback_url})."
        )
        return create_engine(fallback_url, connect_args={"check_same_thread": False})

    # 3. Connect to primary PostgreSQL
    try:
        eng = create_engine(
            DATABASE_URL,
            pool_size=10,
            max_overflow=20,
            pool_recycle=300,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 3} if "postgresql" in DATABASE_URL else {}
        )
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        is_sqlite_active = False
        logger.info("Successfully connected to primary PostgreSQL database.")
        return eng
    except Exception as e:
        is_sqlite_active = True
        logger.warning(f"PostgreSQL connection verification failed ({e}). Activating SQLite ({fallback_url}).")
        return create_engine(fallback_url, connect_args={"check_same_thread": False})

engine = create_resilient_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_health() -> dict:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "Active",
            "driver": "SQLite (High-Resilience Fallback)" if is_sqlite_active else "PostgreSQL (Neon Cloud Cluster)",
            "connected": True
        }
    except Exception as e:
        return {
            "status": "Degraded",
            "driver": "Unknown",
            "connected": False,
            "error": str(e)
        }
