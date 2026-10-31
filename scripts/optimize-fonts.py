"""Lossless WOFF2 conversion, retaining source TTF files. Needs fonttools + brotli."""
from pathlib import Path
import sys

root = Path(__file__).resolve().parent.parent
local_tools = root / '.tools' / 'font-converter'
if local_tools.exists():
    sys.path.insert(0, str(local_tools))
from fontTools.ttLib import TTFont

before = after = 0
for source in (root / 'public' / 'assets' / 'fonts').glob('*.ttf'):
    font = TTFont(source)
    font.flavor = 'woff2'
    destination = source.with_suffix('.woff2')
    font.save(destination)
    before += source.stat().st_size
    after += destination.stat().st_size
print(f'Fonts: {before:,} -> {after:,} bytes ({100 * (1-after/before):.1f}% smaller).')
