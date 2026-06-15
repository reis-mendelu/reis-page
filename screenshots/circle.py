#!/usr/bin/env python3
"""
circle.py - draw an accurate lime-green highlight ellipse around a UI target.

Style matches the reference desktop-chrome screenshots:
  lime-green outline ellipse, RGB(121,190,21), crisp stroke + subtle glow.

Targeting modes:
  --auto-blue          Auto-detect a solid Firefox-blue button (largest
                       contiguous blue region) and circle it.
  --bbox x0,y0,x1,y1   Circle an explicit bounding box (for text links etc.).

Other options:
  --erase-lime         Before drawing, repaint existing lime ring pixels with
                       the median surrounding background colour, so a freshly
                       drawn ellipse does not stack on top of an old one.
  --pad-x FLOAT        Horizontal padding as fraction of bbox width (default .08)
  --pad-y INT          Vertical padding in px beyond the bbox (auto if omitted)
  --stroke INT         Main stroke width in px (default scales to image width)

Usage examples:
  python3 circle.py in.png out.png --auto-blue --erase-lime
  python3 circle.py in.png out.png --bbox 1974,392,2613,487
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

def erase_lime(im):
    """Repaint lime-ish pixels with the nearest non-lime background colour."""
    px = im.load(); w, h = im.size
    targets = []
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if is_lime(r, g, b):
                targets.append((x, y))
    # Replace each lime pixel with a sampled clean pixel from the same row,
    # scanning outward horizontally for the first non-lime neighbour.
    for (x, y) in targets:
        rep = None
        for d in range(1, w):
            xr = x + d
            if xr < w:
                r, g, b = px[xr, y]
                if not is_lime(r, g, b):
                    rep = (r, g, b); break
            xl = x - d
            if xl >= 0:
                r, g, b = px[xl, y]
                if not is_lime(r, g, b):
                    rep = (r, g, b); break
        if rep is None:
            rep = (255, 255, 255)
        px[x, y] = rep
    return len(targets)

def draw_ellipse(im, bbox, pad_x_frac, pad_y, stroke):
    w, h = im.size
    x0, y0, x1, y1 = bbox
    bw = x1 - x0; bh = y1 - y0
    px_pad = int(round(bw * pad_x_frac))
    if pad_y is None:
        # just enough to clear the element: ~55% of its half-height
        pad_y = int(round(bh * 0.55))
    ex0 = x0 - px_pad; ex1 = x1 + px_pad
    ey0 = y0 - pad_y;  ey1 = y1 + pad_y
    ebox = (ex0, ey0, ex1, ey1)
    if stroke is None:
        stroke = max(8, int(round(w / 250)))  # ~11px on a 2694-wide image

    # Subtle outer glow: drawn on a separate layer, lightly blurred, low alpha.
    glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(ebox, outline=LIME + (110,), width=stroke + 10)
    glow = glow.filter(ImageFilter.GaussianBlur(stroke * 0.9))
    base = im.convert("RGBA")
    base.alpha_composite(glow)

    # Crisp main stroke on top.
    d = ImageDraw.Draw(base)
    d.ellipse(ebox, outline=LIME + (255,), width=stroke)
    return base.convert("RGB"), ebox, (px_pad, pad_y, stroke)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp"); ap.add_argument("out")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--auto-blue", action="store_true")
    g.add_argument("--bbox", type=str)
    ap.add_argument("--erase-lime", action="store_true")
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

    if a.erase_lime:
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
