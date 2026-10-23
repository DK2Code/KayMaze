import {TRAINERS} from './world-art.mjs';
import {STARTERS,SPECIES,ROUTES,MODES,OBSTACLES,signature} from './data.mjs';
export const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
export const key=(x,y)=>`${x},${y}`;
const eq=(a,b)=>a.x===b.x&&a.y===b.y;
export function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function pathfind(g,from,to,ignoreObstacles=false){
 const queue=[from],seen=new Map([[key(from.x,from.y),null]]);let last=null;
 for(let i=0;i<queue.length;i++){const p=queue[i];if(eq(p,to)){last=p;break;}for(const [dx,dy]of DIRS){const n={x:p.x+dx,y:p.y+dy},k=key(n.x,n.y);if(seen.has(k)||g.grid[n.y]?.[n.x]!==0||(!ignoreObstacles&&g.obstacles?.get(k)?.hp>0))continue;seen.set(k,p);queue.push(n);}}
 if(!last)return[];const path=[];while(last&&!eq(last,from)){path.unshift(last);last=seen.get(key(last.x,last.y));}return path;
}
export function createMaze(routeIndex=0,mode='adventure',seed=1,partner=25,reward=10){
 const cfg=MODES[mode],random=rng(seed),w=cfg.width,h=cfg.height,grid=Array.from({length:h},()=>Array(w).fill(1)),stack=[{x:1,y:1}];grid[1][1]=0;
 while(stack.length){const p=stack.at(-1),choices=DIRS.map(([dx,dy])=>({x:p.x+dx*2,y:p.y+dy*2,dx,dy})).filter(n=>n.x>0&&n.y>0&&n.x<w-1&&n.y<h-1&&grid[n.y][n.x]===1);if(!choices.length){stack.pop();continue;}const n=choices[Math.floor(random()*choices.length)];grid[p.y+n.dy][p.x+n.dx]=0;grid[n.y][n.x]=0;stack.push(n);}
 // A few loops create route choices without erasing the maze's dead ends.
 for(let i=0;i<(mode==='expert'?8:4);i++){const x=2+Math.floor(random()*(w-4)),y=2+Math.floor(random()*(h-4));if(grid[y][x]===1&&((!grid[y][x-1]&&!grid[y][x+1])||(!grid[y-1][x]&&!grid[y+1][x])))grid[y][x]=0;}
 const g={routeIndex,mode,seed,w,h,grid,obstacles:new Map(),stars:new Set(),visited:new Set(),player:{x:1,y:1},follower:{x:1,y:1},facing:1,partner,reward,time:0,anim:0,step:null,cast:null,capture:null,status:'playing',cooldown:0,switchCooldown:0,found:0,cleared:0,moves:0,events:[],effects:[],walkPath:[],hint:[],hintTime:0,hintCooldown:0,toast:'Follow the trail. Your new friend is waiting!',toastTime:6};
 // Use the most distant reachable tile for a worthwhile, guaranteed-connected exit.
 let best=[];for(let y=1;y<h-1;y+=2)for(let x=1;x<w-1;x+=2){if(DIRS.filter(([dx,dy])=>grid[y+dy]?.[x+dx]===0).length!==1)continue;const p=pathfind(g,g.player,{x,y},true);if(p.length>best.length){best=p;g.goal={x,y};}}
 // Start in a walking formation: the trainer leads by one open trail tile.
 // The companion keeps the entrance tile, so neither sprite hides the other.
 g.player={...best[0]};g.facing=DIRS.findIndex(([dx,dy])=>1+dx===g.player.x&&1+dy===g.player.y);
 g.mainPath=best.slice(1);
 const forbidden=new Set([key(1,1),key(g.player.x,g.player.y),key(g.goal.x,g.goal.y)]),route=ROUTES[routeIndex];
 for(let i=6;i<best.length-2;i+=Math.max(7,12-routeIndex)){const p=best[i],kind=route.obstacles[Math.floor(random()*route.obstacles.length)],hp=cfg.hp;g.obstacles.set(key(p.x,p.y),{...p,kind,hp,maxHp:hp,hit:0});forbidden.add(key(p.x,p.y));}
 const open=[];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(!grid[y][x]&&!forbidden.has(key(x,y))&&Math.abs(x-1)+Math.abs(y-1)>4)open.push({x,y});
 const dead=open.filter(p=>DIRS.filter(([dx,dy])=>grid[p.y+dy]?.[p.x+dx]===0).length===1);
 const candidates=[...dead.sort(()=>random()-.5),...open.sort(()=>random()-.5)];
 for(const p of candidates){if(g.stars.size===3)break;const k=key(p.x,p.y);if(!forbidden.has(k)){g.stars.add(k);forbidden.add(k);}}
 g.visited.add(key(1,1));g.visited.add(key(g.player.x,g.player.y));return g;
}
export function obstacleAhead(g){const [dx,dy]=DIRS[g.facing];return g.obstacles.get(key(g.player.x+dx,g.player.y+dy));}
export function nearbyObstacle(g){const front=obstacleAhead(g);if(front?.hp>0)return front;return DIRS.map(([dx,dy])=>g.obstacles.get(key(g.player.x+dx,g.player.y+dy))).find(o=>o?.hp>0);}
export function damageFor(id,kind){return OBSTACLES[kind].weak.includes(signature(id).element)?4:2;}
export function notify(g,message,duration=3){g.toast=message;g.toastTime=duration;}
export function move(g,dir){
 if(g.status!=='playing'||g.step||g.cast)return false;g.facing=dir;const [dx,dy]=DIRS[dir],to={x:g.player.x+dx,y:g.player.y+dy};if(g.grid[to.y]?.[to.x]!==0)return false;
 const o=g.obstacles.get(key(to.x,to.y));if(o?.hp>0){notify(g,`${OBSTACLES[o.kind].name} ahead · select it to use ${signature(g.partner).name}.`);return false;}
 g.step={from:{...g.player},to,age:0,duration:MODES[g.mode].speed,followFrom:{...g.follower}};return true;
}
export function attack(g){
 if(g.status!=='playing'||g.step||g.cast||g.cooldown>0)return false;const target=nearbyObstacle(g);if(!target){notify(g,'Get next to an obstacle, then use your partner’s move.');return false;}
 const dx=target.x-g.player.x,dy=target.y-g.player.y;g.facing=DIRS.findIndex(d=>d[0]===dx&&d[1]===dy);g.cast={age:0,windup:.22,duration:.7,angle:Math.atan2(dy,dx),target,move:signature(g.partner),hit:false};g.cooldown=.8;g.walkPath=[];return true;
}
export function walkTo(g,to){
 if(g.status!=='playing')return false;const obstacle=g.obstacles.get(key(to.x,to.y));if(obstacle?.hp>0){const candidates=DIRS.map(([dx,dy])=>({x:to.x+dx,y:to.y+dy})).filter(p=>g.grid[p.y]?.[p.x]===0&&!g.obstacles.get(key(p.x,p.y))?.hp);const paths=candidates.map(p=>({p,path:pathfind(g,g.step?.to||g.player,p)})).filter(v=>v.path.length||eq(v.p,g.step?.to||g.player)).sort((a,b)=>a.path.length-b.path.length);if(paths.length){g.walkPath=paths[0].path;g.walkTarget=to;return true;}}
 else {const path=pathfind(g,g.step?.to||g.player,to);if(path.length){g.walkPath=path;g.walkTarget=null;return true;}}
 notify(g,'That path is blocked. Clear an obstacle or try another turn.');return false;
}
export function showHint(g){if(g.status!=='playing'||g.hintCooldown>0)return false;g.hint=pathfind(g,g.player,g.goal,true);g.hintTime=7;g.hintCooldown=15;notify(g,'Follow the golden dots toward your new friend.',4);return true;}
export function switchPartner(g,id,owned){if(g.status!=='playing'||g.step||g.cast||g.switchCooldown>0||!owned.includes(id)||!SPECIES[id]||g.partner===id)return false;g.partner=id;g.cooldown=Math.max(g.cooldown,.5);g.switchCooldown=2;g.events.push({type:'switch'});g.effects.push({type:'switch',x:g.follower.x,y:g.follower.y,age:0,duration:.7});notify(g,`${SPECIES[id].name}, let’s explore!`);return true;}
export function tick(g,dt){
 if(!Number.isFinite(dt)||dt<=0||g.status==='paused'||g.status==='won')return;dt=Math.min(dt,.05);g.anim+=dt;
 if(g.status==='capturing'){g.capture.age+=dt;if(g.capture.age>=2.7){g.status='won';g.events.push({type:'caught',id:g.reward});}return;}
 g.time+=dt;for(const k of ['cooldown','switchCooldown','toastTime','hintTime','hintCooldown'])g[k]=Math.max(0,g[k]-dt);
 g.effects=g.effects.filter(e=>(e.age+=dt)<e.duration);for(const o of g.obstacles.values())o.hit=Math.max(0,o.hit-dt);
 if(g.cast){const c=g.cast;c.age+=dt;if(c.age>=c.windup&&!c.released){c.released=true;g.events.push({type:'attack',element:c.move.element});}if(c.age>=c.windup+.2&&!c.hit){c.hit=true;const o=c.target,damage=damageFor(g.partner,o.kind);o.hp=Math.max(0,o.hp-damage);o.hit=.25;g.effects.push({type:'impact',kind:o.kind,x:o.x,y:o.y,age:0,duration:.65,strong:damage===4});if(!o.hp){g.cleared++;notify(g,`${OBSTACLES[o.kind].name} cleared!${damage===4?' A perfect match.':''}`,2);}else notify(g,`${c.move.name}${damage===4?' · super effective!':'!'} ${Math.ceil(o.hp/damage)} more hit${o.hp>damage?'s':''} to clear.`,2);}if(c.age>=c.duration)g.cast=null;}
 if(g.step){const s=g.step;s.age+=dt;if(s.age>=s.duration){g.follower={...s.from};g.player={...s.to};g.step=null;g.moves++;g.visited.add(key(g.player.x,g.player.y));const k=key(g.player.x,g.player.y);if(g.stars.delete(k)){g.found++;g.events.push({type:'star'});notify(g,`Trail star found! ${g.found} of 3 collected.`);}
 if(eq(g.player,g.goal)){g.status='capturing';g.capture={age:0};g.events.push({type:'capture'});g.walkPath=[];}}}
 if(!g.step&&!g.cast&&g.status==='playing'&&g.walkPath.length){const next=g.walkPath.shift();const dir=DIRS.findIndex(([dx,dy])=>g.player.x+dx===next.x&&g.player.y+dy===next.y);if(dir<0||!move(g,dir))g.walkPath=[];}
 if(!g.step&&!g.walkPath.length&&g.walkTarget){const t=g.walkTarget;if(Math.abs(t.x-g.player.x)+Math.abs(t.y-g.player.y)===1){g.facing=DIRS.findIndex(([dx,dy])=>g.player.x+dx===t.x&&g.player.y+dy===t.y);notify(g,'You’re in range · your partner is ready to clear the obstacle.');}g.walkTarget=null;}
}
export function medals(g){return (g.status==='won'?1:0)+(g.found===3?1:0);}
export function blankSave(){return{version:1,trainer:'red',starter:null,owned:[],unlocked:0,records:{},runs:0,mode:'adventure',sound:false,reduced:false,adminUnlocked:false};}
export function collectionIds(save){return [...(save.adminUnlocked?STARTERS:save.starter?[save.starter]:[]),...ROUTES.flatMap(r=>r.rewards)];}
export function sanitizeSave(raw){
 const s=blankSave();if(!raw||typeof raw!=='object')return s;
 if(Object.hasOwn(TRAINERS,raw.trainer))s.trainer=raw.trainer;
 s.adminUnlocked=raw.adminUnlocked===true;
 if(STARTERS.includes(raw.starter))s.starter=raw.starter;else if(!s.adminUnlocked)return s;
 const allowed=new Set(collectionIds(s));
 s.owned=s.adminUnlocked?[...allowed]:[...new Set([s.starter,...(Array.isArray(raw.owned)?raw.owned:[]).filter(id=>allowed.has(id))])];
 s.unlocked=s.adminUnlocked?ROUTES.length-1:Number.isInteger(raw.unlocked)?Math.max(0,Math.min(ROUTES.length-1,raw.unlocked)):0;
 s.runs=Number.isInteger(raw.runs)?Math.max(0,Math.min(1e7,raw.runs)):0;
 s.mode=Object.hasOwn(MODES,raw.mode)?raw.mode:'adventure';s.sound=raw.sound===true;s.reduced=raw.reduced===true;
 if(raw.records&&typeof raw.records==='object')for(const r of ROUTES)for(const m of Object.keys(MODES)){
  const k=r.id+'-'+m,v=raw.records[k];
  if(v&&Number.isFinite(v.time)&&v.time>=0&&Number.isInteger(v.medals)&&v.medals>=1&&v.medals<=3){s.records[k]={time:v.time,medals:v.medals};s.unlocked=Math.max(s.unlocked,Math.min(ROUTES.length-1,ROUTES.indexOf(r)+1));}
 }
 return s;
}
export function chooseStarter(save,id,trainer){if(save.starter!==null||!STARTERS.includes(id)||!Object.hasOwn(TRAINERS,trainer))return false;save.starter=id;save.trainer=trainer;save.owned=save.adminUnlocked?collectionIds(save):[id];return true;}
export function nextReward(save,routeIndex){const ids=ROUTES[routeIndex].rewards;return ids.find(id=>!save.owned.includes(id))??ids[save.runs%ids.length];}
export function completeRun(save,g){if(g.status!=='won'||g.recorded)return false;g.recorded=true;if(!save.owned.includes(g.reward))save.owned.push(g.reward);save.unlocked=Math.min(ROUTES.length-1,Math.max(save.unlocked,g.routeIndex+1));save.runs++;const k=ROUTES[g.routeIndex].id+'-'+g.mode,old=save.records[k];save.records[k]={medals:Math.max(old?.medals||0,medals(g)),time:Math.min(old?.time??Infinity,g.time)};return true;}
