from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List
from io import BytesIO

from fastapi.responses import Response
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from app.utils.pdf_generator import _ensure_fonts

from app import models, schemas, auth
from app.database import get_db
from app.routers.auth import oauth2_scheme
from app.routers.admin import check_admin

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.post("/stats", response_model=List[schemas.CurrencyStats])
def get_stats(
    report_request: schemas.ReportRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    check_admin(token, db)

    query = db.query(
        models.Currency.code,
        func.sum(case((models.Operation.operation_type == models.OperationType.BUY, models.Operation.amount), else_=0)).label('total_buy_amount'),
        func.sum(case((models.Operation.operation_type == models.OperationType.SELL, models.Operation.amount), else_=0)).label('total_sell_amount'),
        func.sum(case((models.Operation.operation_type == models.OperationType.BUY, models.Operation.rub_amount), else_=0)).label('total_buy_rub'),
        func.sum(case((models.Operation.operation_type == models.OperationType.SELL, models.Operation.rub_amount), else_=0)).label('total_sell_rub'),
        func.count(models.Operation.id).label('operations_count')
    ).join(models.Currency).filter(
        func.date(models.Operation.created_at) >= report_request.start_date,
        func.date(models.Operation.created_at) <= report_request.end_date
    )

    if report_request.currency_id:
        query = query.filter(models.Operation.currency_id == report_request.currency_id)

    stats = query.group_by(models.Currency.code).all()

    return [
        schemas.CurrencyStats(
            currency_code=stat.code,
            total_buy_amount=float(stat.total_buy_amount or 0),
            total_sell_amount=float(stat.total_sell_amount or 0),
            total_buy_rub=float(stat.total_buy_rub or 0),
            total_sell_rub=float(stat.total_sell_rub or 0),
            operations_count=stat.operations_count
        )
        for stat in stats
    ]

@router.post("/stats/pdf")
def get_stats_pdf(
    report_request: schemas.ReportRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    stats = get_stats(report_request, token, db)

    has_cyrillic_font = _ensure_fonts()
    regular_font = "Roboto-Regular" if has_cyrillic_font else "Helvetica"
    bold_font = "Roboto-Bold" if has_cyrillic_font else "Helvetica-Bold"

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    c.setFont(bold_font, 14)
    c.drawString(15 * mm, height - 20 * mm, "Отчет по операциям обменного пункта")
    c.setFont(regular_font, 10)
    c.drawString(
        15 * mm,
        height - 28 * mm,
        f"Период: {report_request.start_date.strftime('%d.%m.%Y')} - {report_request.end_date.strftime('%d.%m.%Y')}"
    )

    y = height - 40 * mm
    c.setFont(bold_font, 10)
    c.drawString(15 * mm, y, "Валюта")
    c.drawString(40 * mm, y, "Покупка")
    c.drawString(70 * mm, y, "Продажа")
    c.drawString(100 * mm, y, "Покупка RUB")
    c.drawString(135 * mm, y, "Продажа RUB")
    c.drawString(170 * mm, y, "Операций")

    y -= 6 * mm
    c.setFont(regular_font, 9)
    for stat in stats:
        if y < 20 * mm:
            c.showPage()
            y = height - 20 * mm
            c.setFont(regular_font, 9)
        c.drawString(15 * mm, y, stat.currency_code)
        c.drawRightString(66 * mm, y, f"{stat.total_buy_amount:.2f}")
        c.drawRightString(96 * mm, y, f"{stat.total_sell_amount:.2f}")
        c.drawRightString(131 * mm, y, f"{stat.total_buy_rub:.2f}")
        c.drawRightString(166 * mm, y, f"{stat.total_sell_rub:.2f}")
        c.drawRightString(195 * mm, y, f"{stat.operations_count}")
        y -= 5 * mm

    c.save()
    pdf_content = buffer.getvalue()
    buffer.close()

    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=exchange_report.pdf"}
    )
