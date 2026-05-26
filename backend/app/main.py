import logging
import os
import secrets
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, ensure_database_url, get_engine, get_safe_database_url
from app.routers import auth, currencies, operations, cashiers, admin, reports
from app import auth as auth_service, models

logger = logging.getLogger(__name__)

def ensure_schema_compatibility(engine):
    inspector = inspect(engine)
    if "operations" not in inspector.get_table_names():
        return

    operation_columns = {column["name"] for column in inspector.get_columns("operations")}
    if "receipt_pdf" in operation_columns:
        return

    if engine.dialect.name == "postgresql":
        alter_statement = "ALTER TABLE operations ADD COLUMN receipt_pdf BYTEA"
    elif engine.dialect.name == "sqlite":
        alter_statement = "ALTER TABLE operations ADD COLUMN receipt_pdf BLOB"
    elif engine.dialect.name in {"mysql", "mariadb"}:
        alter_statement = "ALTER TABLE operations ADD COLUMN receipt_pdf LONGBLOB"
    else:
        logger.warning(
            "Unknown database dialect '%s' for receipt_pdf migration. Falling back to BLOB.",
            engine.dialect.name,
        )
        alter_statement = "ALTER TABLE operations ADD COLUMN receipt_pdf BLOB"
    with engine.begin() as connection:
        connection.execute(text(alter_statement))

    logger.info("Added missing operations.receipt_pdf column for schema compatibility.")

def ensure_default_admin(engine):
    admin_email_env = os.getenv("DEFAULT_ADMIN_EMAIL")
    admin_password_env = os.getenv("DEFAULT_ADMIN_PASSWORD")
    admin_email = admin_email_env or "admin@exchange.ru"
    admin_password = admin_password_env or secrets.token_urlsafe(12)

    if not admin_email_env or not admin_password_env:
        logger.warning(
            "Using generated fallback admin credentials. Set DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD explicitly."
        )

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        existing_admin = db.query(models.User).filter(models.User.email == admin_email).first()
        if existing_admin is None:
            db.add(
                models.User(
                    email=admin_email,
                    hashed_password=auth_service.get_password_hash(admin_password),
                    role=models.UserRole.ADMIN,
                    full_name="System Administrator",
                    is_active=True,
                )
            )
            db.commit()
            logger.info("Default admin user created: %s", admin_email)
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_database_url()
        engine = get_engine()
        Base.metadata.create_all(bind=engine)
        ensure_schema_compatibility(engine)
        ensure_default_admin(engine)
    except RuntimeError as exc:
        if "DATABASE_URL" in str(exc):
            logger.exception("DATABASE_URL is not set. Create backend/.env or export DATABASE_URL.")
        else:
            logger.exception("Application startup failed with runtime error.")
        raise
    except SQLAlchemyError:
        logger.exception(
            "Database initialization failed during startup. Verify DATABASE_URL (current: %s) and database availability.",
            get_safe_database_url(),
        )
        raise
    yield

app = FastAPI(title="Currency Exchange API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(currencies.router)
app.include_router(operations.router)
app.include_router(cashiers.router)
app.include_router(admin.router)
app.include_router(reports.router)

@app.get("/")
def root():
    return {"message": "Currency Exchange API", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
