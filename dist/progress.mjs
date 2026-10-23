import {blankSave,collectionIds,unlockRoutes} from './game.mjs';
import {ROUTES} from './data.mjs';

export const SAVE_KEY='kaymaze-expedition-v1';

// Local playtest unlock: keep earned records and the chosen team intact.
export function unlockAdmin(save,password){
 if(password!=='1234')return false;
 save.adminUnlocked=true;
 save.owned=collectionIds(save);
 unlockRoutes(save,ROUTES.map(r=>r.id));
 return true;
}

// Replace only KayMaze's save. Other games and browser data are untouched.
export function resetProgress(storage){
 const save=blankSave();
 try{storage.setItem(SAVE_KEY,JSON.stringify(save));return {save,stored:true};}
 catch{return {save,stored:false};}
}
