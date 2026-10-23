import test from 'node:test';
import assert from 'node:assert/strict';
import {SAVE_KEY,resetProgress,unlockAdmin} from '../dist/progress.mjs';
import {blankSave,sanitizeSave,chooseStarter,collectionIds,createMaze,switchPartner,completeRun,nextReward,isRouteUnlocked} from '../dist/game.mjs';
import {STARTERS,SPECIES,ROUTES,MODES} from '../dist/data.mjs';

test('reset erases all KayMaze progression and allows a different starter after reload',()=>{
 const old={...blankSave(),starter:25,trainer:'brendan',owned:[25,10,6,27],unlocked:6,runs:12,records:{'forest-adventure':{medals:3,time:20}},mode:'expert',sound:true,reduced:true};
 unlockAdmin(old,'1234');
 const data=new Map([[SAVE_KEY,JSON.stringify(old)],['other-game','keep me']]);
 const result=resetProgress({setItem(k,v){data.set(k,v);}});
 assert.equal(result.stored,true);assert.deepEqual(result.save,blankSave());
 assert.deepEqual(JSON.parse(data.get(SAVE_KEY)),blankSave());assert.equal(data.get('other-game'),'keep me');
 const reloaded=sanitizeSave(JSON.parse(data.get(SAVE_KEY)));assert.ok(chooseStarter(reloaded,7,'may'));assert.deepEqual(reloaded.owned,[7]);assert.equal(reloaded.starter,7);assert.equal(reloaded.trainer,'may');assert.equal(reloaded.unlocked,0);assert.deepEqual(reloaded.records,{});
});

test('a blocked storage write reports an unsaved reset instead of claiming persistence',()=>{
 for(const storage of [undefined,{setItem(){throw Error('Storage blocked');}}]){const result=resetProgress(storage);assert.equal(result.stored,false);assert.deepEqual(result.save,blankSave());}
});

test('only the exact admin password unlocks content and wrong attempts never mutate progress',()=>{
 const save=blankSave();chooseStarter(save,7,'may');
 save.records={'forest-adventure':{medals:2,time:65}};save.runs=1;
 const before=structuredClone(save);
 for(const password of ['',null,undefined,1234,'123','12345',' 1234','1234 ','0000']){
  assert.equal(unlockAdmin(save,password),false);assert.deepEqual(save,before);
 }
 assert.equal(unlockAdmin(save,'1234'),true);
 assert.equal(save.adminUnlocked,true);assert.equal(save.unlocked,ROUTES.length-1);
 assert.deepEqual(new Set(save.owned),new Set(Object.values(SPECIES).map(p=>p.id)));
 assert.equal(save.owned.length,25);assert.equal(save.starter,7);assert.equal(save.trainer,'may');
 assert.deepEqual(save.records,before.records);assert.equal(save.runs,before.runs);
 assert.deepEqual(sanitizeSave(JSON.parse(JSON.stringify(save))),save);
 assert.equal(chooseStarter(save,25,'red'),false);
 const unlocked=structuredClone(save);unlockAdmin(save,'1234');assert.deepEqual(save,unlocked);
});

test('admin unlock works before team selection and survives choosing any starter',()=>{
 for(const starter of STARTERS){
  let save=blankSave();assert.equal(unlockAdmin(save,'1234'),true);
  save=sanitizeSave(JSON.parse(JSON.stringify(save)));
  assert.equal(save.starter,null);assert.equal(save.owned.length,25);
  assert.equal(chooseStarter(save,starter,'brendan'),true);
  assert.equal(save.starter,starter);assert.equal(save.owned.length,25);
  assert.equal(save.unlocked,ROUTES.length-1);assert.deepEqual(sanitizeSave(save),save);
 }
});

test('admin roster can use every partner, route, and mode while catches still work',()=>{
 const save=blankSave();chooseStarter(save,25,'red');unlockAdmin(save,'1234');
 for(const id of collectionIds(save))for(let route=0;route<ROUTES.length;route++)for(const mode of Object.keys(MODES)){
  const g=createMaze(route,mode,84,id===25?7:25,nextReward(save,route));
  assert.equal(switchPartner(g,id,save.owned),true);assert.equal(g.partner,id);
 }
 const mountain=ROUTES.findIndex(r=>r.id==='mountain');const g=createMaze(mountain,'expert',84,6,nextReward(save,mountain));g.status='won';
 assert.equal(completeRun(save,g),true);assert.equal(save.owned.length,25);
 assert.equal(save.unlocked,ROUTES.length-1);assert.equal(save.runs,1);
 assert.ok(save.records['mountain-expert']);assert.equal(completeRun(save,g),false);
});

