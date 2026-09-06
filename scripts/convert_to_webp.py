"""
Convert all PNG tiles in images/ to WebP (600px wide, quality 82).
Run once; skip files that already have a .webp counterpart.

Usage:
  python scripts/convert_to_webp.py
"""

import os
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent.parent / "images"
TARGET_WIDTH = 600
QUALITY = 82


def convert(png_path: Path) -> None:
    webp_path = png_path.with_suffix(".webp")
    if webp_path.exists():
        return

    with Image.open(png_path) as img:
        w, h = img.size
        if w > TARGET_WIDTH:
            new_h = round(h * TARGET_WIDTH / w)
            img = img.resize((TARGET_WIDTH, new_h), Image.LANCZOS)

        # RGBA → RGB for WebP (WebP supports alpha but RGB is smaller when alpha is unused)
        if img.mode == "RGBA":
            # Check if alpha channel is meaningful (all 255 → no alpha needed)
            extrema = img.getextrema()
            alpha_min = extrema[3][0] if len(extrema) > 3 else 255
            if alpha_min == 255:
                img = img.convert("RGB")

        img.save(webp_path, "WEBP", quality=QUALITY, method=6)
    print(f"  {png_path.name}  ->  {webp_path.name}  ({webp_path.stat().st_size // 1024} KB)")


def main():
    if not ROOT.is_dir():
        print(f"ERROR: images directory not found at {ROOT}", file=sys.stderr)
        sys.exit(1)

    letter_dirs = sorted(d for d in ROOT.iterdir() if d.is_dir())
    total = 0
    converted = 0

    for letter_dir in letter_dirs:
        pngs = sorted(letter_dir.glob("*.png"))
        if not pngs:
            continue
        print(f"\n[{letter_dir.name}]")
        for png in pngs:
            total += 1
            before_webp = png.with_suffix(".webp")
            if before_webp.exists():
                print(f"  {png.name}  ->  already exists, skipping")
                continue
            convert(png)
            converted += 1

    print(f"\nDone. Converted {converted}/{total} images.")


if __name__ == "__main__":
    main()
