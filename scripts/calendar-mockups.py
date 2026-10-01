"""Realistic lifestyle mockups for the wall calendars (wall scene, month page, flat lay)."""
import random
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFilter

SP = "/tmp/claude-0/-home-claude-spanishbrand/3017eefa-a49c-5440-a700-89e530796fc5/scratchpad/cal/"
OUT = "/home/claude/spanishbrand/public/catalog/calendars/"


def page(pdf, n):
    stem = f"{SP}pg-{pdf}-{n}"
    subprocess.run(["pdftoppm", "-r", "70", "-png", "-f", str(n), "-l", str(n), "-singlefile", f"{OUT}{pdf}.pdf", stem], check=True)
    im = Image.open(stem + ".png").convert("RGB")
    b = round(im.width * 4 / 305)  # trim the 4 mm bleed
    return im.crop((b, b, im.width - b, im.height - b))


def plaster(w, h, base=(234, 228, 218)):
    random.seed(7)
    im = Image.new("RGB", (w, h), base)
    noise = Image.effect_noise((w, h), 14).convert("L")
    im = Image.blend(im, Image.merge("RGB", [noise] * 3), 0.06)
    # soft light from the top-left
    light = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(light)
    for i in range(40):
        d.ellipse((-w * 0.6 + i * 12, -h * 0.7 + i * 12, w * 0.9 - i * 6, h * 0.9 - i * 6), fill=int(i * 2.2))
    light = light.filter(ImageFilter.GaussianBlur(80))
    return Image.composite(Image.new("RGB", (w, h), (248, 244, 236)), im, light)


def wood(w, h):
    im = Image.new("RGB", (w, h), (176, 132, 92))
    d = ImageDraw.Draw(im)
    random.seed(3)
    for y in range(0, h, 3):
        c = 150 + int(30 * random.random())
        d.line([(0, y), (w, y + random.randint(-6, 6))], fill=(c, int(c * 0.74), int(c * 0.5)), width=2)
    return im.filter(ImageFilter.GaussianBlur(1.2))


def hang(bg, pg, cx, top, width):
    h = round(pg.height * width / pg.width)
    pg = pg.resize((width, h), Image.LANCZOS)
    # drop shadow
    sh = Image.new("L", bg.size, 0)
    ImageDraw.Draw(sh).rectangle((cx - width // 2 + 14, top + 22, cx + width // 2 + 14, top + h + 26), fill=120)
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    bg.paste((60, 50, 40), (0, 0), sh)
    bg.paste(pg, (cx - width // 2, top))
    d = ImageDraw.Draw(bg)
    # wire-o binding + hanger hook
    for x in range(cx - width // 2 + 18, cx + width // 2 - 10, 16):
        d.ellipse((x, top - 8, x + 10, top + 12), outline=(40, 40, 44), width=3)
    d.arc((cx - 40, top - 60, cx + 40, top + 10), 200, 340, fill=(40, 40, 44), width=5)
    d.ellipse((cx - 7, top - 74, cx + 7, top - 60), fill=(90, 90, 96))
    return bg


def scene_wall(pg, size=1600):
    bg = plaster(size, size)
    return hang(bg, pg, size // 2, 230, 820)


def flat_lay(p1, p2, size=1600):
    bg = wood(size, size)
    for pg, ang, (x, y), w in ((p2, -9, (300, 230), 760), (p1, 6, (620, 420), 760)):
        h = round(pg.height * w / pg.width)
        im = pg.resize((w, h), Image.LANCZOS).convert("RGBA")
        sh = Image.new("RGBA", (w + 80, h + 80), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rectangle((40, 50, w + 40, h + 50), fill=(0, 0, 0, 110))
        sh = sh.filter(ImageFilter.GaussianBlur(18)).rotate(ang, expand=True, resample=Image.BICUBIC)
        rot = im.rotate(ang, expand=True, resample=Image.BICUBIC)
        bg.paste(sh, (x - 40, y - 20), sh)
        bg.paste(rot, (x, y), rot)
    return bg


for pdf in ("calendario-espana-2027", "calendario-ciudades-2027"):
    cover, jan, jun = page(pdf, 1), page(pdf, 2), page(pdf, 7)
    scene_wall(cover).save(f"{OUT}{pdf}-1.jpg", quality=88, optimize=True)
    scene_wall(jun).save(f"{OUT}{pdf}-2.jpg", quality=88, optimize=True)
    flat_lay(cover, jan).save(f"{OUT}{pdf}-3.jpg", quality=88, optimize=True)
print("ok")
