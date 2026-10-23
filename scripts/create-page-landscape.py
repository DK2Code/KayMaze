"""Draw KayMaze's continuous, original webpage landscape using only local Python.

The single SVG is shared by desktop and mobile. It contains no linked assets,
fonts, scripts, or animation; changing its crop never changes its proportions.
"""
from pathlib import Path
import math
import random

ROOT = Path(__file__).resolve().parents[1]
rng = random.Random(4175)
parts = ['''<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1440" viewBox="0 0 1920 1440">
<title>KayMaze — the quiet valley</title>
<desc>A single continuous pixel landscape: morning sky, distant blue mountains, wooded hills, a winding stream, and a sunlit meadow.</desc>
<defs>
 <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#d9edf7"/><stop offset=".62" stop-color="#f5f9ec"/><stop offset="1" stop-color="#e5edcc"/></linearGradient>
 <radialGradient id="sunlight"><stop stop-color="#fff9d9" stop-opacity=".9"/><stop offset="1" stop-color="#fff9d9" stop-opacity="0"/></radialGradient>
 <linearGradient id="meadow" x2="0" y2="1"><stop stop-color="#c6dcb3"/><stop offset="1" stop-color="#95bd9d"/></linearGradient>
 <linearGradient id="water" x2="0" y2="1"><stop stop-color="#c8e5e1"/><stop offset="1" stop-color="#9ac9d3"/></linearGradient>
</defs>
<rect width="1920" height="1440" fill="url(#sky)"/>
<ellipse cx="1390" cy="230" rx="560" ry="460" fill="url(#sunlight)"/>
<circle cx="1400" cy="220" r="64" fill="#fff9e1" opacity=".8"/>
<g shape-rendering="crispEdges">''']

def polygon(points, color, opacity=1):
    parts.append(f'<polygon points="{" ".join(f"{x:g},{y:g}" for x,y in points)}" fill="{color}" opacity="{opacity:g}"/>')

