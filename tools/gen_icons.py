"""Generate PWA icons: dark rounded tile with an ember-orange dumbbell."""
from PIL import Image, ImageDraw

BG = (11, 13, 16, 255)
ACCENT = (255, 90, 45, 255)
STEEL = (238, 242, 246, 255)


def rounded(draw, xy, radius, fill):
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def make(size, corner_frac=0.18, opaque=True):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * corner_frac)
    rounded(d, (0, 0, size - 1, size - 1), r, BG)

    s = size / 512.0
    cy = size / 2
    # bar
    rounded(d, (90 * s, cy - 16 * s, 422 * s, cy + 16 * s), 16 * s, STEEL)
    # plates (outer + inner on each side)
    for x0, x1, h in [(118, 168, 150), (178, 218, 110), (294, 334, 110), (344, 394, 150)]:
        rounded(d, (x0 * s, cy - h * s, x1 * s, cy + h * s), 22 * s, ACCENT)
    if opaque:
        base = Image.new("RGBA", (size, size), BG)
        base.alpha_composite(img)
        # keep rounded corners transparent for non-apple icons
        mask = Image.new("L", (size, size), 0)
        md = ImageDraw.Draw(mask)
        md.rounded_rectangle((0, 0, size - 1, size - 1), radius=r, fill=255)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(base, (0, 0), mask)
        return out
    return img


make(512).save("public/icon-512.png")
make(192).save("public/icon-192.png")
# iOS composites its own corner mask — give it a full-bleed square
img = Image.new("RGBA", (180, 180), BG)
img.alpha_composite(make(180, corner_frac=0.0))
img.convert("RGB").save("public/icon-180.png")
print("icons written")