test('ordinary saves retain exclusive starters and nonboolean admin flags do not activate unlock',()=>{
 for(const flag of [undefined,false,'true','1234',1]){
  const save=sanitizeSave({...blankSave(),starter:4,owned:[1,4,7,25,10],adminUnlocked:flag});
  assert.equal(save.adminUnlocked,false);assert.deepEqual(save.owned,[4,10]);
  assert.equal(save.unlocked,0);assert.equal(collectionIds(save).length,22);
 }
});

test('new campaigns progress from Granite Highlands to Viridian Forest in the requested order',()=>{
 assert.deepEqual(ROUTES.map(r=>r.id),['mountain','creek','autumn','cave','frost','volcano','forest']);
 let save=blankSave();chooseStarter(save,7,'may');
 assert.deepEqual(save.unlockedRoutes,['mountain']);
 assert.equal(createMaze().reward,27);
 for(let route=0;route<ROUTES.length;route++){
  assert.ok(isRouteUnlocked(save,route));
  for(let locked=route+1;locked<ROUTES.length;locked++)assert.equal(isRouteUnlocked(save,locked),false);
  const g=createMaze(route,'relaxed',84,7,nextReward(save,route));g.status='won';
  completeRun(save,g);save=sanitizeSave(JSON.parse(JSON.stringify(save)));
  assert.equal(save.unlockedRoutes.length,Math.min(route+2,ROUTES.length));
  assert.ok(save.owned.includes(ROUTES[route].rewards[0]));
  assert.ok(save.records[ROUTES[route].id+'-relaxed']);
 }
 assert.equal(save.runs,7);assert.equal(save.unlocked,6);
});

test('every legacy unlock frontier keeps its biomes without granting unrelated trails',()=>{
 const order=['forest','creek','autumn','cave','frost','volcano','mountain'];
 for(let frontier=0;frontier<order.length;frontier++){
  const raw={version:1,starter:25,trainer:'brendan',owned:[25,10],unlocked:frontier,records:{},runs:4,mode:'expert',sound:true,reduced:true};
  const save=sanitizeSave(raw),expected=new Set(['mountain',...order.slice(0,frontier+1)]);
  assert.deepEqual(new Set(save.unlockedRoutes),expected);
  assert.deepEqual(save.owned,raw.owned);assert.equal(save.trainer,raw.trainer);assert.equal(save.runs,4);
  assert.equal(save.mode,'expert');assert.equal(save.sound,true);assert.equal(save.reduced,true);
  for(let i=0;i<ROUTES.length;i++)assert.equal(isRouteUnlocked(save,i),expected.has(ROUTES[i].id));
  assert.deepEqual(sanitizeSave(JSON.parse(JSON.stringify(save))),save);
 }
});

test('old Forest records and replays do not unlock every trail after the swap',()=>{
 const raw={starter:25,trainer:'leaf',owned:[25,10],unlocked:0,records:{'forest-adventure':{medals:3,time:42}},runs:1};
 let save=sanitizeSave(raw);
 assert.deepEqual(save.unlockedRoutes,['mountain','creek','forest']);
 assert.deepEqual(save.records,raw.records);
 for(let reload=0;reload<3;reload++)save=sanitizeSave(JSON.parse(JSON.stringify(save)));
 const replay=createMaze(6,'adventure',84,25,nextReward(save,6));replay.status='won';
 completeRun(save,replay);save=sanitizeSave(JSON.parse(JSON.stringify(save)));
 assert.deepEqual(save.unlockedRoutes,['mountain','creek','forest']);
 assert.equal(save.records['forest-adventure'].medals,3);
 assert.equal(isRouteUnlocked(save,2),false);
});

test('current saves validate route IDs and retain only valid completion-based unlocks',()=>{
 const save=sanitizeSave({...blankSave(),starter:25,unlocked:6,unlockedRoutes:['mountain','unknown','__proto__',null,'mountain'],records:{'forest-adventure':{time:-1,medals:3}}});
 assert.deepEqual(save.unlockedRoutes,['mountain']);assert.equal(save.unlocked,0);
 for(const index of [-1,7,NaN,'0',null])assert.equal(isRouteUnlocked(save,index),false);
 const legacy=sanitizeSave({version:1,starter:25,unlocked:0,records:{'mountain-expert':{time:60,medals:2}}});
 assert.equal(legacy.unlockedRoutes.length,7);
});
