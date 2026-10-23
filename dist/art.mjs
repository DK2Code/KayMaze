import {ROUTES,OBSTACLES,signature,SPECIES} from './data.mjs';
import {key,nearbyObstacle} from './game.mjs';
import {DIRECTIONAL} from './arena/directional-data.mjs';
import {spriteSample} from './arena/sprite-animation.mjs';
import {drawShot,drawBattleEffect} from './arena/combat-art.mjs';
import {PALETTE} from './arena/moves.mjs';
import {loadWorldArt,worldArtRevision,paintTerrain,sceneryActors,drawWorldTrainer,drawWorldObstacle,drawAmbient} from './world-art.mjs';
const TAU=Math.PI*2,images=new Map();
const clamp=v=>Math.max(0,Math.min(1,v));
export async function loadArt(){await loadWorldArt();await Promise.all(Object.values(DIRECTIONAL).flatMap(c=>Object.values(c.states)).map(m=>new Promise(resolve=>{const image=new Image();image.onload=()=>{images.set(m.file,image);resolve();};image.onerror=()=>resolve();image.src='assets/directional/'+m.file;})));}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);c.fill();}
function polygon(c,p,color){c.fillStyle=color;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
function line(c,p,color,width=2){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function star(c,x,y,r,color){polygon(c,Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,s=i%2?r*.44:r;return[x+Math.cos(a)*s,y+Math.sin(a)*s];}),color);}
function label(c,text,x,y,color='#fff8d8',bg='#244d3de8',size=10){c.font=`700 ${size}px "Segoe UI",sans-serif`;const w=c.measureText(text).width+16;c.fillStyle=bg;c.beginPath();c.roundRect(x-w/2,y-11,w,19,5);c.fill();c.textAlign='center';c.fillStyle=color;c.fillText(text,x,y+2);}
export function pokemon(c,id,x,y,time,{moving=false,angle=Math.PI/2,cast=null,scale=1,alpha=1,step=0}={}){
 const f={id,x,y,hp:1,lookAngle:angle,vx:moving?30:0,vy:0,animTime:time,step:step||time*6,cast};const sample=spriteSample(f);if(!sample)return{x,y:y-10};const m=sample.meta,img=images.get(m.file),s=sample.scale*.34*scale;c.save();c.globalAlpha=alpha;ellipse(c,x,y+3,9*scale,3*scale,'#1e42363d');c.imageSmoothingEnabled=false;
 if(img)c.drawImage(img,sample.frame*m.width,sample.row*m.height,m.width,m.height,Math.round(x-sample.anchor[0]*s),Math.round(y-sample.anchor[1]*s),m.width*s,m.height*s);c.restore();return{x:x+(sample.head[0]-sample.anchor[0])*s,y:y+(sample.head[1]-sample.anchor[1])*s};
}
function ball(c,x,y,r=6,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle='#fff8e9';c.beginPath();c.arc(0,0,r,0,TAU);c.fill();c.fillStyle='#dd6659';c.beginPath();c.arc(0,0,r,Math.PI,TAU);c.fill();line(c,[[-r,0],[r,0]],'#374c46',2);ellipse(c,0,0,r*.37,r*.37,'#374c46');ellipse(c,0,0,r*.18,r*.18,'#fff7e6');c.restore();}
export function createRenderer(canvas){const c=canvas.getContext('2d');let terrain=null,terrainKey='';
 function background(g){const cacheKey=`${g.seed}-${g.routeIndex}-${g.w}-${worldArtRevision()}`;if(terrainKey===cacheKey)return;terrainKey=cacheKey;terrain=document.createElement('canvas');terrain.width=canvas.width;terrain.height=canvas.height;paintTerrain(terrain.getContext('2d'),g,ROUTES[g.routeIndex].id,44);}
 return function render(g,{trainerId='red',reduced=false,hover=null}={}){
 const tile=44;if(canvas.width!==g.w*tile){canvas.width=g.w*tile;canvas.height=g.h*tile;terrainKey='';}background(g);c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(terrain,0,0);const r=ROUTES[g.routeIndex],time=reduced?0:g.anim;
 const px=p=>(p.x+.5)*tile,py=p=>(p.y+.5)*tile;
 for(const k of g.visited){const [x,y]=k.split(',').map(Number);ellipse(c,(x+.5)*tile,(y+.6)*tile,2,1.5,'#54684c26');}
 if(g.hintTime>0){g.hint.forEach((p,i)=>{if(i%2===0)ellipse(c,px(p),py(p),3,3,'#bc8c35bb');});}
 for(const k of g.stars){const [x,y]=k.split(',').map(Number),xx=(x+.5)*tile,yy=(y+.5)*tile;ellipse(c,xx,yy+7,10,4,'#8d754b26');star(c,xx,yy+Math.sin(time*3+x)*2,10,'#9f793b');star(c,xx,yy-1+Math.sin(time*3+x)*2,8,'#ffe6a1');}
 const goalx=px(g.goal),goaly=py(g.goal);ellipse(c,goalx,goaly+4,22,13,'#fff6c466');ellipse(c,goalx,goaly+4,17,9,'#fff7d470');
 rect(c,goalx+16,goaly-35,2,31,'#735b43');polygon(c,[[goalx+18,goaly-35],[goalx+34,goaly-30],[goalx+18,goaly-25]],'#f5dc8f');
 if(g.status!=='capturing'&&g.status!=='won'){pokemon(c,g.reward,goalx,goaly,time,{angle:Math.PI/2,scale:1.05});if(Math.abs(g.player.x-g.goal.x)+Math.abs(g.player.y-g.goal.y)<5)label(c,SPECIES[g.reward].name,goalx,goaly-32);}

 if(hover&&g.grid[hover.y]?.[hover.x]===0){c.strokeStyle='#fff8cbaa';c.lineWidth=2;c.strokeRect(hover.x*tile+4,hover.y*tile+4,tile-8,tile-8);}
 const s=g.step,q=s?clamp(s.age/s.duration):0,player=s?{x:s.from.x+(s.to.x-s.from.x)*q,y:s.from.y+(s.to.y-s.from.y)*q}:g.player;
 let follower=s?{x:s.followFrom.x+(s.from.x-s.followFrom.x)*q,y:s.followFrom.y+(s.from.y-s.followFrom.y)*q}:g.follower;
 const angle=[-Math.PI/2,0,Math.PI/2,Math.PI][g.facing];
 let muzzle;const drawPartner=()=>{muzzle=pokemon(c,g.partner,px(follower),py(follower)+3,time,{moving:!!s,angle,cast:g.cast?{...g.cast,pose:g.cast.move.pose,index:0}:null,step:g.anim*6});};const drawPerson=()=>drawWorldTrainer(c,trainerId,px(player),py(player),g.facing,time,!!s,reduced);
 const layers=sceneryActors(c,g,r.id,tile);for(const o of g.obstacles.values())layers.push({depth:py(o)+8,draw:()=>drawWorldObstacle(c,o,tile,time,reduced,r.id)});layers.push({depth:py(player)+4,draw:drawPerson},{depth:py(follower)+3,draw:drawPartner});layers.sort((a,b)=>a.depth-b.depth);for(const layer of layers)layer.draw();
 const o=nearbyObstacle(g);if(o?.hp>0&&!g.cast&&g.status==='playing'){c.strokeStyle='#fff3b8';c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();c.ellipse(px(o),py(o)+3,22,15,0,0,TAU);c.stroke();c.setLineDash([]);}
 if(g.cast&&g.cast.age>=g.cast.windup){const cast=g.cast,m=cast.move,a=cast.age-cast.windup,t=clamp(a/.2),tx=px(cast.target),ty=py(cast.target)-5,[color,core]=PALETTE[m.element]||PALETTE.normal,scale=.46,dx=(tx-muzzle.x)/scale,dy=(ty-muzzle.y)/scale,range=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);c.save();c.translate(muzzle.x,muzzle.y);c.scale(scale,scale);
 if(m.mode==='melee'||m.mode==='dash'||m.mode==='channel'||m.mode==='cone'||m.mode==='drain'){drawBattleEffect(c,{move:{...m,range,radius:Math.min(m.radius||8,8)},mode:m.mode,attached:m.mode==='channel',kind:m.visual,x:0,y:0,angle,range,displayRange:range,width:13,age:a,duration:cast.duration-cast.windup,life:cast.duration-cast.age,color,core,element:m.element,target:{x:dx,y:dy}},reduced?0:time);}
 else if(t<1||reduced)drawShot(c,{move:m,kind:m.visual,x:dx*(reduced?1:t),y:dy*(reduced?1:t),vx:dx,vy:dy,age:a,id:1,color,core,element:m.element,radius:11},reduced?0:time);c.restore();}
 for(const e of g.effects){const t=e.age/e.duration,x=px(e),y=py(e);if(e.type==='switch'){c.strokeStyle='#fff9ce';c.lineWidth=2;c.beginPath();c.ellipse(x,y,12+20*t,6+10*t,0,0,TAU);c.stroke();continue;}if(reduced)continue;c.save();c.globalAlpha=1-t;for(let i=0;i<9;i++){const a=i*2.4,dist=8+t*24,xx=x+Math.cos(a)*dist,yy=y+Math.sin(a)*dist*.7-t*(1-t)*30;rect(c,xx,yy,4*(1-t)+1,3, i%3===0?'#fff5ce':OBSTACLES[e.kind].color);}c.restore();}
 if(g.capture){const age=g.capture.age,t=clamp(age/.65),target={x:goalx,y:goaly};if(age<.65){pokemon(c,g.reward,goalx,goaly,time);ball(c,px(player)-20+(target.x-px(player)+20)*t,py(player)-25+(target.y-py(player)+25)*t-(reduced?0:Math.sin(t*Math.PI)*70),6,reduced?0:t*7);}else if(age<1.2){const z=clamp((age-.65)/.55);pokemon(c,g.reward,goalx,goaly,time,{scale:1-z,alpha:1-z});ellipse(c,goalx,goaly,18*z,18*z,'#ffead450');ball(c,goalx,goaly,6);}else{ball(c,goalx,goaly,6,reduced?0:age<2.2?Math.sin(age*28)*.25:0);if(age>2.1)for(let i=0;i<7;i++){const a=i*TAU/7,d=20+(age-2.1)*30;star(c,goalx+Math.cos(a)*d,goaly+Math.sin(a)*d,4,'#fff2b7');}}}
 drawAmbient(c,g,r.id,tile,reduced);
 const gradient=c.createRadialGradient(canvas.width*.5,canvas.height*.5,canvas.height*.35,canvas.width*.5,canvas.height*.5,canvas.width*.65);gradient.addColorStop(0,'#0c292200');gradient.addColorStop(1,'#0c292216');c.fillStyle=gradient;c.fillRect(0,0,canvas.width,canvas.height);
 };
}
