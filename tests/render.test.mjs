import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaze,attack,tick} from '../dist/game.mjs';
import {SPECIES,ROUTES} from '../dist/data.mjs';
import {createRenderer} from '../dist/art.mjs';
test('all landscapes, every partner move, and capture frames render finite geometry',()=>{
 let calls=0;const context=new Proxy({}, {get(target,name){if(name==='measureText')return()=>({width:40});if(name==='createRadialGradient'||name==='createLinearGradient')return(...args)=>{args.forEach(v=>assert.ok(Number.isFinite(v)));return{addColorStop(){}};};if(name in target)return target[name];return(...args)=>{calls++;for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),`${name} received ${value}`);};},set(target,name,value){target[name]=value;return true;}});
 const canvas=()=>({width:0,height:0,getContext:()=>context});globalThis.document={createElement:canvas};
 for(const id of Object.keys(SPECIES).map(Number))for(const route of ROUTES.map((r,i)=>i)){const g=createMaze(route,'adventure',13,id);g.player={x:1,y:1};g.follower={x:1,y:2};g.grid[1][2]=0;g.obstacles.set('2,1',{x:2,y:1,kind:'tree',hp:8,maxHp:8,hit:0});const draw=createRenderer(canvas());assert.ok(attack(g));for(let i=0;i<17;i++){tick(g,.05);draw(g,{trainerId:'leaf',reduced:false});draw(g,{trainerId:'red',reduced:true});}g.status='capturing';g.capture={age:0};for(let i=0;i<55;i++){tick(g,.05);draw(g,{trainerId:'misty'});}}
 assert.ok(calls>100000);delete globalThis.document;
});
