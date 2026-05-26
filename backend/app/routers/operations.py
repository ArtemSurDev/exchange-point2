from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
from datetime import datetime, date
import uuid
import logging

from app import models, schemas, auth
from app.database import get_db
from app.routers.auth import oauth2_scheme
from app.utils.pdf_generator import generate_receipt

router = APIRouter(prefix="/api/operations", tags=["operations"])
logger = logging.getLogger(__name__)

@router.post("/", response_model=schemas.OperationResponse)
def create_operation(
    operation_data: schemas.OperationCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    cashier = auth.get_current_user(db, token)

    if cashier.role not in [models.UserRole.CASHIER, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only cashiers can create operations")

    client = db.query(models.User).filter(models.User.email == operation_data.client_email).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if client.role != models.UserRole.CLIENT:
        raise HTTPException(status_code=400, detail="User is not a client")

    currency = db.query(models.Currency).filter(models.Currency.id == operation_data.currency_id).first()
    if not currency:
        raise HTTPException(status_code=400, detail="Currency not found")

    operation_time = datetime.now()

    latest_rate = db.query(models.ExchangeRate)\
        .filter(models.ExchangeRate.currency_id == operation_data.currency_id)\
        .filter(models.ExchangeRate.effective_from <= operation_time)\
        .order_by(desc(models.ExchangeRate.effective_from))\
        .first()

    if not latest_rate:
        raise HTTPException(status_code=400, detail="No exchange rate available for this currency")

    rate = latest_rate.sell_rate if operation_data.operation_type == schemas.OperationType.BUY else latest_rate.buy_rate
    rub_amount = operation_data.amount * rate

    today = date.today()
    daily_total = db.query(func.sum(models.Operation.rub_amount))\
        .filter(
            models.Operation.client_id == client.id,
            func.date(models.Operation.created_at) == today
        ).scalar() or 0

    if daily_total + rub_amount > 500000:
        raise HTTPException(status_code=400, detail=f"Превышен дневной лимит в 500 000 руб. Остаток: {500000 - daily_total:0.2f} руб.")

    receipt_number = f"R-{operation_time.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

    operation = models.Operation(
        operation_type=operation_data.operation_type,
        currency_id=operation_data.currency_id,
        amount=operation_data.amount,
        rate=rate,
        rub_amount=rub_amount,
        client_id=client.id,
        cashier_id=cashier.id,
        payment_method=operation_data.payment_method,
        receipt_number=receipt_number,
        created_at=operation_time
    )

    db.add(operation)
    db.commit()
    db.refresh(operation)

    try:
        receipt_pdf = generate_receipt(operation, currency, client, cashier)
        operation.receipt_pdf = receipt_pdf
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to generate/store receipt for operation %s", operation.id)

    return schemas.OperationResponse(
        id=operation.id,
        operation_type=operation.operation_type,
        currency_code=currency.code,
        amount=operation.amount,
        rate=operation.rate,
        rub_amount=operation.rub_amount,
        client_name=client.full_name,
        cashier_name=cashier.full_name,
        payment_method=operation.payment_method,
        receipt_number=operation.receipt_number,
        created_at=operation.created_at
    )

@router.get("/my", response_model=List[schemas.OperationResponse])
def get_my_operations(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = auth.get_current_user(db, token)

    if user.role == models.UserRole.CLIENT:
        operations = db.query(models.Operation).filter(models.Operation.client_id == user.id).order_by(desc(models.Operation.created_at)).all()
    elif user.role == models.UserRole.CASHIER:
        operations = db.query(models.Operation).filter(models.Operation.cashier_id == user.id).order_by(desc(models.Operation.created_at)).all()
    else:
        operations = db.query(models.Operation).order_by(desc(models.Operation.created_at)).all()

    result = []
    for op in operations:
        currency = db.query(models.Currency).filter(models.Currency.id == op.currency_id).first()
        client = db.query(models.User).filter(models.User.id == op.client_id).first()
        cashier = db.query(models.User).filter(models.User.id == op.cashier_id).first()
        if not currency or not client or not cashier:
            logger.warning(
                "Operation %s has missing links: currency=%s client=%s cashier=%s",
                op.id,
                bool(currency),
                bool(client),
                bool(cashier)
            )

        result.append(schemas.OperationResponse(
            id=op.id,
            operation_type=op.operation_type,
            currency_code=currency.code if currency else f"ID:{op.currency_id}",
            amount=op.amount,
            rate=op.rate,
            rub_amount=op.rub_amount,
            client_name=client.full_name if client else "Неизвестный клиент",
            cashier_name=cashier.full_name if cashier else "Неизвестный кассир",
            payment_method=op.payment_method,
            receipt_number=op.receipt_number,
            created_at=op.created_at
        ))

    return result

@router.get("/receipt/{operation_id}")
def get_receipt(
    operation_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    from fastapi.responses import Response

    user = auth.get_current_user(db, token)
    operation = db.query(models.Operation).filter(models.Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    if user.role == models.UserRole.CLIENT and operation.client_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    currency = db.query(models.Currency).filter(models.Currency.id == operation.currency_id).first()
    client = db.query(models.User).filter(models.User.id == operation.client_id).first()
    cashier = db.query(models.User).filter(models.User.id == operation.cashier_id).first()

    if operation.receipt_pdf:
        pdf_content = operation.receipt_pdf
    else:
        if not currency or not client or not cashier:
            raise HTTPException(status_code=500, detail="Receipt is unavailable for this operation")
        try:
            pdf_content = generate_receipt(operation, currency, client, cashier)
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to generate receipt")

    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=receipt_{operation.receipt_number}.pdf"}
    )
