#!/usr/bin/env python3
"""Screenshots for Palmera Cover Studio, drawn with Pillow.

The covers are the app's own compositions — the same angled layouts,
grades, illustrated scenes, masthead, badge and barcode that
app/src/render.js paints on canvas — drawn here at export size and
scaled to the screenshot limits. The editor shot draws the studio
window faithfully: browser chrome, control rail, and the live portrait
cover on stage. The two renderers share one design spec (polygons,
gradient stops, type sizes), so the screenshots show what the app
makes.

Run: python3 tools/make_screenshots.py
Writes: screenshots/1-cover.jpg, 2-editor.jpg, 3-cover-square.jpg,
        4-cover-portrait.jpg
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "app" / "samples"
SHOTS = ROOT / "screenshots"
FONTS = ROOT / "app" / "fonts"

DISPLAY_TTF = str(FONTS / "NotoSans-ExtraCondensedBlack.ttf")
TEXT_TTF = str(FONTS / "NotoSans-CondensedBold.ttf")
UI_TTF = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
UI_BOLD_TTF = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

INK = (14, 10, 20)
KEYLINE = (243, 236, 217)
CREAM = (255, 248, 236)
GOLD = (255, 217, 160)


def display_font(size):
    from PIL import ImageFont
    return ImageFont.truetype(DISPLAY_TTF, int(size))


def text_font(size):
    from PIL import ImageFont
    return ImageFont.truetype(TEXT_TTF, int(size))


def ui_font(size, bold=False):
    from PIL import ImageFont
    return ImageFont.truetype(UI_BOLD_TTF if bold else UI_TTF, int(size))


# --- seeded randomness (the same mulberry32 the app uses) --------------------

def mulberry32(seed):
    state = [seed & 0xFFFFFFFF]

    def nxt():
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        a = state[0]
        t = ((a ^ (a >> 15)) * (1 | a)) & 0xFFFFFFFF
        t = (((t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF)) & 0xFFFFFFFF) ^ t) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return nxt


def seed_from_text(text):
    h = 7
    for ch in text:
        h = (h * 31 + ord(ch)) % 9973
    return h


# --- gradients -----------------------------------------------------------------

def gradient(size, stops, horizontal=False):
    """An RGBA gradient image from [offset, (r, g, b, a)] stops."""
    w, h = size
    steps = w if horizontal else h
    strip = Image.new("RGBA", (steps, 1) if horizontal else (1, steps))
    px = strip.load()
    for i in range(steps):
        t = i / max(1, steps - 1)
        colour = stops[-1][1]
        for (o0, c0), (o1, c1) in zip(stops, stops[1:]):
            if o0 <= t <= o1:
                f = 0 if o1 == o0 else (t - o0) / (o1 - o0)
                colour = tuple(round(c0[k] + (c1[k] - c0[k]) * f) for k in range(4))
                break
        if horizontal:
            px[i, 0] = colour
        else:
            px[0, i] = colour
    return strip.resize((w, h))


# --- layouts (the same polygons as app/src/render.js) ---------------------------

def showcase_panels(bucket):
    if bucket == "wide":
        slant = lambda y: 0.47 - 0.05 * y
        return [
            [(0, 0), (slant(0), 0), (slant(1), 1), (0, 1)],
            [(slant(0), 0), (1, 0), (1, 0.34), (slant(0.34), 0.34)],
            [(slant(0.34), 0.34), (1, 0.34), (1, 0.67), (slant(0.67), 0.67)],
            [(slant(0.67), 0.67), (1, 0.67), (1, 1), (slant(1), 1)],
        ]
    if bucket == "portrait":
        hb = lambda x: 0.465 - 0.055 * x
        return [
            [(0, 0), (1, 0), (1, hb(1)), (0, hb(0))],
            [(0, hb(0)), (0.565, hb(0.565)), (0.475, 0.72), (0, 0.72)],
            [(0.565, hb(0.565)), (1, hb(1)), (1, 0.72), (0.475, 0.72)],
            [(0, 0.72), (1, 0.72), (1, 1), (0, 1)],
        ]
    slant = lambda y: 0.52 - 0.06 * y
    return [
        [(0, 0), (slant(0), 0), (slant(1), 1), (0, 1)],
        [(slant(0), 0), (1, 0), (1, 0.5), (slant(0.5), 0.5)],
        [(slant(0.5), 0.5), (1, 0.5), (1, 1), (slant(1), 1)],
    ]


def mosaic_panels():
    return [
        [(0, 0), (0.56, 0), (0.47, 0.52), (0, 0.52)],
        [(0.56, 0), (1, 0), (1, 0.52), (0.47, 0.52)],
        [(0, 0.52), (0.47, 0.52), (0.58, 1), (0, 1)],
        [(0.47, 0.52), (1, 0.52), (1, 1), (0.58, 1)],
    ]


def trio_panels():
    hb = lambda x: 0.64 - 0.06 * x
    return [
        [(0, 0), (1, 0), (1, hb(1)), (0, hb(0))],
        [(0, hb(0)), (0.52, hb(0.52)), (0.44, 1), (0, 1)],
        [(0.52, hb(0.52)), (1, hb(1)), (1, 1), (0.44, 1)],
    ]


def layout_panels(layout, bucket):
    if layout == "showcase":
        return showcase_panels(bucket)
    if layout == "mosaic":
        return mosaic_panels()
    return trio_panels()


# --- grades ----------------------------------------------------------------------

WASHES = {
    "sunset": ([(0, (255, 110, 64, 77)), (0.45, (255, 45, 120, 26)), (1, (28, 0, 58, 102))], False),
    "neon": ([(0, (255, 43, 214, 56)), (0.5, (90, 0, 140, 13)), (1, (34, 211, 238, 61))], True),
    "gold": ([(0, (255, 196, 64, 41)), (0.6, (255, 140, 40, 13)), (1, (112, 44, 0, 77))], False),
    "noir": ([(0, (0, 0, 0, 13)), (1, (0, 0, 0, 87))], False),
    "clean": ([(0, (0, 0, 0, 0)), (1, (0, 0, 0, 31))], False),
}


def grade_photo(img, grade):
    if grade == "noir":
        return ImageOps.autocontrast(ImageOps.grayscale(img).convert("RGB"), cutoff=1)
    if grade == "sunset":
        out = ImageEnhance.Color(img).enhance(1.28)
        out = ImageEnhance.Contrast(out).enhance(1.06)
        return ImageEnhance.Brightness(out).enhance(1.02)
    if grade == "neon":
        return ImageEnhance.Contrast(ImageEnhance.Color(img).enhance(1.42)).enhance(1.08)
    if grade == "gold":
        out = ImageEnhance.Color(img).enhance(1.15)
        return ImageEnhance.Brightness(out).enhance(1.03)
    return ImageEnhance.Color(img).enhance(1.05)


# --- illustrated scenes -----------------------------------------------------------

def draw_palm(draw_layer, base_x, base_y, height, lean, width, colour):
    top_x = base_x + lean * height
    top_y = base_y - height
    mid_x = base_x + lean * height * 0.3
    mid_y = base_y - height * 0.55
    steps = 14
    left, right = [], []
    for i in range(steps + 1):
        t = i / steps
        x = (1 - t) ** 2 * base_x + 2 * (1 - t) * t * mid_x + t * t * top_x
        y = (1 - t) ** 2 * base_y + 2 * (1 - t) * t * mid_y + t * t * top_y
        w = width * (1 - 0.72 * t)
        left.append((x - w, y))
        right.append((x + w, y))
    draw_layer.polygon(left + right[::-1], fill=colour)
    def frond(end_x, end_y, ctrl_x, ctrl_y, wpx):
        pts = []
        for s in range(13):
            t = s / 12
            pts.append(((1 - t) ** 2 * top_x + 2 * (1 - t) * t * ctrl_x + t * t * end_x,
                        (1 - t) ** 2 * top_y + 2 * (1 - t) * t * ctrl_y + t * t * end_y))
        draw_layer.line(pts, fill=colour, width=wpx, joint="curve")

    for i in range(11):
        angle = math.pi * (0.04 + 0.92 * i / 10)
        reach = height * (0.26 + 0.16 * abs(math.sin(i * 1.7))) * (1.1 if i % 2 else 0.94)
        end_x = top_x + math.cos(angle) * reach
        end_y = top_y + (math.sin(angle) ** 1.6) * reach * 0.95 + height * 0.03
        frond(end_x, end_y, top_x + (end_x - top_x) * 0.35, top_y - height * 0.05,
              max(2, round(width * 1.05)))
    for tilt in (-0.5, 0, 0.5):
        frond(top_x + tilt * height * 0.16, top_y + height * 0.13,
              top_x + tilt * height * 0.08, top_y + height * 0.03,
              max(2, round(width * 0.95)))


def draw_sunset_scene(size):
    w, h = size
    img = Image.new("RGB", size)
    sky = gradient((w, round(h * 0.8)),
                   [(0, (42, 16, 82, 255)), (0.35, (123, 45, 139, 255)),
                    (0.58, (232, 67, 147, 255)), (0.76, (255, 126, 71, 255)),
                    (1, (255, 209, 102, 255))])
    img.paste(sky, (0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    sun_x, sun_y, sun_r = w * 0.66, h * 0.68, w * 0.17
    sun = gradient((round(sun_r * 2), round(sun_r * 2)),
                   [(0, (255, 233, 168, 255)), (1, (255, 140, 66, 255))])
    disc = Image.new("L", sun.size, 0)
    ImageDraw.Draw(disc).ellipse([0, 0, sun.size[0] - 1, sun.size[1] - 1], fill=255)
    img.paste(sun, (round(sun_x - sun_r), round(sun_y - sun_r)), disc)
    d = ImageDraw.Draw(img, "RGBA")
    for i in range(3):
        yy = sun_y + sun_r * (0.18 + i * 0.24)
        d.rectangle([sun_x - sun_r, yy, sun_x + sun_r, yy + sun_r * 0.07], fill=(232, 67, 147, 140))
    sea = gradient((w, h - round(h * 0.8)),
                   [(0, (255, 158, 94, 255)), (1, (70, 32, 94, 255))])
    img.paste(sea, (0, round(h * 0.8)))
    d = ImageDraw.Draw(img, "RGBA")
    rng = mulberry32(41)
    for _ in range(42):
        sy = h * (0.815 + rng() * 0.17)
        sx = w * (0.52 + rng() * 0.3)
        alpha = round((0.18 + rng() * 0.4) * 255)
        length = w * (0.012 + rng() * 0.03)
        d.rectangle([sx, sy, sx + length, sy + max(1.5, h * 0.004)], fill=(255, 209, 102, alpha))
    for fx, fy, s in [(0.30, 0.20, 1.0), (0.38, 0.15, 0.7), (0.24, 0.13, 0.55)]:
        cx, cy, r = w * fx, h * fy, w * 0.016 * s
        pts = []
        for t_i in range(9):
            t = t_i / 8
            pts.append(((1 - t) ** 2 * (cx - r) + 2 * (1 - t) * t * (cx - r * 0.4) + t * t * cx,
                        (1 - t) ** 2 * cy + 2 * (1 - t) * t * (cy - r * 0.7) + t * t * cy))
        for t_i in range(9):
            t = t_i / 8
            pts.append(((1 - t) ** 2 * cx + 2 * (1 - t) * t * (cx + r * 0.4) + t * t * (cx + r),
                        (1 - t) ** 2 * cy + 2 * (1 - t) * t * (cy - r * 0.7) + t * t * cy))
        d.line(pts, fill=(22, 10, 36, 204), width=max(2, round(w * 0.0022)), joint="curve")
    draw_palm(d, w * 0.05, h * 1.01, h * 0.8, 0.22, w * 0.011, (22, 10, 36, 255))
    draw_palm(d, w * 0.99, h * 1.01, h * 0.62, -0.3, w * 0.009, (22, 10, 36, 255))
    return img


def draw_skyline_scene(size):
    w, h = size
    horizon = round(h * 0.66)
    img = Image.new("RGB", size)
    sky = gradient((w, horizon),
                   [(0, (7, 11, 42, 255)), (0.55, (29, 20, 80, 255)), (1, (75, 33, 120, 255))])
    img.paste(sky, (0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    moon_x, moon_y = w * 0.15, h * 0.17
    halo = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse([moon_x - w * 0.11, moon_y - w * 0.11,
                                  moon_x + w * 0.11, moon_y + w * 0.11], fill=(245, 239, 220, 90))
    halo = halo.filter(ImageFilter.GaussianBlur(max(6, w * 0.03)))
    img.paste(Image.alpha_composite(img.convert("RGBA"), halo).convert("RGB"), (0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    d.ellipse([moon_x - w * 0.038, moon_y - w * 0.038, moon_x + w * 0.038, moon_y + w * 0.038],
              fill=(245, 239, 220, 255))
    rng = mulberry32(97)
    lit = []
    bx = w * 0.02
    while bx < w * 0.97:
        bw = w * (0.05 + rng() * 0.06)
        bh = h * (0.16 + rng() * 0.34)
        d.rectangle([bx, horizon - bh, bx + bw, horizon], fill=(19, 26, 66, 255))
        cols = max(2, int(bw / (w * 0.016)))
        rows = max(3, int(bh / (h * 0.045)))
        for c in range(cols):
            for r in range(rows):
                if rng() < 0.38:
                    lit.append((bx + (c + 0.5) * (bw / cols),
                                horizon - bh + (r + 0.5) * (bh / rows), rng()))
        bx += bw + w * (0.006 + rng() * 0.014)
    water = gradient((w, h - horizon), [(0, (26, 17, 64, 255)), (1, (5, 6, 15, 255))])
    img.paste(water, (0, horizon))
    d = ImageDraw.Draw(img, "RGBA")
    colours = [(255, 209, 102), (125, 249, 255), (255, 159, 243)]
    for wx, wy, pick in lit:
        col = colours[int(pick * 3) % 3]
        d.rectangle([wx - w * 0.0035, wy - h * 0.006, wx + w * 0.0035, wy + h * 0.006],
                    fill=col + (255,))
        if wy >= horizon - h * 0.05:
            d.rectangle([wx - w * 0.002, horizon + 2, wx + w * 0.002,
                         horizon + 2 + h * (0.02 + pick * 0.05)], fill=col + (61,))
    return img


SCENE_DRAW = {"sunset": draw_sunset_scene, "skyline": draw_skyline_scene}


# --- panels -----------------------------------------------------------------------

def centroid(poly):
    return (sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly))


def shrink_polygon(poly, width, height, inset):
    cx, cy = centroid(poly)
    out = []
    for fx, fy in poly:
        px, py = fx * width, fy * height
        dx, dy = cx * width - px, cy * height - py
        length = math.hypot(dx, dy) or 1
        step = min(inset, length * 0.4)
        out.append((px + dx / length * step, py + dy / length * step))
    return out


def cover_fit(img, box_w, box_h, fx, fy, zoom):
    scale = max(box_w / img.width, box_h / img.height) * zoom
    resized = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    dx = round((box_w - resized.width) * fx)
    dy = round((box_h - resized.height) * fy)
    return resized, dx, dy


def draw_panel(base, poly, panel, photos):
    width, height = base.size
    gutter = max(5, round(width * 0.006))
    points = shrink_polygon(poly, width, height, gutter / 2)
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    box = (round(min(xs)), round(min(ys)), round(max(xs) - min(xs)), round(max(ys) - min(ys)))
    bx, by, bw, bh = box
    layer = Image.new("RGB", (bw, bh), (36, 16, 40))
    fill = panel["fill"]
    if fill[0] == "scene":
        layer = SCENE_DRAW[fill[1]]((bw, bh))
    else:
        photo = grade_photo(photos[fill[1]], panel["grade"])
        fitted, dx, dy = cover_fit(photo, bw, bh, panel["fx"], panel["fy"], panel["zoom"])
        layer.paste(fitted, (dx, dy))
    if fill[0] == "scene":
        if panel["grade"] != "clean":
            stops, horizontal = WASHES[panel["grade"]]
            wash = gradient((bw, bh), stops, horizontal)
            layer.paste(wash, (0, 0), wash)
    else:
        stops, horizontal = WASHES[panel["grade"]]
        wash = gradient((bw, bh), stops, horizontal)
        layer.paste(wash, (0, 0), wash)
    gloss = gradient((bw, round(bh * 0.55)), [(0, (255, 255, 255, 33)), (1, (255, 255, 255, 0))])
    layer.paste(gloss, (0, 0), gloss)
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    base.paste(layer, (bx, by), mask.crop((bx, by, bx + bw, by + bh)))
    d = ImageDraw.Draw(base)
    lw = max(3, round(width * 0.0075))
    d.line(points + [points[0]], fill=KEYLINE, width=lw, joint="curve")
    inner = shrink_polygon(poly, width, height, gutter / 2 + width * 0.0075)
    d.line(inner + [inner[0]], fill=(12, 7, 5), width=2, joint="curve")


# --- masthead -----------------------------------------------------------------------

KICKER = "P A L M E R A   C O V E R   S T U D I O"


def fit_title(draw, title, max_width, start_size):
    words = title.split()
    size = start_size
    while size > 22:
        f = display_font(size)
        if draw.textlength(title, font=f) <= max_width:
            return [title], f, size
        best = None
        for cut in range(1, len(words)):
            lines = [" ".join(words[:cut]), " ".join(words[cut:])]
            widths = [draw.textlength(line, font=f) for line in lines]
            if max(widths) <= max_width:
                balance = abs(widths[0] - widths[1])
                if best is None or balance < best[0]:
                    best = (balance, lines)
        if best:
            return best[1], f, size
        size *= 0.93
    return [title], display_font(size), size


def draw_masthead(base, title, tagline):
    W, H = base.size
    scrim = gradient((W, round(H * 0.30)), [(0, (8, 4, 10, 158)), (1, (8, 4, 10, 0))])
    base.paste(scrim, (0, 0), scrim)
    d = ImageDraw.Draw(base)
    kf = text_font(max(14, W * 0.02))
    d.text((W / 2, H * 0.048), KICKER, font=kf, fill=GOLD, anchor="ms")
    lines, tf, size = fit_title(d, title.upper(), W * 0.92, W * 0.128)
    y = H * 0.062 + size
    last_w = 0
    for line in lines:
        d.text((W / 2 + size * 0.04, y + size * 0.05), line, font=tf,
               fill=(20, 8, 4), anchor="ms")
        d.text((W / 2, y), line, font=tf, fill=(29, 15, 8), anchor="ms",
               stroke_width=max(2, round(size * 0.085)), stroke_fill=(29, 15, 8))
        mask = Image.new("L", (W, H), 0)
        ImageDraw.Draw(mask).text((W / 2, y), line, font=tf, fill=255, anchor="ms")
        fill_grad = gradient((W, H), [(0, (255, 250, 240, 255)), (0.62, (255, 227, 174, 255)),
                                      (1, (255, 179, 122, 255))])
        base.paste(fill_grad, (0, 0), mask)
        d = ImageDraw.Draw(base)
        last_w = d.textlength(line, font=tf)
        y += size * 1.04
    bar_h = max(3, round(size * 0.085))
    bar = gradient((max(2, round(last_w)), bar_h),
                   [(0, (255, 94, 58, 255)), (0.55, (255, 46, 136, 255)), (1, (34, 211, 238, 255))],
                   horizontal=True)
    bar_mask = Image.new("L", bar.size, 0)
    ImageDraw.Draw(bar_mask).rounded_rectangle([0, 0, bar.size[0] - 1, bar.size[1] - 1],
                                               radius=bar_h / 2, fill=255)
    base.paste(bar, (round(W / 2 - last_w / 2), round(y - size * 1.04 + size * 0.18)), bar_mask)
    if tagline:
        tf2 = text_font(max(15, W * 0.026))
        d = ImageDraw.Draw(base)
        d.text((W * 0.032, H * 0.962), tagline.upper(), font=tf2, fill=(255, 233, 201),
               anchor="ls", stroke_width=3, stroke_fill=(10, 5, 2))


def draw_badge(base):
    W, H = base.size
    d = ImageDraw.Draw(base)
    s = round(W * 0.088)
    x, y = round(W * 0.03), round(H - s - H * 0.078)
    d.rectangle([x, y, x + s, y + s], fill=(247, 243, 232), outline=(17, 17, 17),
                width=max(3, round(s * 0.045)))
    d.text((x + s / 2, y + s * 0.47), "18+", font=display_font(s * 0.44), fill=(17, 17, 17), anchor="mm")
    d.text((x + s / 2, y + s * 0.74), "ADULTS ONLY", font=text_font(s * 0.115), fill=(17, 17, 17), anchor="mm")
    d.text((x + s / 2, y + s * 0.89), "PALMERA", font=text_font(s * 0.10), fill=(17, 17, 17), anchor="mm")


def draw_barcode(base, title):
    W, H = base.size
    d = ImageDraw.Draw(base)
    bw, bh = round(W * 0.155), round(H * 0.052)
    x, y = W - bw - round(W * 0.03), H - bh - round(H * 0.032)
    d.rectangle([x, y, x + bw, y + bh], fill=(247, 243, 232))
    rng = mulberry32(seed_from_text(title))
    cursor = x + bw * 0.05
    while cursor < x + bw * 0.92:
        bar_w = 1 + int(rng() * 4)
        if rng() > 0.3:
            d.rectangle([cursor, y + bh * 0.10, cursor + bar_w, y + bh * 0.72], fill=(17, 17, 17))
        cursor += bar_w + 2
    d.text((x + bw / 2, y + bh * 0.93), "PALMERA · No. 06", font=text_font(bh * 0.20),
           fill=(17, 17, 17), anchor="ms")


def draw_finish(base):
    W, H = base.size
    alpha = Image.new("L", (W, H), 56)
    da = ImageDraw.Draw(alpha)
    da.ellipse([-W * 0.28, -H * 0.28, W * 1.28, H * 1.28], fill=0)
    alpha = alpha.filter(ImageFilter.GaussianBlur(min(W, H) * 0.16))
    black = Image.new("RGB", (W, H), (10, 4, 16))
    base.paste(black, (0, 0), alpha)


def make_panel(fill, grade, fx=0.5, fy=0.38, zoom=1.0):
    return {"fill": fill, "grade": grade, "fx": fx, "fy": fy, "zoom": zoom}


def photo(i):
    return ("photo", i)


def scene(i):
    return ("scene", i)


def draw_cover(width, height, layout, bucket, panels, title, tagline, photos):
    base = Image.new("RGB", (width, height), INK)
    for poly, panel in zip(layout_panels(layout, bucket), panels):
        draw_panel(base, poly, panel, photos)
    draw_masthead(base, title, tagline)
    draw_badge(base)
    draw_barcode(base, title)
    draw_finish(base)
    return base


# --- the editor shot ------------------------------------------------------------------

def rounded(draw, box, radius, **kwargs):
    draw.rounded_rectangle(box, radius=radius, **kwargs)


def spaced(draw, xy, text, font, fill, spacing=3):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + spacing
    return x - spacing


def grad_image(size, c0, c1):
    return gradient(size, [(0, c0 + (255,)), (1, c1 + (255,))], horizontal=True)


def chip(draw, base, x, y, text, on=False):
    f = text_font(15)
    w = draw.textlength(text, font=f) + 26
    if on:
        g = grad_image((round(w), 30), (255, 94, 58), (255, 46, 136))
        m = Image.new("L", g.size, 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, g.size[0] - 1, g.size[1] - 1], radius=15, fill=255)
        base.paste(g, (round(x), round(y)), m)
        draw = ImageDraw.Draw(base)
        draw.text((x + 13, y + 15), text, font=f, fill=CREAM, anchor="lm")
        return w, draw
    rounded(draw, [x, y, x + w, y + 30], 15, fill=(16, 16, 24), outline=(52, 52, 74), width=1)
    draw.text((x + 13, y + 15), text, font=f, fill=(207, 200, 184), anchor="lm")
    return w, draw


def draw_editor(photos):
    W, H = 1280, 800
    base = Image.new("RGB", (W, H), (11, 11, 16))
    d = ImageDraw.Draw(base)
    # Browser chrome.
    d.rectangle([0, 0, W, 46], fill=(24, 24, 34))
    for i, colour in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([16 + i * 22, 16, 28 + i * 22, 28], fill=colour)
    rounded(d, [300, 9, 980, 37], 13, fill=(11, 11, 16))
    d.text((640, 23), "palmera-cover-studio — app/index.html (local file)",
           font=ui_font(13), fill=(160, 154, 140), anchor="mm")
    # App topbar.
    d.rectangle([0, 46, W, 108], fill=(18, 18, 26))
    bar = grad_image((W, 3), (255, 94, 58), (34, 211, 238))
    base.paste(bar, (0, 105))
    d = ImageDraw.Draw(base)
    mark = grad_image((52, 36), (255, 94, 58), (34, 211, 238))
    m = Image.new("L", mark.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, 51, 35], radius=6, fill=255)
    base.paste(mark, (22, 59))
    d = ImageDraw.Draw(base)
    d.text((48, 77), "P", font=display_font(20), fill=CREAM, anchor="mm")
    d.text((86, 70), "Palmera Cover Studio", font=text_font(21), fill=CREAM, anchor="lm")
    d.text((86, 92), "Your photo + a caption → cover art in the style of GTA 6's posters.",
           font=ui_font(12), fill=(164, 158, 143), anchor="lm")
    btn = grad_image((150, 40), (255, 94, 58), (255, 46, 136))
    m = Image.new("L", btn.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, 149, 39], radius=8, fill=255)
    base.paste(btn, (1108, 57))
    d = ImageDraw.Draw(base)
    d.text((1183, 77), "Export PNG", font=text_font(16), fill=CREAM, anchor="mm")
    d.text((1052, 77), "1080 × 1350 PNG", font=text_font(14), fill=GOLD, anchor="rm")

    rail_x, rail_w = 22, 350

    def card(y, h, heading):
        rounded(d, [rail_x, y, rail_x + rail_w, y + h], 14, fill=(23, 23, 31),
                outline=(38, 38, 51), width=1)
        spaced(d, (rail_x + 16, y + 12), heading, text_font(13), GOLD, spacing=2)
        return y

    def field(y, label, value):
        d.text((rail_x + 16, y), label, font=ui_font(12), fill=(164, 158, 143), anchor="lm")
        rounded(d, [rail_x + 16, y + 7, rail_x + rail_w - 16, y + 41], 9,
                fill=(16, 16, 24), outline=(52, 52, 74), width=1)
        d.text((rail_x + 26, y + 24), value, font=ui_font(14), fill=CREAM, anchor="lm")

    y = card(126, 172, "COVER TEXT")
    field(y + 36, "Title", "Neon Shores")
    field(y + 92, "Tagline", "One last ride down the coast.")
    for cx, label in [(rail_x + 16, "Age badge"), (rail_x + 130, "Barcode & issue mark")]:
        d.rectangle([cx, y + 148, cx + 11, y + 159], outline=(164, 158, 143), width=1)
        d.line([cx + 2, y + 153, cx + 5, y + 157], fill=(255, 46, 136), width=2)
        d.line([cx + 5, y + 157, cx + 10, y + 150], fill=(255, 46, 136), width=2)
        d.text((cx + 17, y + 153), label, font=ui_font(12), fill=(164, 158, 143), anchor="lm")

    y = card(312, 112, "LAYOUT · POST SIZE")
    x = rail_x + 16
    for label, on in [("Showcase", True), ("Mosaic", False), ("Hero Trio", False)]:
        w, d = chip(d, base, x, y + 32, label, on)
        x += w + 7
    x = rail_x + 16
    for label, on in [("Square", False), ("Portrait", True), ("Wide", False)]:
        w, d = chip(d, base, x, y + 72, label, on)
        x += w + 7

    y = card(438, 238, "PANELS")
    x = rail_x + 16
    for i in range(4):
        w, d = chip(d, base, x, y + 32, f"Panel {i + 1}", i == 0)
        x += w + 6
    field(y + 76, "Panel fill", "Photo — the duo & the convertible")
    field(y + 122, "Colour grade", "Sunset")
    for fy in (y + 76, y + 122):
        d.polygon([(rail_x + rail_w - 34, fy + 20), (rail_x + rail_w - 24, fy + 20),
                   (rail_x + rail_w - 29, fy + 27)], fill=(164, 158, 143))
    sy = y + 172
    for label, pct, shown in [("Focus left–right", 50, "50%"), ("Focus up–down", 38, "38%"),
                              ("Zoom", 0, "1.00×")]:
        d.text((rail_x + 16, sy), label, font=ui_font(11), fill=(164, 158, 143), anchor="lm")
        tx0, tx1 = rail_x + 122, rail_x + rail_w - 52
        d.line([tx0, sy, tx1, sy], fill=(52, 52, 74), width=4)
        kx = tx0 + (tx1 - tx0) * pct / 100
        d.ellipse([kx - 7, sy - 7, kx + 7, sy + 7], fill=(255, 46, 136))
        d.text((rail_x + rail_w - 16, sy), shown, font=text_font(12), fill=GOLD, anchor="rm")
        sy += 17

    y = card(690, 100, "PHOTOS")
    names = ["1. Sample photo — the duo & the convertible", "2. Sample photo — neon skyline",
             "3. Sample photo — speedboat", "4. Sample photo — lifeguard tower"]
    for i, name in enumerate(names):
        d.text((rail_x + 16, y + 29 + i * 15), name, font=ui_font(12), fill=(164, 158, 143), anchor="lm")
    d.text((rail_x + 16, y + 90), "+ Add your photo", font=text_font(14), fill=GOLD, anchor="lm")

    # Stage: the live portrait cover.
    cover = draw_cover(1080, 1350, "showcase", "portrait",
                       [make_panel(photo(0), "sunset"), make_panel(photo(3), "gold"),
                        make_panel(scene("skyline"), "clean"), make_panel(photo(2), "clean")],
                       "Neon Shores", "One last ride down the coast.", photos)
    cover = cover.resize((430, 538), Image.LANCZOS)
    shadow = Image.new("RGB", (446, 554), (0, 0, 0))
    base.paste(shadow, (648, 128))
    base.paste(cover, (656, 136))
    d = ImageDraw.Draw(base)
    d.text((879, 700), "Four samples are loaded. Add your own photo, frame the panels, export the PNG.",
           font=ui_font(13), fill=(164, 158, 143), anchor="mm")
    return base


# --- main -----------------------------------------------------------------------------

def save_jpeg(img, path, quality=88):
    while quality >= 58:
        img.save(path, "JPEG", quality=quality)
        if path.stat().st_size <= 262144:
            return quality
        quality -= 6
    return quality


def main():
    photos = [Image.open(SAMPLES / name).convert("RGB")
              for name in ("duo.jpg", "skyline.jpg", "boat.jpg", "beach.jpg")]
    SHOTS.mkdir(exist_ok=True)

    wide = draw_cover(1920, 1080, "showcase", "wide",
                      [make_panel(photo(0), "sunset"), make_panel(photo(1), "clean"),
                       make_panel(scene("sunset"), "clean"), make_panel(photo(2), "gold")],
                      "Neon Shores", "One last ride down the coast.", photos)
    save_jpeg(wide.resize((1280, 720), Image.LANCZOS), SHOTS / "1-cover.jpg")

    save_jpeg(draw_editor(photos), SHOTS / "2-editor.jpg")

    square = draw_cover(1080, 1080, "mosaic", "square",
                        [make_panel(photo(3), "gold"), make_panel(photo(0), "sunset"),
                         make_panel(photo(2), "clean"), make_panel(scene("sunset"), "clean")],
                        "Golden Mile", "Fortune favors the bold.", photos)
    save_jpeg(square, SHOTS / "3-cover-square.jpg")

    portrait = draw_cover(1080, 1350, "mosaic", "portrait",
                          [make_panel(photo(3), "gold"), make_panel(photo(0), "sunset"),
                           make_panel(photo(2), "clean"), make_panel(scene("sunset"), "clean")],
                          "Low Tide", "The shore remembers everything.", photos)
    save_jpeg(portrait.resize((1024, 1280), Image.LANCZOS), SHOTS / "4-cover-portrait.jpg")

    for path in sorted(SHOTS.iterdir()):
        img = Image.open(path)
        print(f"{path.name}: {img.size[0]}x{img.size[1]}, {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
