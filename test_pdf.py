from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas
try:
    pdfmetrics.registerFont(TTFont('DejaVuSans', '/Users/artem/WebstormProjects/currency-exchange/backend/app/utils/fonts/DejaVuSans.ttf'))
    c = canvas.Canvas('test.pdf')
    c.setFont('DejaVuSans', 12)
    c.drawString(100, 100, "Тестовый текст на русском")
    c.save()
    print("PDF generated. No error.")
except Exception as e:
    print(f"Error: {e}")