def rect(x,y,w,h,color,opacity=1):
    parts.append(f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" fill="{color}" opacity="{opacity:g}"/>')

def stepped(points, unit=8):
    """Small pixel steps form one connected contour, not scattered tiles."""
    out = [points[0]]
    for (x0,y0),(x1,y1) in zip(points,points[1:]):
        count=max(1,math.ceil(abs(x1-x0)/unit))
        for i in range(1,count+1):
            x=round((x0+(x1-x0)*i/count)/unit)*unit
            y=round((y0+(y1-y0)*i/count)/unit)*unit
            out.extend([(x,out[-1][1]),(x,y)])
    return out

def land(points, color, unit=8):
    polygon(stepped(points,unit)+[(1920,1440),(0,1440)],color)

def cloud(x,y,w):
    points=[(0,32),(.12,32),(.12,16),(.28,16),(.28,0),(.52,0),(.52,8),(.65,8),(.65,24),(.88,24),(.88,32),(1,32),(1,48),(0,48)]
    polygon([(x+a*w,y+b) for a,b in points],'#ffffff',.53)
    rect(x+w*.12,y+48,w*.76,8,'#e3eff2',.42)

cloud(110,190,350)
cloud(560,110,250)
cloud(1510,330,350)
cloud(1000,370,210)

# All ridges span the composition, meeting one shared horizon.
land([(0,670),(130,560),(310,340),(470,520),(610,445),(790,640),(970,520),(1110,650),(1260,570),(1440,380),(1590,510),(1730,410),(1920,650)],'#c8dfe4')
polygon(stepped([(190,480),(310,340),(410,454),(354,424),(322,451),(294,403),(255,451)]),'#edf4ee')
polygon(stepped([(1350,474),(1440,380),(1530,465),(1475,440),(1450,460),(1420,423)]),'#edf4ee')
land([(0,760),(180,615),(310,600),(460,720),(620,680),(850,790),(1010,710),(1180,770),(1360,625),(1510,630),(1700,570),(1920,730)],'#b8d3d4')
land([(0,790),(180,755),(380,800),(590,850),(790,885),(1000,875),(1180,805),(1350,755),(1550,735),(1770,785),(1920,820)],'#cadecb')

def pine(x,y,h,color,light=None):
    w=h*.43
    polygon([(x,y-h),(x+w*.34,y-h*.7),(x+w*.19,y-h*.7),(x+w*.65,y-h*.39),(x+w*.42,y-h*.39),(x+w,y),(x-w,y),(x-w*.42,y-h*.39),(x-w*.65,y-h*.39),(x-w*.19,y-h*.7),(x-w*.34,y-h*.7)],color)
    if light:
        polygon([(x,y-h),(x,y-8),(x-w*.78,y-8),(x-w*.34,y-h*.39),(x-w*.48,y-h*.39),(x-w*.12,y-h*.7),(x-w*.25,y-h*.7)],light)

# Tree roots sit in the hills, with varied height and spacing along their slope.
for x in range(-20,1940,28):
    y=840+math.sin(x/220)*35+math.sin(x/91)*12
    pine(x,round(y),rng.randrange(32,76),'#b1cdbd')
land([(0,880),(190,860),(340,900),(540,950),(750,980),(950,950),(1150,890),(1380,850),(1570,890),(1770,945),(1920,950)],'#d5e4bf')
land([(0,1000),(220,1000),(440,1050),(660,1090),(850,1085),(1030,1030),(1260,985),(1480,1000),(1720,1055),(1920,1090)],'url(#meadow)')

# One continuous stream runs from the far valley through the foreground.
polygon(stepped([(1032,886),(986,922),(1056,960),(1208,1016),(1264,1072),(1224,1120),(1056,1168),(912,1240),(856,1328),(1016,1440)])+stepped([(1264,1440),(1112,1328),(1120,1256),(1288,1200),(1408,1136),(1400,1056),(1304,1000),(1136,952),(1024,920),(1048,886)]),'#e5edcb')
polygon(stepped([(1036,886),(1000,922),(1080,960),(1232,1016),(1296,1072),(1256,1120),(1080,1176),(944,1248),(904,1328),(1064,1440)])+stepped([(1216,1440),(1072,1328),(1096,1248),(1264,1184),(1376,1128),(1376,1064),(1280,1008),(1120,960),(1016,920),(1044,886)]),'url(#water)')
for x,y,w in [(1068,969,60),(1192,1025,72),(1296,1090,42),(1190,1148,80),(1040,1232,48),(968,1328,68),(1104,1400,96)]:
    rect(x,y,w,4,'#eff8e9',.65)

# The nearer banks wrap around the scene rather than floating on the page.
land([(0,1056),(192,1096),(368,1176),(560,1280),(720,1376),(776,1440)],'#a9c79e')
polygon(stepped([(1920,1064),(1776,1128),(1664,1256),(1552,1352),(1496,1440)])+[(1920,1440)],'#a4c39c')
for x,y,h in [(-5,1190,236),(106,1194,180),(190,1220,224),(290,1264,154),(1760,1264,172),(1860,1238,258),(1948,1220,220)]:
    rect(x-6,y-15,12,40,'#739a86')
    pine(x,y,h,'#85af98','#97bba0')

# Quiet meadow details are restricted to the foreground; no repeating texture.
for _ in range(135):
    x=rng.randrange(0,1920)//4*4; y=rng.randrange(1190,1440)//4*4
    if 800<x<1460: continue
    rect(x,y,rng.choice([8,12,16]),4,rng.choice(['#c2d8ac','#91b68e','#b9d1a4']),.75)
for x,y in [(110,1320),(166,1390),(360,1324),(430,1410),(620,1398),(1540,1390),(1690,1320),(1800,1380)]:
    rect(x+4,y+8,4,20,'#77a084')
    rect(x,y,12,12,'#fff8df')
    rect(x+4,y+4,4,4,'#e6bd69')
parts.append('</g></svg>')
output=ROOT/'dist/ui/page-landscape.svg'
output.write_text('\n'.join(parts)+'\n',encoding='utf-8')
print(f'Created {output.name}: {output.stat().st_size:,} bytes; single self-contained SVG.')
