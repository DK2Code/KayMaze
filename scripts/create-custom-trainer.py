"""Build original pixel art locally: 16x32 cells, nine frames, transparent PNGs.

The pixel maps below are authored for KayMaze, not recolored source sprites.
Frames use the same feet anchor and directional order as the other trainers.
Run with Python and Pillow; no downloads or external services are used.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/assets/world'
META = {'file': 'trainer-kayden.png', 'width': 16, 'height': 32, 'frames': 9}
CREDIT = '\nKayden: original KayMaze pixel art, authored in scripts/create-custom-trainer.py. Black hair, sky-blue T-shirt, nine directional walking frames; no external source image.\n'
PALETTE = {
    '.': (0, 0, 0, 0), 'o': '#202331', 'k': '#252934', 'h': '#414856',
    's': '#f2bd8b', 't': '#cf886c', 'w': '#fff0d5', 'e': '#303342',
    'B': '#bceeff', 'b': '#72c7ed', 'c': '#3996c6',
    'D': '#3d526d', 'd': '#27384f', 'W': '#e2edf3',
}
# Each row sits on the same 14-pixel drawing grid inside a 16-pixel cell.
FRONT = [
    '.....oo.......', '...ookkoo.....', '..okkkkkkoo...', '.okkhhkkkkko..',
    '.okkkkkkkkko..', 'okkkkskkkskko.', 'oksssssssskko.', '.oswesswesko..',
    '.osssssssso...', '..otssssto....', '...ottttoo....',
]
BACK = [
    '.....oo.......', '...ookkoo.....', '..okkkkkkoo...', '.okkhhkkkkko..',
    '.okkkkkkkkko..', 'okkkkkkkkkkko.', 'okkkkkkkkkkko.', '.okkkkkkkkko..',
    '.okkkkkkkkko..', '..okkkkkkko...', '...ottttoo....',
]
SIDE = [
    '.....oo.......', '...ookkoo.....', '..okkkkkkoo...', '.okkhhkkkkko..',
    '.okkkkkkkkko..', '.okksskkkkko..', '.osssskkkkko..', 'oswessskkkko..',
    '.osssstkkko...', '..osstttko....', '...ottttoo....',
]
FRONT_BODY = [
    '..oBbbbbBbo...', '.oBbbbbbbbBo..', '.osobbbbboso..', '.otocbbbcoto..',
    '..oDddddDo....', '...oDooDo.....', '..oDDooDDo....', '..oWWooWWo....',
    '...oo..oo.....',
]
BACK_BODY = [
    '..oBbbbbBbo...', '.oBbbbbbbbBo..', '.osobbbbboso..', '.otocbbbcoto..',
    '..oDddddDo....', '...oDooDo.....', '..oDDooDDo....', '..oWWooWWo....',
    '...oo..oo.....',
]
SIDE_BODY = [
    '...oBbbbbo....', '..oBbbBbbco...', '..ocbBsbbco...', '...ocstbco....',
    '...oDddDo.....', '...oDddDo.....', '..oDDdDo......', '..oWWWWo......',
    '...oooo.......',
]
WALK_FRONT = [
    ['..oBbbbbBbo...', '.osbbbbbbbBo..', '.otobbbbboso..', '..ocbbbcoto...',
     '..oDddddDo....', '..oDDooDo.....', '..oWWooDDo....', '...oo.oWWo....', '.......oo.....'],
    ['..oBbbbbBbo...', '.oBbbbbbbbso..', '.osobbbbboto..', '.otocbbbco....',
     '..oDddddDo....', '...oDooDDo....', '..oDDooWWo....', '..oWWo.oo.....', '...oo.........'],
]
WALK_SIDE = [
    ['...oBbbbbo....', '..oBbbbbco....', '.osBbBbbco....', '.otoctbco.....',
     '...oDddDo.....', '..oDDoodDo....', '.oWWo..oDo....', '..oo...oWWo...', '........oo....'],
    ['...oBbbbbo....', '..oBbbBbco....', '..ocbbBsso....', '...ocbbtto....',
     '...oDddDo.....', '..oDDoodDo....', '..oDo..oWWo...', '.oWWo...oo....', '..oo..........'],
]


def make_frame(head, body):
    image = Image.new('RGBA', (16, 32))
    rows = head + body
    assert len(rows) == 20
    for y, row in enumerate(rows, 11):
        assert len(row) <= 14, (y, row)
        for x, color in enumerate(row, 1):
            image.putpixel((x, y), Image.new('RGBA', (1, 1), PALETTE[color]).getpixel((0, 0)))
    return image


def build():
    frames = [make_frame(FRONT, FRONT_BODY), make_frame(BACK, BACK_BODY), make_frame(SIDE, SIDE_BODY)]
    frames += [make_frame(FRONT, body) for body in WALK_FRONT]
    frames += [make_frame(BACK, body) for body in WALK_FRONT]
    frames += [make_frame(SIDE, body) for body in WALK_SIDE]
    sheet = Image.new('RGBA', (144, 32))
    for i, frame in enumerate(frames):
        sheet.alpha_composite(frame, (i * 16, 0))
    sheet.save(OUT / META['file'])
    frames[0].save(OUT / 'portrait-kayden.png')


def register():
    atlas = json.loads((OUT / 'atlas.json').read_text())
    atlas['trainer-kayden'] = META
    (OUT / 'atlas.json').write_text(json.dumps(atlas, indent=2) + '\n')
    (ROOT / 'dist/world-data.mjs').write_text('export const WORLD_ART = ' + json.dumps(atlas, separators=(',', ':')) + ';\n')
    manifest = json.loads((OUT / 'sources.json').read_text())
    for name in [META['file'], 'portrait-kayden.png']:
        manifest['outputs'][name] = hashlib.sha256((OUT / name).read_bytes()).hexdigest()
    (OUT / 'sources.json').write_text(json.dumps(manifest, indent=2) + '\n')
    credits = (OUT / 'CREDITS.txt').read_text()
    if CREDIT.strip() not in credits:
        (OUT / 'CREDITS.txt').write_text(credits + CREDIT)


if __name__ == '__main__':
    build()
    register()
    print('Built and registered the original Kayden trainer: nine 16x32 frames.')
