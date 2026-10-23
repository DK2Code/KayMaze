import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {WORLD_ART} from '../dist/world-data.mjs';
import {TRAINERS,BIOME_STYLE,trainerFrame,loadWorldArt,paintTerrain,sceneryActors,drawWorldTrainer,drawWorldObstacle} from '../dist/world-art.mjs';
import {ROUTES,OBSTACLES} from '../dist/data.mjs';
import {blankSave,chooseStarter,sanitizeSave,createMaze,completeRun} from '../dist/game.mjs';

test('native world assets have valid dimensions and match the pinned pack manifest',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../dist/assets/world/sources.json',import.meta.url)));
 for(const meta of Object.values(WORLD_ART)){
  const bytes=readFileSync(new URL('../dist/assets/world/'+meta.file,import.meta.url));
  assert.equal(bytes.toString('ascii',1,4),'PNG');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.outputs[meta.file]);
  assert.equal(bytes.readUInt32BE(16),meta.tileSize?meta.columns*meta.tileSize:meta.width*(meta.frames||1));
  assert.equal(bytes.readUInt32BE(20),meta.tileSize?Math.ceil(meta.count/meta.columns)*meta.tileSize:meta.height);
 }
 for(const route of ROUTES){assert.ok(BIOME_STYLE[route.id]);assert.ok(BIOME_STYLE[route.id].floor<WORLD_ART[BIOME_STYLE[route.id].ground].count);}
});

test('all trainer directions and walking frames stay within their sprite sheets',()=>{
 for(const id of Object.keys(TRAINERS))for(const dir of [0,1,2,3]){
  const meta=WORLD_ART['trainer-'+id];assert.ok(meta,id);
  const idle=trainerFrame(id,dir,0,false);
  for(let t=0;t<1;t+=.037){const walking=trainerFrame(id,dir,t,true);assert.ok(walking.frame>=0&&walking.frame<meta.frames);assert.equal(walking.flip,dir===1);assert.deepEqual(trainerFrame(id,dir,t,true,true),idle);}
 }
});

test('all seven terrain renderers and trainers draw within loaded PNG bounds',async()=>{
 const OriginalImage=globalThis.Image;
 globalThis.Image=class{set src(file){const bytes=readFileSync(new URL('../dist/'+file,import.meta.url));this.width=bytes.readUInt32BE(16);this.height=bytes.readUInt32BE(20);queueMicrotask(()=>this.onload());}};
 try{
  await loadWorldArt();let images=0;
  const context=new Proxy({drawImage(image,...args){images++;assert.ok(image.width>0&&image.height>0);args.forEach(n=>assert.ok(Number.isFinite(n)));if(args.length===8){const [x,y,w,h]=args;assert.ok(x>=0&&y>=0&&x+w<=image.width&&y+h<=image.height);}}},{get(o,k){return k in o?o[k]:()=>{};}});
  for(const [i,route] of ROUTES.entries()){
   const game=createMaze(i,'adventure',129,25,route.rewards[0]);paintTerrain(context,game,route.id);
   for(const actor of sceneryActors(context,game,route.id))actor.draw();
   for(const id of Object.keys(TRAINERS))for(const dir of [0,1,2,3])for(const time of [0,.14,.27,.4])drawWorldTrainer(context,id,100,100,dir,time,true);
   for(const kind of Object.keys(OBSTACLES))for(const hp of [8,4,2,0])for(const reduced of [false,true]){assert.ok(WORLD_ART['obstacle-'+kind]);drawWorldObstacle(context,{x:2,y:3,kind,hp,maxHp:8,hit:.15},44,.6,reduced,route.id);}
  }
  assert.ok(images>10000);
 }finally{if(OriginalImage)globalThis.Image=OriginalImage;else delete globalThis.Image;}
});

test('trainer choices and legacy Cinnabar completion retain all trail access',()=>{
 for(const id of Object.keys(TRAINERS)){const save=blankSave();assert.ok(chooseStarter(save,25,id,TRAINERS[id].hidden?'Kayden':''));assert.equal(sanitizeSave(save).trainer,id);}
 const old={...blankSave(),version:1,starter:25,trainer:'leaf',owned:[25,10,6],unlocked:5,records:{'volcano-adventure':{medals:3,time:240}}};
 const loaded=sanitizeSave(old);assert.deepEqual(loaded.records,old.records);assert.deepEqual(loaded.owned,old.owned);assert.equal(loaded.trainer,'leaf');assert.equal(loaded.unlocked,6);
 const mountain=createMaze(ROUTES.findIndex(r=>r.id==='mountain'),'adventure',42,25,27);mountain.status='won';assert.ok(completeRun(loaded,mountain));assert.equal(loaded.unlocked,6);assert.ok(loaded.owned.includes(27));
});
