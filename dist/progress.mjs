import {blankSave,collectionIds,unlockRoutes,sanitizeSave} from './game.mjs';
import {ROUTES} from './data.mjs';

export const SAVE_KEY='kaymaze-expedition-v1';

// Local playtest unlock: keep earned records and the chosen team intact.
export function unlockAdmin(save,password){
 if(password!=='1234')return false;
 if(!save.adminUnlocked){const earned=sanitizeSave(save);save.adminProgress={owned:[...earned.owned],unlockedRoutes:[...earned.unlockedRoutes],restoredFromRecords:false};}
 else if(!save.adminProgress)save.adminProgress=sanitizeSave(save).adminProgress;
 save.adminUnlocked=true;
 save.owned=collectionIds(save);
 unlockRoutes(save,ROUTES.map(r=>r.id));
 return true;
}

// Remove temporary grants, keeping the starter, real catches, and completed runs.
export function lockAdmin(save){
 if(!save.adminUnlocked)return false;
 const earned=sanitizeSave(save).adminProgress;
 save.adminUnlocked=false;save.owned=[...earned.owned];save.unlockedRoutes=[...earned.unlockedRoutes];save.adminProgress=null;
 unlockRoutes(save,[]);
 return true;
}

// Replace only KayMaze's save. Other games and browser data are untouched.
export function resetProgress(storage){
 const save=blankSave();
 try{storage.setItem(SAVE_KEY,JSON.stringify(save));return {save,stored:true};}
 catch{return {save,stored:false};}
}
