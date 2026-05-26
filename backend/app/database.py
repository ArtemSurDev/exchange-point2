from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path
from threading import Lock
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
dotenv_path = os.getenv("DOTENV_PATH")
load_dotenv(dotenv_path or BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

engine = None
SessionLocal = None
engine_lock = Lock()

Base = declarative_base()

def get_db():
    if SessionLocal is None:
        raise RuntimeError("Database engine is not initialized. Ensure application startup has run.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_engine():
    global engine, SessionLocal
    ensure_database_url()
    with engine_lock:
        if engine is None:
            engine = create_engine(DATABASE_URL)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine

def ensure_database_url():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set. Create backend/.env or export DATABASE_URL.")

def get_safe_database_url():
    if not DATABASE_URL:
        return "<missing DATABASE_URL>"
    try:
        return make_url(DATABASE_URL).render_as_string(hide_password=True)
    except ArgumentError:
        return "<invalid DATABASE_URL>"
