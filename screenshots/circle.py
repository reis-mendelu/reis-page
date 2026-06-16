#!/usr/bin/env python3
"""
circle.py - draw a clean, professional lime-green highlight ellipse around a
UI target.

Style: a single crisp, even-weight lime outline, RGB(121,190,21), rendered with
4x supersampling for smooth anti-aliased edges, plus one tight low-alpha halo
for legibility on busy backgrounds. Deliberately simple - no fat fuzzy glow.

Targeting modes:
  --auto-blue          Auto-detect a solid Firefox-blue button (largest
                       contiguous blue region) and circle it.
  --bbox x0,y0,x1,y1   Circle an explicit bounding box (for text links etc.).

Other options:
  --erase-lime         Before drawing, repaint existing lime ring pixels with
                       the nearest non-lime background colour, so a freshly
                       drawn ellipse does not stack on top of an old one.
  --erase-region x0,y0,x1,y1
                       Like --erase-lime but only inside this box, so other
                       green UI (logos, badges, icons) outside it is preserved.
  --pad-x FLOAT        Horizontal padding as fraction of bbox width (default .08)
  --pad-y INT          Vertical padding in px beyond the bbox (auto if omitted)
  --stroke INT         Main stroke width in px (default scales to image width)

Usage examples:
  python3 circle.py in.png out.png --auto-blue --erase-lime
  python3 circle.py in.png out.png --bbox 1974,392,2613,487
  python3 circle.py in.png out.png --bbox 164,580,467,593 \\
          --erase-region 70,548,1000,648 --pad-y 22
"""
import argparse, sys
from collections import deque
from PIL import Image, ImageDraw, ImageFilter

LIME = (121, 190, 21)

def detect_blue_button(im):
    px = im.load(); w, h = im.size
    def is_btn(r, g, b):
        return b > 180 and r < 90 and 60 < g < 170 and (b - r) > 110 and (b - g) > 40
    mask = bytearray(w * h)
    for y in range(h):
        row = y * w
        for x in range(w):
            r, g, b = px[x, y]
            if is_btn(r, g, b):
                mask[row + x] = 1
    seen = bytearray(w * h)
    best = None; bestsz = 0
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if mask[i] and not seen[i]:
                q = deque([(x, y)]); seen[i] = 1
                minx = maxx = x; miny = maxy = y; sz = 0
                while q:
                    cx, cy = q.popleft(); sz += 1
                    if cx < minx: minx = cx
                    if cx > maxx: maxx = cx
                    if cy < miny: miny = cy
                    if cy > maxy: maxy = cy
                    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            j = ny * w + nx
                            if mask[j] and not seen[j]:
                                seen[j] = 1; q.append((nx, ny))
                if sz > bestsz:
                    bestsz = sz; best = (minx, miny, maxx, maxy)
    if best is None:
        sys.exit("ERROR: no blue button region detected")
    return best

def is_lime(r, g, b):
    return abs(r - 121) < 60 and abs(g - 190) < 60 and b < 100 and g > r and g > b

def is_green_cast(r, g, b):
    """Any pixel touched by an old lime ring - its solid core, its soft green
    halo on light backgrounds, and the teal blend it leaves on a blue button.
    Only safe inside a region known to contain no real green/teal content
    (white bg / solid button blue / dark text)."""
    if g > r + 8 and g > b + 8:          # green halo on light background
        return True
    # teal: lime mixed into button blue, e.g. (43,129,152) vs pure (0,96,223)
    return g > r + 8 and b > g and b < 200 and r < 120


