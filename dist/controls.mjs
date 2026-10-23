import {DIRS,key,move,attack,walkTo} from './game.mjs';

export function cellAtPoint(rect,bitmap,grid,point){
 const scale=Math.min(rect.width/bitmap.width,rect.height/bitmap.height);
 const width=bitmap.width*scale,height=bitmap.height*scale;
 const x=point.x-rect.left-(rect.width-width)/2,y=point.y-rect.top-(rect.height-height)/2;
 if(x<0||y<0||x>=width||y>=height)return null;
 return {x:Math.floor(x/width*grid.w),y:Math.floor(y/height*grid.h)};
}

// Clicks and taps share navigation and clearing; keyboard holds remain optional.
export function createExplorerControls(){
 const held=new Map();
 let moveBuffer=null,attackBuffer=0,tapTarget=null;
 const cancelRoute=g=>{g.walkPath=[];g.walkTarget=null;tapTarget=null;};
 return {
  get direction(){return [...held.values()].reverse().find(a=>a.kind==='move')?.dir??null;},
  get assisting(){return tapTarget!==null;},
  pressMove(g,source,dir){
   if(!Number.isInteger(dir)||dir<0||dir>3)return;
   cancelRoute(g);held.delete(source);held.set(source,{kind:'move',dir});
   moveBuffer=move(g,dir)?null:{dir,time:.24};
  },
  pressAttack(g,source){
   cancelRoute(g);held.set(source,{kind:'attack'});
   attackBuffer=attack(g)?0:.24;
  },
  release(source){held.delete(source);},
  cancel(source){const action=held.get(source);held.delete(source);if(action?.kind==='move')moveBuffer=null;if(action?.kind==='attack')attackBuffer=0;},
  reset(g){held.clear();moveBuffer=null;attackBuffer=0;tapTarget=null;if(g){g.walkPath=[];g.walkTarget=null;}},
  tapWorld(g,to){
   this.reset(g);
   const accepted=walkTo(g,to),obstacle=g.obstacles.get(key(to.x,to.y));
   if(accepted&&obstacle?.hp>0)tapTarget={...to};
   return accepted;
  },
  update(g,dt){
   if(g.status!=='playing'){this.reset();return;}
   if(moveBuffer){moveBuffer.time-=dt;if(moveBuffer.time<=0)moveBuffer=null;}
   attackBuffer=Math.max(0,attackBuffer-dt);
   if(tapTarget){
    const obstacle=g.obstacles.get(key(tapTarget.x,tapTarget.y));
    if(!obstacle?.hp){tapTarget=null;}
    else if(!g.step&&!g.walkPath.length){
     const dir=DIRS.findIndex(([dx,dy])=>g.player.x+dx===tapTarget.x&&g.player.y+dy===tapTarget.y);
     if(dir<0){tapTarget=null;}
     else{g.facing=dir;attack(g);}
    }
   }
   if(attackBuffer>0||[...held.values()].some(a=>a.kind==='attack')){
    if(attack(g))attackBuffer=0;
   }
   const dir=this.direction??moveBuffer?.dir;
   if(dir!==null&&dir!==undefined&&move(g,dir))moveBuffer=null;
  }
 };
}
