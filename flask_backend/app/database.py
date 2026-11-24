import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

# Default to SQLite local database with high-resilience settings, configurable via DATABASE_URL
DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sfews_flask.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()

def get_db():
    """Context-friendly generator for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_health():
    """Verify database liveness and active driver."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        driver = "SQLite (Local File)" if "sqlite" in DATABASE_URL else "PostgreSQL / External"
        return {"status": "HEALTHY", "driver": driver, "url_sanitized": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL}
    except Exception as e:
        return {"status": "DEGRADED", "error": str(e)}