def erase_lime(im, region=None):
    """Repaint lime-ish pixels with the nearest non-lime background colour.

    If region (x0,y0,x1,y1) is given, only pixels inside it are touched (so
    green logos/badges/icons elsewhere are left untouched) AND any green-cast
    pixel is removed, so the soft halo of a previous ring is cleared too.
    """
    px = im.load(); w, h = im.size
    if region is None:
        rx0, ry0, rx1, ry1 = 0, 0, w, h
        match = is_lime
    else:
        rx0, ry0, rx1, ry1 = region
        rx0 = max(0, rx0); ry0 = max(0, ry0)
        rx1 = min(w, rx1); ry1 = min(h, ry1)
        match = is_green_cast
    targets = []
    for y in range(ry0, ry1):
        for x in range(rx0, rx1):
            r, g, b = px[x, y]
            if match(r, g, b):
                targets.append((x, y))
    # Repaint each matched pixel from the MEDIAN of the first clean (non-matched)
    # neighbour found in each of the four directions. Median over four samples
    # lets the real background (white / button blue) outvote the odd dark text
    # glyph a horizontal scan might land on - so no smeared streaks.
    src = im.copy(); spx = src.load()
    tset = set(targets)

    def first_clean(x, y, dx, dy):
        cx, cy = x + dx, y + dy
        while 0 <= cx < w and 0 <= cy < h:
            if (cx, cy) not in tset:
                r, g, b = spx[cx, cy]
                if not match(r, g, b):
                    return (r, g, b)
            cx += dx; cy += dy
        return None

    for (x, y) in targets:
        samples = [s for s in (
            first_clean(x, y, 1, 0), first_clean(x, y, -1, 0),
            first_clean(x, y, 0, 1), first_clean(x, y, 0, -1),
        ) if s is not None]
        if not samples:
            px[x, y] = (255, 255, 255)
        else:
            chans = tuple(sorted(s[c] for s in samples)[len(samples) // 2]
                          for c in range(3))
            px[x, y] = chans
    return len(targets)

def draw_ellipse(im, bbox, pad_x_frac, pad_y, stroke):
    w, h = im.size
    x0, y0, x1, y1 = bbox
    bw = x1 - x0; bh = y1 - y0
    px_pad = int(round(bw * pad_x_frac))
    if pad_y is None:
        # clear the element vertically, but keep a pleasant ellipse roundness
        # for wide, thin targets (e.g. a single line of link text)
        pad_y = max(int(round(bh * 0.55)), int(round(bw * 0.05)))
    ex0 = x0 - px_pad; ex1 = x1 + px_pad
    ey0 = y0 - pad_y;  ey1 = y1 + pad_y
    ebox = (ex0, ey0, ex1, ey1)
    if stroke is None:
        # restrained, even weight: ~6px on a 1080-wide phone screenshot
        stroke = max(6, int(round(w / 220)))

    # Everything is drawn at 4x then downscaled, so the curved stroke gets real
    # anti-aliasing instead of PIL's jagged single-pass ellipse edge.
    SS = 4
    sw, sh = w * SS, h * SS
    sbox = tuple(v * SS for v in ebox)

    layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)

    # One tight, low-alpha halo for separation from busy backgrounds. Kept close
    # to the main ring (not a fat blurry glow) so the mark still reads as simple.
    halo = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hd.ellipse(sbox, outline=LIME + (90,), width=(stroke + 4) * SS)
    halo = halo.filter(ImageFilter.GaussianBlur(stroke * 0.6 * SS))
    layer.alpha_composite(halo)

    # Crisp main stroke on top.
    ld = ImageDraw.Draw(layer)
    ld.ellipse(sbox, outline=LIME + (255,), width=stroke * SS)

    layer = layer.resize((w, h), Image.LANCZOS)
    base = im.convert("RGBA")
    base.alpha_composite(layer)
    return base.convert("RGB"), ebox, (px_pad, pad_y, stroke)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp"); ap.add_argument("out")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--auto-blue", action="store_true")
    g.add_argument("--bbox", type=str)
    ap.add_argument("--erase-lime", action="store_true")
    ap.add_argument("--erase-region", type=str, default=None)
    ap.add_argument("--pad-x", type=float, default=0.08)
    ap.add_argument("--pad-y", type=int, default=None)
    ap.add_argument("--stroke", type=int, default=None)
    a = ap.parse_args()

    im = Image.open(a.inp).convert("RGB")
    if a.bbox:
        bbox = tuple(int(v) for v in a.bbox.split(","))
        if len(bbox) != 4:
            sys.exit("ERROR: --bbox needs x0,y0,x1,y1")
    else:
        bbox = detect_blue_button(im)
    print("TARGET bbox:", bbox, "center",
          ((bbox[0]+bbox[2])//2, (bbox[1]+bbox[3])//2))

    if a.erase_region:
        region = tuple(int(v) for v in a.erase_region.split(","))
        if len(region) != 4:
            sys.exit("ERROR: --erase-region needs x0,y0,x1,y1")
        n = erase_lime(im, region)
        print("ERASED lime pixels in region", region, ":", n)
    elif a.erase_lime:
        n = erase_lime(im)
        print("ERASED lime pixels:", n)

    out, ebox, meta = draw_ellipse(im, bbox, a.pad_x, a.pad_y, a.stroke)
    out.save(a.out)
    print("ELLIPSE bbox:", ebox, "center",
          ((ebox[0]+ebox[2])//2, (ebox[1]+ebox[3])//2))
    print("padX,padY,stroke:", meta)
    print("saved:", a.out)

if __name__ == "__main__":
    main()
