import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaze,tick} from '../dist/game.mjs';
import {createExplorerControls,cellAtPoint} from '../dist/controls.mjs';

function corridor(){
 const g=createMaze(0,'adventure',917,25,10);
 g.grid=g.grid.map(row=>row.map(()=>1));for(let x=1;x<=10;x++)g.grid[1][x]=0;
 g.player={x:1,y:1};g.follower={x:1,y:1};g.facing=1;g.obstacles.clear();g.stars.clear();
 return g;
}
function drive(g,c,seconds){for(let t=0;t<seconds;t+=.025){c.update(g,.025);tick(g,.025);}}
function tree(g,x=5,y=1){const o={x,y,kind:'tree',hp:6,maxHp:6,hit:0};g.grid[y][x]=0;g.obstacles.set(`${x},${y}`,o);return o;}

test('a quick direction keypress moves once even when released before the next frame',()=>{
 const g=corridor(),c=createExplorerControls();c.pressMove(g,'ArrowRight',1);c.release('ArrowRight');
 drive(g,c,1);assert.deepEqual(g.player,{x:2,y:1});assert.equal(g.moves,1);
 // A second tap during the first step is buffered, rather than dropped.
 c.pressMove(g,'ArrowRight',1);c.release('ArrowRight');drive(g,c,.05);
 c.pressMove(g,'ArrowRight',1);c.release('ArrowRight');drive(g,c,1);
 assert.deepEqual(g.player,{x:4,y:1});
});
test('independent movement and attack keys release without cancelling each other',()=>{
 const g=corridor(),c=createExplorerControls();c.pressMove(g,'ArrowRight',1);c.pressAttack(g,'Space');c.release('Space');
 assert.equal(c.direction,1);drive(g,c,.75);assert.ok(g.player.x>2);
 c.cancel('ArrowRight');const x=g.step?.to.x??g.player.x;drive(g,c,1);assert.equal(g.player.x,x);
});
test('clicking or tapping an obstacle walks into range and clears only that target at normal attack timing',()=>{
 const g=corridor(),c=createExplorerControls(),target=tree(g),other=tree(g,4,2);
 assert.equal(c.tapWorld(g,{x:5,y:1}),true);drive(g,c,.1);assert.equal(target.hp,6);
 drive(g,c,7);assert.equal(target.hp,0);assert.equal(other.hp,6);assert.deepEqual(g.player,{x:4,y:1});
 assert.equal(g.events.filter(e=>e.type==='attack').length,3);assert.equal(c.assisting,false);
});
test('opening a menu or issuing a new movement cancels assisted attacks and held inputs',()=>{
 const g=corridor(),c=createExplorerControls(),target=tree(g);
 c.tapWorld(g,{x:5,y:1});c.pressMove(g,'ArrowLeft',3);c.release('ArrowLeft');drive(g,c,3);assert.equal(target.hp,6);
 c.tapWorld(g,{x:5,y:1});c.pressAttack(g,'Space');c.reset(g);drive(g,c,3);
 assert.equal(target.hp,6);assert.equal(c.direction,null);assert.equal(c.assisting,false);
});
test('obstacle selection respects blocked paths and clears once a path is available',()=>{
 const g=corridor(),c=createExplorerControls(),target=tree(g);g.grid[1][3]=1;
 assert.equal(c.tapWorld(g,{x:5,y:1}),false);drive(g,c,5);assert.equal(target.hp,6);
 g.grid[1][3]=0;assert.equal(c.tapWorld(g,{x:5,y:1}),true);drive(g,c,5);
 assert.deepEqual(g.player,{x:4,y:1});assert.equal(target.hp,0);
});
test('selecting a new path cancels automatic clearing and walks to the new destination',()=>{
 const g=corridor(),c=createExplorerControls(),target=tree(g);
 c.tapWorld(g,{x:5,y:1});drive(g,c,.1);
 assert.equal(c.tapWorld(g,{x:3,y:1}),true);drive(g,c,5);
 assert.deepEqual(g.player,{x:3,y:1});assert.equal(target.hp,6);assert.equal(c.assisting,false);
 assert.equal(g.events.filter(e=>e.type==='attack').length,0);
});
test('tap coordinates exclude empty canvas margins in portrait and wide expanded views',()=>{
 const bitmap={width:1000,height:650},grid={w:20,h:14};
 const portrait={left:10,top:20,width:300,height:600};
 assert.equal(cellAtPoint(portrait,bitmap,grid,{x:160,y:30}),null);
 assert.deepEqual(cellAtPoint(portrait,bitmap,grid,{x:160,y:320}),{x:10,y:7});
 const wide={left:0,top:0,width:1200,height:325};
 assert.equal(cellAtPoint(wide,bitmap,grid,{x:10,y:160}),null);
 assert.deepEqual(cellAtPoint(wide,bitmap,grid,{x:600,y:162.5}),{x:10,y:7});
});
