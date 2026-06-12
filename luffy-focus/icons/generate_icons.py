"""
Generate pixel-art Luffy straw hat icons for the extension.
Requires: pip install Pillow
"""

from PIL import Image, ImageDraw


def draw_straw_hat_pixel(draw, size, cx, cy, r):
    """Draw a simple pixel-art straw hat: a gold circle shape with
    a subtle darker inner hat-crown pattern."""
    GOLD = (252, 188, 11)       # #fcbc0b
    DARK_GOLD = (210, 150, 20)   # slightly darker for crown shading

    # --- Brim ring (outer gold circle) ---
    # At small sizes this is done with a filled ellipse in gold.
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            d_sq = dx * dx + dy * dy
            if d_sq <= r * r:
                draw.point((x, y), fill=GOLD)

    # --- Hat crown: a darker inner circle hinted at ---
    crown_r = max(r // 2, 1)
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            d_sq = dx * dx + dy * dy
            if d_sq <= crown_r * crown_r:
                draw.point((x, y), fill=DARK_GOLD)

    # Add a simple cross-hatch on the crown for straw texture (only on 48, 128)
    if r >= 10:
        for y in range(size):
            for x in range(size):
                dx = x - cx
                dy = y - cy
                d_sq = dx * dx + dy * dy
                if d_sq < crown_r * crown_r:
                    # simple cross pattern
                    if (x + y) % 4 == 0:
                        draw.point((x, y), fill=GOLD)


def make_icon(pixels, out_path):
    """Create a pixel-art icon with red background, charcoal border,
    and gold straw-hat in the centre."""
    RED = (228, 16, 0)         # #e41000
    CHARCOAL = (24, 28, 32)    # #181c20

    img = Image.new("RGB", (pixels, pixels), RED)
    draw = ImageDraw.Draw(img)

    # --- Charcoal border ---
    # Border thickness proportional to icon size
    border = max(1, pixels // 32)
    for y in range(pixels):
        for x in range(pixels):
            if x < border or x >= pixels - border or y < border or y >= pixels - border:
                draw.point((x, y), fill=CHARCOAL)

    # --- Gold straw hat ---
    cx = pixels // 2
    cy = pixels // 2
    r = (pixels // 2) - border - 2  # leave some red gap between border and hat
    if r < 1:
        r = 1

    draw_straw_hat_pixel(draw, pixels, cx, cy, r)

    img.save(out_path, "PNG")
    print(f"Created {out_path} ({pixels}x{pixels})")


if __name__ == "__main__":
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    make_icon(16, os.path.join(script_dir, "icon16.png"))
    make_icon(48, os.path.join(script_dir, "icon48.png"))
    make_icon(128, os.path.join(script_dir, "icon128.png"))
    print("Done!")
