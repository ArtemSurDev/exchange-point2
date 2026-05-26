from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import secrets

from app import models, schemas, auth
from app.database import get_db
from app.routers.auth import oauth2_scheme

router = APIRouter(prefix="/api/cashiers", tags=["cashiers"])

@router.get("/clients/search")
def search_client(
    email: str,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    cashier = auth.get_current_user(db, token)

    if cashier.role not in [models.UserRole.CASHIER, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")

    client = db.query(models.User).filter(
        models.User.email == email,
        models.User.role == models.UserRole.CLIENT
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return schemas.ClientInfo(
        id=client.id,
        email=client.email,
        full_name=client.full_name,
        phone=client.phone,
        passport_series=client.passport_series,
        passport_number=client.passport_number
    )

@router.post("/clients/quick-register", response_model=schemas.UserResponse)
def quick_register_client(
    client_data: schemas.QuickClientCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    cashier = auth.get_current_user(db, token)

    if cashier.role not in [models.UserRole.CASHIER, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")

    existing_user = db.query(models.User).filter(models.User.email == client_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    generated_password = client_data.password or secrets.token_urlsafe(8)
    hashed_password = auth.get_password_hash(generated_password)
    user = models.User(
        email=client_data.email,
        hashed_password=hashed_password,
        full_name=client_data.full_name,
        phone=client_data.phone,
        passport_series=client_data.passport_series,
        passport_number=client_data.passport_number,
        passport_issued_by=client_data.passport_issued_by,
        passport_issue_date=client_data.passport_issue_date,
        role=models.UserRole.CLIENT
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put("/clients/{client_id}", response_model=schemas.UserResponse)
def update_client(
    client_id: int,
    client_data: schemas.UserProfileUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    cashier = auth.get_current_user(db, token)

    if cashier.role not in [models.UserRole.CASHIER, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")

    client = db.query(models.User).filter(
        models.User.id == client_id,
        models.User.role == models.UserRole.CLIENT
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    data = client_data.model_dump(exclude_unset=True)

    if "email" in data and data["email"] != client.email:
        existing_user = db.query(models.User).filter(models.User.email == data["email"]).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

    for field, value in data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return client
