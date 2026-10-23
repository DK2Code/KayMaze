import {WORLD_ART} from './world-data.mjs';
import {TRAINERS as ARENA_TRAINERS} from './arena/trainers.mjs';

export const TRAINERS=Object.freeze({...ARENA_TRAINERS,brendan:{name:'Brendan',color:'#87c58b'},may:{name:'May',color:'#dc806f'},kayden:{name:'Kayden',color:'#72c7ed',hidden:true}});
export const trainerPortrait=id=>`assets/world/portrait-${Object.hasOwn(TRAINERS,id)?id:'red'}.png`;
const images=new Map();let promise,revision=0;
export function loadWorldArt(){return promise??=Promise.all(Object.entries(WORLD_ART).map(([id,meta])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images.set(id,image);resolve();};image.onerror=()=>reject(Error(`Unable to load ${meta.file}`));image.src=`assets/world/${meta.file}`;}))).then(()=>{revision++;});}
export const worldArtRevision=()=>revision;
export function trainerFrame(id,direction,time,moving,reduced=false){
 const face=direction===0?1:direction===2?0:2,step=moving&&!reduced?Math.floor(time/.13)%4:3,frames=WORLD_ART['trainer-'+id]?.frames||9;
 const walk=face===0?[3,0,4,0]:face===1?[5,1,6,1]:[7,2,8,2];
 return {frame:moving&&!reduced&&frames>=9?walk[step]:face,flip:direction===1,bob:moving&&!reduced&&frames<9&&(step===0||step===2)?-1:0};
}
export function drawWorldTrainer(c,id,x,y,dir,time,moving,reduced=false){
 const image=images.get('trainer-'+id);if(!image)return;
 const sample=trainerFrame(id,dir,time,moving,reduced);c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y));
 c.fillStyle='#132b3c44';c.beginPath();c.ellipse(0,2,12,5,0,0,Math.PI*2);c.fill();if(sample.flip)c.scale(-1,1);
 // Original 16x32 sprite at an integer 2x scale. The feet, not the head,
 // anchor the actor to the collision cell throughout every walking frame.
 c.drawImage(image,sample.frame*16,0,16,32,-16,-58+sample.bob*2,32,64);c.restore();
}
export function drawWorldObstacle(c,o,s=44,time=0,reduced=false,biome='forest'){
 const id='obstacle-'+o.kind,meta=WORLD_ART[id],image=images.get(id),x=Math.round((o.x+.5)*s),foot=Math.round((o.y+.75)*s);
 c.save();c.imageSmoothingEnabled=false;c.translate(x+(!reduced&&o.hit>0?Math.round(Math.sin(o.hit*100)*2):0),foot);
 const pixel=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 if(o.hp<=0){
  if(o.kind==='tree'){pixel(-8,-5,16,6,'#614635');pixel(-6,-8,12,5,'#bc9160');pixel(-3,-7,6,2,'#ead299');}
  else{const color={thorns:'#6c9254',rock:'#a99b73',crystal:'#8b99db',ice:'#baddec'}[o.kind];for(let i=0;i<5;i++)pixel(-13+i*6,-2-(i%2)*3,i%2?3:4,2,color);}
  c.restore();return;
 }
 // Native sprite silhouettes replace the old smooth placeholder geometry.
 pixel(-14,-3,28,5,'#223c3e32');pixel(-10,2,20,2,'#223c3e22');
 if(image&&meta){
  const w=o.kind==='tree'?40:o.kind==='crystal'?36:32,h=Math.round(w*meta.height/meta.width);
  if(o.kind==='tree'&&biome==='autumn')c.filter='sepia(.65) saturate(1.5)';
  c.drawImage(image,-w/2,-h,w,h);c.filter='none';
  if(o.kind==='thorns'){
   // Fine, stepped thorn stems sit within the native leafy bush silhouette.
   pixel(-12,-10,24,2,'#57492d');pixel(-9,-13,2,7,'#57492d');pixel(-9,-15,5,2,'#b9b780');pixel(5,-17,2,11,'#57492d');pixel(7,-17,3,2,'#d3cd95');pixel(9,-7,2,4,'#5d713c');
  }
  if((o.kind==='ice'||o.kind==='crystal')&&!reduced&&Math.sin(time*2+o.x)>.85){pixel(4,-23,2,6,'#efffff');pixel(2,-21,6,2,'#efffff');}
 }
 if(o.hp<o.maxHp){
  if(o.kind==='rock'||o.kind==='ice'||o.kind==='crystal'){const color=o.kind==='rock'?'#34342e':'#34668d';pixel(-1,-26,2,7,color);pixel(-4,-20,5,2,color);pixel(-4,-18,2,7,color);if(o.hp<=o.maxHp/2){pixel(-2,-13,6,2,color);pixel(3,-11,2,7,color);}}
  pixel(-15,6,30,5,'#233b3de0');pixel(-14,7,Math.ceil(28*o.hp/o.maxHp),3,'#f7d788');
 }
 c.restore();
}
export function tile(c,set,id,x,y,size=22){const image=images.get(set);if(!image)return;c.drawImage(image,(id%16)*16,Math.floor(id/16)*16,16,16,Math.round(x),Math.round(y),size,size);}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
const seedNoise=(x,y,seed)=>{let n=Math.imul(x+17,374761393)^Math.imul(y+31,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return(n>>>0)/4294967296;};
const solid=(g,x,y)=>g.grid[Math.floor(y/2)]?.[Math.floor(x/2)]!==0;
export const BIOME_STYLE=Object.freeze({
 forest:{ground:'outdoors',floor:1,wall:'canopy',ambient:'leaf'},
 autumn:{ground:'outdoors',floor:289,wall:'canopy',ambient:'leaf'},
 creek:{ground:'outdoors',floor:289,wall:'water',ambient:'water'},
 cave:{ground:'cavern',floor:244,wall:'rock',ambient:'motes'},
 frost:{ground:'frozen',floor:1,wall:'ice',ambient:'snow'},
 volcano:{ground:'cavern',floor:291,wall:'lava',ambient:'embers'},
 mountain:{ground:'cavern',floor:291,wall:'cliff',ambient:'dust'}
});
function surface(c,g,biome,s){const style=BIOME_STYLE[biome],q=s/2;
 c.fillStyle=biome==='cave'?'#79748b':biome==='volcano'?'#8c6861':biome==='frost'?'#c8e1ee':'#70b58d';c.fillRect(0,0,g.w*s,g.h*s);
 // Two source metatiles per collision cell retain the fine GBA texture.
 for(let y=0;y<g.h*2;y++)for(let x=0;x<g.w*2;x++)tile(c,style.ground,style.floor,x*q,y*q,q);
 if(biome==='forest'||biome==='autumn'){
   for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){
    if(!g.grid[y][x]){const n=seedNoise(x,y,g.seed);if(n>.78){if(biome==='forest')tile(c,'outdoors',13,x*s+q*.5,y*s+q*.9,q*.7);else{c.fillStyle='#b8894f';c.fillRect(x*s+s*.23,y*s+s*.67,s*.09,s*.045);c.fillStyle='#dcaa58';c.fillRect(x*s+s*.67,y*s+s*.23,s*.045,s*.09);}}}
    else{c.fillStyle=biome==='forest'?'#23563c38':'#875e3630';c.fillRect(x*s,y*s,s,s);}
   }
 }else if(style.wall==='water'||style.wall==='lava'){
   const lava=style.wall==='lava';
   for(let y=0;y<g.h*2;y++)for(let x=0;x<g.w*2;x++)if(solid(g,x,y)){
    tile(c,lava?'cavern':'outdoors',lava?356:368,x*q,y*q,q);
    // Shorelines follow the connected maze banks, never each square's border.
    c.fillStyle=lava?'#753e2e':'#7b784e';
    if(!solid(g,x-1,y))c.fillRect(x*q,y*q,3,q);
    if(!solid(g,x+1,y))c.fillRect((x+1)*q-3,y*q,3,q);
    if(!solid(g,x,y-1))c.fillRect(x*q,y*q,q,3);
    if(!solid(g,x,y+1)){c.fillRect(x*q,(y+1)*q-4,q,4);c.fillStyle=lava?'#ffca69':'#c5e9db';c.fillRect(x*q,(y+1)*q-5,q,1);}
   }
 }else if(style.wall==='cliff'||style.wall==='ice'){
   const ice=style.wall==='ice';
   for(let y=0;y<g.h*2;y++)for(let x=0;x<g.w*2;x++)if(solid(g,x,y)){
    const left=!solid(g,x-1,y),right=!solid(g,x+1,y),top=!solid(g,x,y-1),bottom=!solid(g,x,y+1);
    const col=left?0:right?2:1,row=top?0:bottom?2:1;
    const ids=[[8,9,10],[16,17,18],[24,25,26]];
    tile(c,ice?'frozen':'cavern',ids[row][col],x*q,y*q,q);
    if(bottom){c.fillStyle=ice?'#254e7538':'#42263a35';c.fillRect(x*q,(y+1)*q,q,3);}
   }
 }else if(style.wall==='rock'){
   for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if(g.grid[y][x]){
    ellipse(c,(x+.5)*s,(y+.75)*s,s*.44,s*.18,'#34344855');
    tile(c,'cavern',237,x*s,y*s,s);if((x*3+y)%11===0)tile(c,'cavern',286,x*s+12,y*s+9,22);
   }
 }
 // Footpath trims and occasional stones imply wear while leaving routes clear.
 if(biome==='mountain'||biome==='volcano')for(let y=1;y<g.h-1;y++)for(let x=1;x<g.w-1;x++)if(!g.grid[y][x]&&seedNoise(x,y,g.seed)>.78){c.fillStyle=biome==='volcano'?'#604b4b':'#8f6d60';c.fillRect(x*s+6,y*s+8,3,2);c.fillRect(x*s+10,y*s+6,2,2);}
}
function canopy(c,g,biome,x,y,s){
 const tree=images.get('forest-tree');if(!tree)return;
 const px=x*s,foot=(y+1)*s,variation=seedNoise(x,y,g.seed),width=s*(1.04+variation*.08),height=width*1.5;
 ellipse(c,px+s*.52,foot-4,s*.43,s*.21,'#193d3566');c.save();if(biome==='autumn')c.filter='sepia(.95) saturate(2.2) hue-rotate(340deg)';
 c.drawImage(tree,Math.round(px+(s-width)/2),Math.round(foot-height),Math.round(width),Math.round(height));c.restore();
}
export function sceneryActors(c,g,biome,s=44){const style=BIOME_STYLE[biome];if(style.wall!=='canopy')return[];
 const actors=[];for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if(g.grid[y][x])actors.push({depth:(y+1)*s-4,draw:()=>canopy(c,g,biome,x,y,s)});return actors;
}
export function paintTerrain(c,g,biome,s=44){c.save();c.imageSmoothingEnabled=false;if(biome==='cave')c.filter='saturate(.35) hue-rotate(175deg)';surface(c,g,biome,s);c.restore();}
export function drawAmbient(c,g,biome,s,reduced){if(reduced)return;const type=BIOME_STYLE[biome].ambient,t=g.anim,w=g.w*s,h=g.h*s;
 c.save();if(type==='water'||type==='embers'){
   for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if(g.grid[y][x]&&(x+y)%3===0){const n=seedNoise(x,y,g.seed),phase=(t*.5+n)%1,xx=x*s+8+n*15,yy=y*s+12+phase*14;c.globalAlpha=Math.sin(phase*Math.PI)*.45;c.strokeStyle=type==='water'?'#c5f1fb':'#ffe99b';c.lineWidth=1;c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+10,yy);c.moveTo(xx+3,yy+3);c.lineTo(xx+8,yy+3);c.stroke();}
 }
 for(let i=0;i<(type==='snow'?30:12);i++){const n=seedNoise(i,7,g.seed),xx=(n*w+t*(type==='snow'?7:3)+Math.sin(t*.4+i)*8)%w,yy=(i*53+t*(type==='embers'?-12:type==='snow'?13:4)+h*10)%h;c.globalAlpha=type==='snow'?.65:.38;c.fillStyle=type==='snow'?'#ffffff':type==='embers'?'#ffcb74':type==='leaf'?(biome==='autumn'?'#e9b15e':'#b8d883'):'#d1c9e3';c.fillRect(Math.round(xx),Math.round(yy),type==='leaf'?3:2,type==='leaf'?2:2);}
 c.restore();
}
export function renderTrailPreview(canvas,g,biome){const s=16;canvas.width=g.w*s;canvas.height=g.h*s;const c=canvas.getContext('2d');paintTerrain(c,g,biome,s);for(const actor of sceneryActors(c,g,biome,s))actor.draw();}
