from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app import models, schemas, auth
from app.database import get_db
from app.routers.auth import oauth2_scheme

router = APIRouter(prefix="/api/currencies", tags=["currencies"])

@router.get("/", response_model=List[schemas.CurrencyWithRates])
def get_currencies(db: Session = Depends(get_db)):
    from sqlalchemy import func, desc

    currencies = db.query(models.Currency).filter(models.Currency.is_active == True).all()
    result = []
    history_limit = 5

    for currency in currencies:
        currency_dict = {
            "id": currency.id,
            "code": currency.code,
            "name": currency.name,
            "symbol": currency.symbol,
            "is_active": currency.is_active,
            "current_buy_rate": None,
            "current_sell_rate": None
        }

        latest_rate = db.query(models.ExchangeRate)\
            .filter(models.ExchangeRate.currency_id == currency.id)\
            .filter(models.ExchangeRate.effective_from <= datetime.now())\
            .order_by(desc(models.ExchangeRate.effective_from))\
            .first()

        history_rates = db.query(models.ExchangeRate)\
            .filter(models.ExchangeRate.currency_id == currency.id)\
            .filter(models.ExchangeRate.effective_from <= datetime.now())\
            .order_by(desc(models.ExchangeRate.effective_from))\
            .limit(history_limit)\
            .all()

        if latest_rate:
            currency_dict["current_buy_rate"] = latest_rate.buy_rate
            currency_dict["current_sell_rate"] = latest_rate.sell_rate

        currency_dict["rates_history"] = [
            {
                "buy_rate": rate.buy_rate,
                "sell_rate": rate.sell_rate,
                "effective_from": rate.effective_from
            }
            for rate in history_rates
        ]

        result.append(currency_dict)

    return result

@router.get("/{currency_id}", response_model=schemas.CurrencyResponse)
def get_currency(currency_id: int, db: Session = Depends(get_db)):
    currency = db.query(models.Currency).filter(models.Currency.id == currency_id).first()
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")
    return currency
