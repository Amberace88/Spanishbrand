"""Builds print-ready Gelato wall calendars (A3 portrait, 4 mm bleed) + preview pages.

PDF order (Gelato wall calendar spec): cover, 12 month pages, 1 blank page.
Month page: artwork on top (from the brand design library), month grid below with Spain's national holidays.
"""
import calendar
import io
import sys
from datetime import date
from PIL import Image
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

FONTS = "/home/claude/spanishbrand/src/lib/personalization/fonts/"
pdfmetrics.registerFont(TTFont("Anton", FONTS + "Anton_400Regular.ttf"))
pdfmetrics.registerFont(TTFont("Inter", FONTS + "Inter_800ExtraBold.ttf"))
pdfmetrics.registerFont(TTFont("Cinzel", FONTS + "Cinzel_700Bold.ttf"))
pdfmetrics.registerFont(TTFont("Brico", FONTS + "BricolageGrotesque_800ExtraBold.ttf"))

BLEED = 4 * mm
W, H = 297 * mm + 2 * BLEED, 420 * mm + 2 * BLEED
SAFE = BLEED + 6 * mm  # 4 mm inside trim
TOP_SAFE = BLEED + 12 * mm  # binding side

YEAR = 2027
MONTHS = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
DAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"]
# Fiestas nacionales 2027 (Easter 2027 = 28 March → Viernes Santo 26 March)
HOLIDAYS = {
    date(2027, 1, 1): "Año Nuevo",
    date(2027, 1, 6): "Reyes",
    date(2027, 3, 26): "Viernes Santo",
    date(2027, 5, 1): "Fiesta del Trabajo",
    date(2027, 8, 15): "Asunción",
    date(2027, 10, 12): "Fiesta Nacional",
    date(2027, 11, 1): "Todos los Santos",
    date(2027, 12, 6): "Constitución",
    date(2027, 12, 8): "Inmaculada",
    date(2027, 12, 25): "Navidad",
}
INK = (0.07, 0.07, 0.07)
RED = (0.784, 0.063, 0.18)
GOLD = (0.83, 0.65, 0.16)
GREY = (0.45, 0.43, 0.40)


def jpeg(path, max_w=None):
    im = Image.open(path).convert("RGB")
    if max_w and im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=90, optimize=True)
    buf.seek(0)
    return ImageReader(buf), im.size


def stripes(c, x, y, w, h):
    c.setFillColorRGB(*RED); c.rect(x, y, w, h, stroke=0, fill=1)
    c.setFillColorRGB(1, 0.77, 0); c.rect(x, y + h / 4, w, h / 2, stroke=0, fill=1)


def cover(c, art, title, sub):
    img, (iw, ih) = jpeg(art)
    # cover art fills the page (cropped to A3 ratio)
    scale = max(W / iw, H / ih)
    dw, dh = iw * scale, ih * scale
    c.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
    band = 92 * mm
    c.setFillColorRGB(0.043, 0.043, 0.043); c.rect(0, 0, W, band + BLEED, stroke=0, fill=1)
    stripes(c, 0, band + BLEED, W, 4 * mm)
    c.setFillColorRGB(*GOLD); c.setFont("Anton", 30 * mm); c.drawCentredString(W / 2, BLEED + 44 * mm, title)
    c.setFillColorRGB(0.96, 0.94, 0.9); c.setFont("Inter", 6.5 * mm); c.drawCentredString(W / 2, BLEED + 28 * mm, sub)
    c.setFont("Inter", 4 * mm); c.setFillColorRGB(0.75, 0.72, 0.66); c.drawCentredString(W / 2, BLEED + 14 * mm, "ROJO Y GUALDA · rojoygualda.com")
    c.showPage()


