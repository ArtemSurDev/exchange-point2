"""
Run this script once to download DejaVu fonts for PDF generation.
Usage: python download_fonts.py
"""
import urllib.request
import os

FONTS_DIR = os.path.dirname(os.path.abspath(__file__))

FONTS = {
    "DejaVuSans.ttf": "https://github.com/dejavu-fonts/dejavu-fonts/raw/version_2_37/ttf/DejaVuSans.ttf",
    "DejaVuSans-Bold.ttf": "https://github.com/dejavu-fonts/dejavu-fonts/raw/version_2_37/ttf/DejaVuSans-Bold.ttf",
}

if __name__ == "__main__":
    for name, url in FONTS.items():
        path = os.path.join(FONTS_DIR, name)
        if os.path.exists(path):
            print(f"Already exists: {name}")
            continue
        print(f"Downloading {name} ...")
        urllib.request.urlretrieve(url, path)
        print(f"  Saved ({os.path.getsize(path):,} bytes)")
    print("Done.")
