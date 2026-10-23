import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DIRECTIONAL} from '../dist/arena/directional-data.mjs';
import {SPECIES} from '../dist/data.mjs';
import {spriteSample} from '../dist/arena/sprite-animation.mjs';
test('all portraits, directions, poses and artist credits are packaged locally',async()=>{for(const id of Object.keys(SPECIES)){await access(new URL(`../dist/assets/${id}.png`,import.meta.url));await access(new URL(`../dist/assets/directional/${id}-credits.txt`,import.meta.url));for(const [state,meta]of Object.entries(DIRECTIONAL[id].states)){await access(new URL(`../dist/assets/directional/${meta.file}`,import.meta.url));assert.ok(meta.frames>0);assert.equal(meta.durations.length,meta.frames);for(let row=0;row<meta.directions;row++){assert.equal(meta.anchors[row].length,meta.frames);assert.equal(meta.heads[row].length,meta.frames);}}for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){const s=spriteSample({id,hp:1,lookAngle:angle,vx:30,step:3});assert.equal(s.state,'Walk');assert.ok(s.frame<s.meta.frames);}}});
test('shared Arena animation and effects match the original byte for byte',async()=>{const manifest=JSON.parse(await readFile(new URL('../dist/arena/source.json',import.meta.url)));for(const [name,hash]of Object.entries(manifest.files)){const bytes=await readFile(new URL('../dist/arena/'+name,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,name);}});
