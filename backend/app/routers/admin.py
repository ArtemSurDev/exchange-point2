from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas, auth
from app.database import get_db
from app.routers.auth import oauth2_scheme

router = APIRouter(prefix="/api/admin", tags=["admin"])

def check_admin(token: str, db: Session):
    user = auth.get_current_user(db, token)
    if user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def get_cashier_or_404(db: Session, cashier_id: int):
    cashier = db.query(models.User).filter(
        models.User.id == cashier_id,
        models.User.role == models.UserRole.CASHIER
    ).first()
    if not cashier:
        raise HTTPException(status_code=404, detail="Cashier not found")
    return cashier

@router.post("/admins", response_model=schemas.UserResponse)
def create_admin(
    admin_data: schemas.CashierCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = check_admin(token, db)
    if user.email != "admin@exchange.ru":
        raise HTTPException(status_code=403, detail="Only main admin can create new admins")

    existing_user = db.query(models.User).filter(models.User.email == admin_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth.get_password_hash(admin_data.password)
    new_admin = models.User(
        email=admin_data.email,
        hashed_password=hashed_password,
        full_name=admin_data.full_name,
        role=models.UserRole.ADMIN
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return new_admin

@router.get("/admins", response_model=List[schemas.UserResponse])
def get_admins(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    check_admin(token, db)
    return db.query(models.User).filter(models.User.role == models.UserRole.ADMIN).all()

@router.delete("/admins/{admin_id}")
def delete_admin(
    admin_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = check_admin(token, db)
    if user.email != "admin@exchange.ru":
        raise HTTPException(status_code=403, detail="Only main admin can delete admins")

    target_admin = db.query(models.User).filter(
        models.User.id == admin_id,
        models.User.role == models.UserRole.ADMIN
    ).first()

    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    if target_admin.email == "admin@exchange.ru":
        raise HTTPException(status_code=400, detail="Cannot delete main admin")

    db.delete(target_admin)
    db.commit()
    return {"detail": "Admin deleted successfully"}

@router.post("/cashiers", response_model=schemas.UserResponse)
def create_cashier(
    cashier_data: schemas.CashierCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    check_admin(token, db)

    existing_user = db.query(models.User).filter(models.User.email == cashier_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth.get_password_hash(cashier_data.password)
    cashier = models.User(
        email=cashier_data.email,
        hashed_password=hashed_password,
        full_name=cashier_data.full_name,
        role=models.UserRole.CASHIER
    )
    db.add(cashier)
    db.commit()
    db.refresh(cashier)
    return cashier

@router.get("/cashiers", response_model=List[schemas.UserResponse])
def get_cashiers(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    check_admin(token, db)
    return db.query(models.User).filter(models.User.role == models.UserRole.CASHIER).all()

@router.post("/currencies", response_model=schemas.CurrencyResponse)
def create_currency(
    currency_data: schemas.CurrencyCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    check_admin(token, db)

    normalized_code = currency_data.code.upper()
    existing = db.query(models.Currency).filter(models.Currency.code == normalized_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Currency code already exists")

    currency = models.Currency(
        code=normalized_code,
        name=currency_data.name,
        symbol=currency_data.symbol
    )
    db.add(currency)
    db.commit()
    db.refresh(currency)
    return currency

@router.put("/currencies/{currency_id}", response_model=schemas.CurrencyResponse)
def update_currency(
    currency_id: int,
    currency_update: schemas.CurrencyCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    check_admin(token, db)
    db_curr = db.query(models.Currency).filter(models.Currency.id == currency_id).first()
    if not db_curr:
        raise HTTPException(status_code=404, detail="Currency not found")

    db_curr.code = currency_update.code
    db_curr.name = currency_update.name
    db_curr.symbol = currency_update.symbol
    db.commit()
    db.refresh(db_curr)
    return db_curr

@router.delete("/currencies/{currency_id}")
def delete_currency(
    currency_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    check_admin(token, db)
    db_curr = db.query(models.Currency).filter(models.Currency.id == currency_id).first()
    if not db_curr:
        raise HTTPException(status_code=404, detail="Currency not found")

    db_curr.is_active = False # Soft delete
    db.commit()
    return {"message": "Currency deleted"}

@router.post("/exchange-rates", response_model=schemas.ExchangeRateResponse)
def create_exchange_rate(
    rate_data: schemas.ExchangeRateCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = check_admin(token, db)

    currency = db.query(models.Currency).filter(models.Currency.id == rate_data.currency_id).first()
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")

    from datetime import datetime

    rate = models.ExchangeRate(
        currency_id=rate_data.currency_id,
        buy_rate=rate_data.buy_rate,
        sell_rate=rate_data.sell_rate,
        effective_from=rate_data.effective_from or datetime.now(),
        created_by=user.id
    )
    db.add(rate)
    db.commit()
    db.refresh(rate)

    return schemas.ExchangeRateResponse(
        id=rate.id,
        currency_id=rate.currency_id,
        currency_code=currency.code,
        buy_rate=rate.buy_rate,
        sell_rate=rate.sell_rate,
        effective_from=rate.effective_from,
        created_at=rate.created_at
    )

@router.get("/exchange-rates", response_model=List[schemas.ExchangeRateResponse])
def get_exchange_rates(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    check_admin(token, db)

    from sqlalchemy import desc
    rates = db.query(models.ExchangeRate).order_by(desc(models.ExchangeRate.effective_from)).all()

    result = []
    for rate in rates:
        currency = db.query(models.Currency).filter(models.Currency.id == rate.currency_id).first()
        result.append(schemas.ExchangeRateResponse(
            id=rate.id,
            currency_id=rate.currency_id,
            currency_code=currency.code,
            buy_rate=rate.buy_rate,
            sell_rate=rate.sell_rate,
            effective_from=rate.effective_from,
            created_at=rate.created_at
        ))

    return result

@router.patch("/cashiers/{cashier_id}", response_model=schemas.UserResponse)
def update_cashier(
    cashier_id: int,
    cashier_data: schemas.CashierUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    check_admin(token, db)
    cashier = get_cashier_or_404(db, cashier_id)

    payload = cashier_data.dict(exclude_unset=True)
    if "email" in payload:
        existing_user = db.query(models.User).filter(
            models.User.email == payload["email"],
            models.User.id != cashier_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

    for key, value in payload.items():
        setattr(cashier, key, value)

    db.commit()
    db.refresh(cashier)
    return cashier

@router.patch("/cashiers/{cashier_id}/status", response_model=schemas.UserResponse)
def set_cashier_status(
    cashier_id: int,
    status_data: schemas.CashierStatusUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    check_admin(token, db)
    cashier = get_cashier_or_404(db, cashier_id)
    cashier.is_active = status_data.is_active
    db.commit()
    db.refresh(cashier)
    return cashier

@router.patch("/cashiers/{cashier_id}/reset-password", response_model=schemas.UserResponse)
def reset_cashier_password(
    cashier_id: int,
    reset_data: schemas.CashierResetPassword,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    check_admin(token, db)
    cashier = get_cashier_or_404(db, cashier_id)
    cashier.hashed_password = auth.get_password_hash(reset_data.new_password)
    db.commit()
    db.refresh(cashier)
    return cashier
