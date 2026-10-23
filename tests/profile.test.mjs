import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePlayerName,playerDisplayName,hiddenTrainerAvailable,availableTrainers,setTrainerProfile} from '../dist/profile.mjs';
import {blankSave,chooseStarter,sanitizeSave} from '../dist/game.mjs';
import {unlockAdmin,resetProgress} from '../dist/progress.mjs';

test('blank names use the selected trainer default and legacy saves retain progress',()=>{
 const save=blankSave();assert.equal(playerDisplayName(save),'Red');
 assert.ok(chooseStarter(save,7,'may','   '));assert.equal(save.playerName,'');assert.equal(playerDisplayName(save),'May');
 const legacy={...save,trainer:'leaf',runs:4,records:{'mountain-adventure':{time:20,medals:2}}};delete legacy.playerName;
 const loaded=sanitizeSave(legacy);assert.equal(loaded.playerName,'');assert.equal(playerDisplayName(loaded),'Leaf');
 assert.deepEqual(loaded.owned,legacy.owned);assert.deepEqual(loaded.records,legacy.records);assert.equal(loaded.runs,4);
});

test('names are bounded Unicode text, trimmed and saved without changing starter or progress',()=>{
 for(const value of [null,undefined,{},42])assert.equal(normalizePlayerName(value),'');
 assert.equal(normalizePlayerName('  Sky   Blue  '),'Sky Blue');
 assert.equal(normalizePlayerName('A\u0000\u202e\u200bB'),'AB');
 assert.equal(Array.from(normalizePlayerName('🌟'.repeat(30))).length,20);
 const save=blankSave();chooseStarter(save,1,'red');save.runs=2;
 assert.ok(setTrainerProfile(save,'may',' Sky Blue '));assert.equal(playerDisplayName(save),'Sky Blue');
 assert.equal(save.starter,1);assert.equal(save.runs,2);assert.deepEqual(save.owned,[1]);
 assert.deepEqual(sanitizeSave(JSON.parse(JSON.stringify(save))),save);
 assert.equal(resetProgress({setItem(){}}).save.playerName,'');
});

test('only the Kayden name reveals the hidden trainer, including for admins',()=>{
 for(const name of ['', 'Sky', 'Kayden!', 'Kayden Jr', 'Kay den', null]){
  assert.equal(hiddenTrainerAvailable(name),false);
  assert.ok(!availableTrainers(name).some(([id])=>id==='kayden'));
  const save=blankSave();unlockAdmin(save,'1234');const before=structuredClone(save);
  assert.equal(chooseStarter(save,25,'kayden',name),false);assert.deepEqual(save,before);
  assert.equal(setTrainerProfile(save,'kayden',name),false);assert.deepEqual(save,before);
  assert.equal(sanitizeSave({...save,trainer:'kayden',playerName:name}).trainer,'red');
 }
 for(const name of ['Kayden','kayden','KAYDEN','  Kayden  ']){
  assert.ok(hiddenTrainerAvailable(name));assert.equal(availableTrainers(name).length,9);
  const save=blankSave();assert.ok(chooseStarter(save,4,'kayden',name));
  assert.equal(save.trainer,'kayden');assert.deepEqual(sanitizeSave(save),save);
  assert.ok(setTrainerProfile(save,'red',''));assert.equal(playerDisplayName(save),'Red');
 }
});

test('invalid trainer or repeat starter selection cannot partially overwrite a profile',()=>{
 const save=blankSave();chooseStarter(save,25,'kayden','Kayden');const before=structuredClone(save);
 assert.equal(setTrainerProfile(save,'unknown','Sky'),false);assert.deepEqual(save,before);
 assert.equal(chooseStarter(save,7,'red','Sky'),false);assert.deepEqual(save,before);
 assert.equal(chooseStarter(blankSave(),999,'kayden','Kayden'),false);
});
