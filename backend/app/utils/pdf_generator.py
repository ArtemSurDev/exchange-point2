import os
import urllib.request
import logging
from io import BytesIO

from reportlab.lib.pagesizes import A6
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logger = logging.getLogger(__name__)

FONTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")

FONT_URLS = {
    "Roboto-Regular.ttf": (
        "https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Regular.ttf"
    ),
    "Roboto-Bold.ttf": (
        "https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Bold.ttf"
    ),
}

_fonts_registered = False


def _ensure_fonts() -> bool:
    """Download and register DejaVu fonts (Cyrillic-capable). Returns True on success."""
    global _fonts_registered
    if _fonts_registered:
        return True

    os.makedirs(FONTS_DIR, exist_ok=True)

    # Download missing font files
    for filename, url in FONT_URLS.items():
        dest = os.path.join(FONTS_DIR, filename)
        if not os.path.exists(dest):
            try:
                logger.info("Downloading font %s ...", filename)
                urllib.request.urlretrieve(url, dest)
                logger.info("Font downloaded: %s (%d bytes)", filename, os.path.getsize(dest))
            except Exception as exc:
                logger.error("Failed to download font %s: %s", filename, exc)
                return False

    # Register fonts with ReportLab
    try:
        regular_path = os.path.join(FONTS_DIR, "Roboto-Regular.ttf")
        bold_path = os.path.join(FONTS_DIR, "Roboto-Bold.ttf")

        pdfmetrics.registerFont(TTFont("Roboto-Regular", regular_path))
        pdfmetrics.registerFont(TTFont("Roboto-Bold", bold_path))

        _fonts_registered = True
        logger.info("Fonts registered successfully")
        return True
    except Exception as exc:
        logger.error("Failed to register fonts: %s", exc)
        return False


def generate_receipt(operation, currency, client, cashier) -> bytes:
    """Generate a PDF receipt for a currency exchange operation."""
    has_cyrillic_font = _ensure_fonts()

    regular = "Roboto-Regular" if has_cyrillic_font else "Helvetica"
    bold = "Roboto-Bold" if has_cyrillic_font else "Helvetica-Bold"

    buffer = BytesIO()
    width, height = A6
    c = canvas.Canvas(buffer, pagesize=A6)

    # Header
    c.setFont(bold, 12)
    c.drawString(10 * mm, height - 10 * mm, "ОБМЕННЫЙ ПУНКТ")
    c.setFont(regular, 8)
    c.drawString(10 * mm, height - 15 * mm, "г. Москва, ул. Примерная, д. 1")

    # Title
    c.setFont(bold, 10)
    c.drawString(10 * mm, height - 24 * mm, "ЧЕК ОБМЕННОЙ ОПЕРАЦИИ")
    c.setFont(regular, 8)
    c.drawString(
        10 * mm,
        height - 29 * mm,
        f"Время: {operation.created_at.strftime('%d.%m.%Y %H:%M')}",
    )

    c.line(10 * mm, height - 34 * mm, width - 10 * mm, height - 34 * mm)

    # Parties
    c.setFont(bold, 9)
    c.drawString(10 * mm, height - 42 * mm, f"Кассир: {cashier.full_name}")
    c.drawString(10 * mm, height - 47 * mm, f"Клиент: {client.full_name}")

    c.line(10 * mm, height - 52 * mm, width - 10 * mm, height - 52 * mm)

    # Operation details
    op_type = "ПОКУПКА" if operation.operation_type == "buy" else "ПРОДАЖА"
    c.setFont(bold, 9)
    c.drawString(10 * mm, height - 60 * mm, f"Операция: {op_type}")

    c.setFont(regular, 8)
    c.drawString(10 * mm, height - 65 * mm, f"Валюта: {currency.code}")
    c.drawString(
        10 * mm,
        height - 70 * mm,
        f"Сумма: {operation.amount:.2f} {currency.symbol}",
    )
    c.drawString(10 * mm, height - 75 * mm, f"Курс: {operation.rate:.4f} RUB")
    c.drawString(10 * mm, height - 80 * mm, f"Итого: {operation.rub_amount:.2f} RUB")

    c.line(10 * mm, height - 85 * mm, width - 10 * mm, height - 85 * mm)

    c.setFont(regular, 7)
    c.drawString(10 * mm, height - 92 * mm, "Спасибо за обращение!")

    c.save()

    pdf_content = buffer.getvalue()
    buffer.close()
    return pdf_content
