"""
Database session and table initialization using SQLite and SQLAlchemy.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.models.vehicle import Base

# Create SQLite engine (check_same_thread=False is standard for SQLite with FastAPI multi-threading)
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create tables on startup if they don't exist yet."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for obtaining database session per request."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
