import {TRAINERS} from './world-art.mjs';

export const PLAYER_NAME_LIMIT=20;
export function normalizePlayerName(value){
 if(typeof value!=='string')return '';
 return Array.from(value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,'').replace(/\s+/g,' ').trim()).slice(0,PLAYER_NAME_LIMIT).join('').trim();
}
export const hiddenTrainerAvailable=name=>normalizePlayerName(name).toLowerCase()==='kayden';
export const trainerAvailable=(id,name)=>Object.hasOwn(TRAINERS,id)&&(!TRAINERS[id].hidden||hiddenTrainerAvailable(name));
export const availableTrainers=name=>Object.entries(TRAINERS).filter(([id])=>trainerAvailable(id,name)).sort((a,b)=>Number(!!b[1].hidden)-Number(!!a[1].hidden));
export const playerDisplayName=save=>normalizePlayerName(save.playerName)||TRAINERS[save.trainer]?.name||TRAINERS.red.name;
export function setTrainerProfile(save,trainer,name=save.playerName){
 const playerName=normalizePlayerName(name);
 if(!trainerAvailable(trainer,playerName))return false;
 save.trainer=trainer;save.playerName=playerName;return true;
}
