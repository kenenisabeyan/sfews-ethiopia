import os
import logging
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

def create_resilient_engine():
    global DATABASE_URL, is_sqlite_active
    
    if DATABASE_URL.startswith("sqlite"):
        is_sqlite_active = True
        return create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False}
        )

    try:
        # Try configured database (e.g. Neon PostgreSQL) with a fast connection check
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
        fallback_url = os.getenv("SQLITE_FALLBACK_URL", "sqlite:///./sfews_local.db")
        logger.warning(
            f"Primary database connection unavailable ({e}). "
            f"Activating high-resilience local SQLite fallback ({fallback_url})."
        )
        return create_engine(
            fallback_url,
            connect_args={"check_same_thread": False}
        )

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
            "driver": "SQLite (Fallback Engine)" if is_sqlite_active else "PostgreSQL (Primary Engine)",
            "connected": True
        }
    except Exception as e:
        return {
            "status": "Degraded",
            "driver": "Unknown",
            "connected": False,
            "error": str(e)
        }