def month_page(c, m, art, theme):
    img, (iw, ih) = jpeg(art)
    art_h = 228 * mm + BLEED
    scale = max(W / iw, art_h / ih)
    dw, dh = iw * scale, ih * scale
    c.saveState()
    p = c.beginPath(); p.rect(0, H - art_h, W, art_h); c.clipPath(p, stroke=0, fill=0)
    c.drawImage(img, (W - dw) / 2, H - art_h + (art_h - dh) / 2, dw, dh)
    c.restoreState()
    stripes(c, 0, H - art_h - 4 * mm, W, 4 * mm)

    left, right = SAFE + 6 * mm, W - SAFE - 6 * mm
    top = H - art_h - 4 * mm - 12 * mm
    c.setFillColorRGB(*INK); c.setFont("Anton", 21 * mm); c.drawString(left, top - 18 * mm, MONTHS[m - 1])
    c.setFillColorRGB(*RED); c.setFont("Anton", 21 * mm); c.drawRightString(right, top - 18 * mm, str(YEAR))
    c.setFillColorRGB(*GREY); c.setFont("Inter", 3.6 * mm); c.drawString(left, top - 25 * mm, theme.upper())

    grid_top = top - 34 * mm
    col_w = (right - left) / 7
    c.setFont("Inter", 3.8 * mm)
    for i, d in enumerate(DAYS):
        c.setFillColorRGB(*(RED if i == 6 else INK)); c.drawCentredString(left + col_w * (i + 0.5), grid_top, d)
    c.setStrokeColorRGB(0.85, 0.82, 0.77); c.setLineWidth(0.6)
    c.line(left, grid_top - 3 * mm, right, grid_top - 3 * mm)
    weeks = calendar.Calendar(firstweekday=0).monthdayscalendar(YEAR, m)
    bottom = BLEED + 26 * mm
    row_h = min(20 * mm, (grid_top - 6 * mm - bottom) / len(weeks))
    for r, week in enumerate(weeks):
        y = grid_top - 6 * mm - r * row_h
        c.line(left, y - row_h, right, y - row_h)
        for i, day in enumerate(week):
            if not day:
                continue
            dt = date(YEAR, m, day)
            hol = HOLIDAYS.get(dt)
            x = left + col_w * i
            c.setFillColorRGB(*(RED if (i == 6 or hol) else INK))
            c.setFont("Brico", 8.6 * mm); c.drawString(x + 2.5 * mm, y - 9 * mm, str(day))
            if hol:
                c.setFont("Inter", 2.5 * mm); c.drawString(x + 2.5 * mm, y - row_h + 2.6 * mm, hol)
    c.setFillColorRGB(*GREY); c.setFont("Inter", 2.8 * mm)
    c.drawString(left, BLEED + 14 * mm, "En rojo: festivos nacionales. Consulta los festivos de tu comunidad y municipio.")
    c.drawRightString(right, BLEED + 14 * mm, "ROJO Y GUALDA · rojoygualda.com")
    c.showPage()


def build(name, title, sub, themes, out):
    c = canvas.Canvas(out, pagesize=(W, H))
    c.setTitle(f"{title} — ROJO Y GUALDA"); c.setAuthor("ROJO Y GUALDA")
    base = "/tmp/claude-0/-home-claude-spanishbrand/3017eefa-a49c-5440-a700-89e530796fc5/scratchpad/cal/"
    cover(c, base + f"{name}-cover.png", title, sub)
    for m in range(1, 13):
        month_page(c, m, base + f"{name}-{m}.png", themes[m - 1])
    c.showPage()  # blank last page (Gelato spec)
    c.save()


if __name__ == "__main__":
    out = sys.argv[1]
    build("espana", "ESPAÑA 2027", "Doce meses de sol, fiesta, mar y orgullo", ["Sol de España", "Azulejo", "De Feria", "Rosa de los Vientos", "Verbena", "Atardecer Mediterráneo", "Chiringuito Club", "Costa", "Tierra de Vinos", "Tierra de Castillos", "Buen Camino", "Hecho en España"], out + "calendario-espana-2027.pdf")
    build("ciudades", "CIUDADES 2027", "Doce ciudades de España, en coordenadas", ["Madrid", "Barcelona", "València", "Sevilla", "Málaga", "Bilbao", "Granada", "Cádiz", "Santiago de Compostela", "Alicante", "Donostia / San Sebastián", "Palma"], out + "calendario-ciudades-2027.pdf")
