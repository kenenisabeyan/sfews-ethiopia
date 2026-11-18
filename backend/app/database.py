import os
import socket
import logging
import concurrent.futures
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

def is_host_reachable(url: str) -> bool:
    """Non-blocking reachability check with wait=False shutdown to avoid thread blocking."""
    try:
        parsed = urlparse(url)
        host = parsed.hostname
        if not host or host in ("localhost", "127.0.0.1"):
            return True
        
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        def probe():
            port = parsed.port or 5432
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.4)
            sock.connect((host, port))
            sock.close()
            return True

        future = executor.submit(probe)
        try:
            return future.result(timeout=0.5)
        except Exception:
            return False
        finally:
            executor.shutdown(wait=False, cancel_futures=True)
    except Exception:
        return False

def create_resilient_engine():
    global DATABASE_URL, is_sqlite_active
    fallback_url = os.getenv("SQLITE_FALLBACK_URL", "sqlite:///./sfews_local.db")
    
    # If SQLite explicitly requested or configured
    if DATABASE_URL.startswith("sqlite") or os.getenv("USE_SQLITE", "").lower() in ("true", "1"):
        is_sqlite_active = True
        logger.info(f"Using high-performance local SQLite database ({fallback_url}).")
        return create_engine(fallback_url, connect_args={"check_same_thread": False})

    # Fast reachability probe
    if not is_host_reachable(DATABASE_URL):
        is_sqlite_active = True
        logger.info(f"Target remote database host unreachable. Engaging local resilient engine ({fallback_url}).")
        return create_engine(fallback_url, connect_args={"check_same_thread": False})

    try:
        eng = create_engine(
            DATABASE_URL,
            pool_size=10,
            max_overflow=20,
            pool_recycle=300,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 2}
        )
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        is_sqlite_active = False
        logger.info("Successfully connected to primary PostgreSQL database.")
        return eng
    except Exception as e:
        is_sqlite_active = True
        logger.warning(f"Database connection verification failed ({e}). Activating SQLite ({fallback_url}).")
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
