"""Decode GBA 8x8 tile references, palettes, flips and layers into browser atlases.

This is an asset format conversion: the source art stays untouched and all
downloaded inputs are pinned and hashed by fetch-world-art.py.
"""
from pathlib import Path
import json,struct,hashlib
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'art-source/world';OUT=ROOT/'dist/assets/world';QA=ROOT/'qa/world'
OUT.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
overlays={}
def palette(path):return [tuple(map(int,line.split())) for line in path.read_text().splitlines()[3:19]]
def pack_set(repo,secondary,name):
    primary=SRC/repo/'data/tilesets/primary/general'
    sec=SRC/repo/'data/tilesets/secondary'/secondary if secondary else None
    base_count=512 if repo=='pokeemerald' else 640
    base_pals=6 if repo=='pokeemerald' else 7
    palettes=[palette((sec if sec and i>=base_pals else primary)/f'palettes/{i:02}.pal') for i in range(13)]
    a=Image.open(primary/'tiles.png');b=Image.open(sec/'tiles.png') if sec else None
    raw=((sec or primary)/'metatiles.bin').read_bytes()
    words=struct.unpack('<'+'H'*(len(raw)//2),raw)
    count=len(words)//8;atlas=Image.new('RGBA',(16*16,((count+15)//16)*16));objects=Image.new('RGBA',atlas.size);cache={}
    def subtile(code):
        if code in cache:return cache[code]
        tile=code&1023;pid=code>>12;image=b if tile>=base_count else a;tile=tile-base_count if tile>=base_count else tile
        result=Image.new('RGBA',(8,8))
        if image is not None:
            cols=image.width//8;xx=tile%cols*8;yy=tile//cols*8
            if yy<image.height:
                pixels=[]
                for y in range(8):
                    for x in range(8):
                        idx=image.getpixel((xx+x,yy+y));pixels.append(palettes[pid][idx]+(255 if idx else 0,))
                result.putdata(pixels)
        if code&1024:result=result.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        if code&2048:result=result.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        cache[code]=result;return result
    for i in range(count):
        tile=Image.new('RGBA',(16,16));overlay=Image.new('RGBA',(16,16))
        for j,code in enumerate(words[i*8:i*8+8]):
            xy=((j%2)*8,((j%4)//2)*8);tile.alpha_composite(subtile(code),xy)
            if j>=4:overlay.alpha_composite(subtile(code),xy)
        atlas.alpha_composite(tile,((i%16)*16,(i//16)*16))
        objects.alpha_composite(overlay,((i%16)*16,(i//16)*16))
    overlays[name]=objects
    atlas.save(OUT/f'{name}.png')
    for page in range((count+127)//128):
        board=Image.new('RGB',(16*48,8*58),'#ddd8c8');draw=ImageDraw.Draw(board)
        for n in range(128):
            i=page*128+n
            if i>=count:break
            x=n%16*48;y=n//16*58
            im=atlas.crop(((i%16)*16,(i//16)*16,(i%16+1)*16,(i//16+1)*16)).resize((48,48),Image.Resampling.NEAREST)
            board.paste(im,(x,y),im);draw.text((x+2,y+47),str(i),fill='#242424')
        board.save(QA/f'{name}-{page}.png')
    print(name,count)
    return count
metadata={}
for repo,secondary,name in [('pokeemerald',None,'outdoors'),('pokeemerald','cave','cavern'),('pokefirered','seafoam_islands','frozen')]:metadata[name]={'file':name+'.png','tileSize':16,'columns':16,'count':pack_set(repo,secondary,name)}
# The Route 101 layout uses three rows for an isolated broadleaf tree.
# Remove its grass palette so canopies can overlap paths and autumn ground.
outdoors=Image.open(OUT/'outdoors.png')
grass_colors=set(outdoors.crop((16,0,32,16)).getdata())
tree=Image.new('RGBA',(32,48))
for n,i in enumerate([462,463,470,471,486,487]):
    tree.alpha_composite(outdoors.crop((i%16*16,i//16*16,i%16*16+16,i//16*16+16)),(n%2*16,n//2*16))
tree.putdata([(r,g,b,0 if (r,g,b,a) in grass_colors else a) for r,g,b,a in tree.getdata()])
tree.save(OUT/'forest-tree.png')
metadata['forest-tree']={'file':'forest-tree.png','width':32,'height':48}
# Preserve native object pixels and transparency; do not include the terrain's
# ground layer when extracting breakable crystals, ice, and thorn foliage.
def object_image(path):
    indexed=Image.open(path);rgba=indexed.convert('RGBA')
    rgba.putdata([(r,g,b,0 if index==0 else 255) for (r,g,b,a),index in zip(rgba.getdata(),indexed.getdata())])
    return rgba
def object_tile(name,i):return overlays[name].crop((i%16*16,i//16*16,i%16*16+16,i//16*16+16))
def terrain_tile(name,i):
    atlas=Image.open(OUT/f'{name}.png');return atlas.crop((i%16*16,i//16*16,i%16*16+16,i//16*16+16))
thorn_leaves=terrain_tile('outdoors',13)
thorn_leaves.putdata([(r,g,b,0 if (r,g,b,a) in grass_colors else a) for r,g,b,a in thorn_leaves.getdata()])
crystal_shard=terrain_tile('cavern',286)
crystal_shard.putdata([(r,g,b,a if (b>r and b>g*1.05) or (r>210 and g>210 and b>230) else 0) for r,g,b,a in crystal_shard.getdata()])
crystal=Image.new('RGBA',(24,24))
crystal.alpha_composite(crystal_shard,(5,0));crystal.alpha_composite(crystal_shard.transpose(Image.Transpose.FLIP_LEFT_RIGHT),(0,8));crystal.alpha_composite(crystal_shard,(8,8))
obstacles={
    'tree':tree.copy(),
    'rock':object_image(SRC/'pokeemerald/graphics/object_events/pics/misc/breakable_rock.png').crop((0,0,16,16)),
    'thorns':thorn_leaves,
    'crystal':crystal,
    'ice':object_tile('frozen',2)
}
for name,im in obstacles.items():
    im.save(OUT/f'obstacle-{name}.png');metadata['obstacle-'+name]={'file':f'obstacle-{name}.png','width':im.width,'height':im.height}
trainers={'red':('pokefirered','red_normal.png'),'leaf':('pokefirered','green_normal.png'),'blue':('pokefirered','blue.png'),'misty':('pokefirered','misty.png'),'brock':('pokefirered','brock.png'),'sabrina':('pokefirered','sabrina.png'),'brendan':('pokeemerald','brendan/walking.png'),'may':('pokeemerald','may/walking.png')}
for name,(repo,path) in trainers.items():
    original=Image.open(SRC/repo/'graphics/object_events/pics/people'/path)
    image=original.convert('RGBA');pixels=list(image.getdata());indices=list(original.getdata());image.putdata([(r,g,b,0 if idx==0 else 255) for (r,g,b,a),idx in zip(pixels,indices)])
    image.save(OUT/f'trainer-{name}.png')
    portrait=image.crop((0,0,16,32));portrait.save(OUT/f'portrait-{name}.png')
    metadata['trainer-'+name]={'file':f'trainer-{name}.png','width':16,'height':32,'frames':image.width//16}
(OUT/'atlas.json').write_text(json.dumps(metadata,indent=2)+'\n')
(ROOT/'dist/world-data.mjs').write_text('export const WORLD_ART = '+json.dumps(metadata,separators=(',',':'))+';\n')
sources=json.loads((SRC/'sources.json').read_text());(OUT/'sources.json').write_text(json.dumps({'sources':sources,'outputs':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.glob('*.png')}},indent=2)+'\n')
(OUT/'CREDITS.txt').write_text('KayMaze overworld art\n\nTrainer sprites and terrain tile artwork: Pokemon Emerald and Pokemon FireRed, sourced from the pret/pokeemerald and pret/pokefirered decompilation projects.\nOriginal artwork belongs to Nintendo, Game Freak, and The Pokemon Company. This is an unofficial noncommercial fan project.\n\nRepository links:\nhttps://github.com/pret/pokeemerald\nhttps://github.com/pret/pokefirered\n\nEvery source URL, commit and SHA-256 hash is preserved in sources.json. The pack script decodes source metatile references, palette indices, layer order and flips; transparent palette index zero is preserved. Trainer pixels are unaltered, with index zero made transparent. KayMaze composes these tiles into its own procedural mazes.\n')
# Keep the original custom trainer when rebuilding the imported asset family.
import runpy
runpy.run_path(str(ROOT / 'scripts/create-custom-trainer.py'), run_name='__main__')
