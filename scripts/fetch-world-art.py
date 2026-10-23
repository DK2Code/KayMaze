"""Fetch only the referenced overworld art from the public pret source repositories."""
import json, urllib.request, hashlib, concurrent.futures
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'art-source'/'world'
DEST.mkdir(parents=True,exist_ok=True)
def request(url):
    req=urllib.request.Request(url,headers={'User-Agent':'KayMaze-art-import'})
    with urllib.request.urlopen(req,timeout=30) as r:return r.read()
def inventory(repo):
    path=DEST/(repo+'-tree.json')
    if not path.exists():path.write_bytes(request(f'https://api.github.com/repos/pret/{repo}/git/trees/master?recursive=1'))
    return json.loads(path.read_text())
def acquire(repo,sha,path):
    dest=DEST/repo/path
    url=f'https://raw.githubusercontent.com/pret/{repo}/{sha}/{path}'
    if not dest.exists():
        data=request(url);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
    return {'repository':repo,'commit':sha,'path':path,'url':url,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
trees={repo:inventory(repo) for repo in ['pokeemerald','pokefirered']}
config=ROOT/'scripts'/'world-art-files.json'
if not config.exists():
    for repo,tree in trees.items():
        print(repo,tree['sha'])
        for item in tree['tree']:
            p=item['path']
            if ('tilesets/' in p and (p.endswith('tiles.png') or p.endswith('metatiles.bin'))) or ('object_events/pics/people/' in p and any(n in p for n in ['red','leaf','brendan','may','misty','brock','sabrina','blue','rival'])):print(p)
else:
    jobs=[(repo,trees[repo]['sha'],path) for repo,paths in json.loads(config.read_text()).items() for path in paths]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        manifest=list(pool.map(lambda job:acquire(*job),jobs))
    (DEST/'sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'Fetched {len(manifest)} pinned source files into {DEST}.')
