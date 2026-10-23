export const TRAINERS=Object.freeze({
  red:{name:'Red',color:'#ec6258',shirt:'#d94442',hair:'#302c31',skin:'#efb68a',pants:'#456a98',hat:true},
  leaf:{name:'Leaf',color:'#91d2b3',shirt:'#58a49b',hair:'#78553b',skin:'#f1bf99',pants:'#cf697a',hat:true,long:true},
  blue:{name:'Blue',color:'#ac9be9',shirt:'#8666be',hair:'#a47548',skin:'#eab28b',pants:'#3a4b70',spiky:true},
  misty:{name:'Misty',color:'#ffd37e',shirt:'#efd45d',hair:'#e98137',skin:'#f5bb91',pants:'#548bb4',pony:true},
  brock:{name:'Brock',color:'#b6c58c',shirt:'#8d9d5c',hair:'#47372c',skin:'#c58d62',pants:'#855b43',spiky:true},
  sabrina:{name:'Sabrina',color:'#dd9cc6',shirt:'#b9587b',hair:'#383752',skin:'#eab1a2',pants:'#713e68',long:true}
});
export const validTrainer=id=>typeof id==='string'&&Object.hasOwn(TRAINERS,id);
export const validSpecies=id=>Number.isInteger(id)&&id>=1&&id<=151;
export const validTeam=ids=>Array.isArray(ids)&&ids.length>=1&&ids.length<=6&&ids.every(validSpecies)&&new Set(ids).size===ids.length;
export const normalizeTeam=(ids,fallback)=>validTeam(ids)?[...ids]:[fallback];
export const TEAM_DEFAULTS=Object.freeze({player:[6,25,3,9,131,143],enemy:[119,59,65,94,130,149]});
export const SENDOUT_RELEASE=1.15;
export const SENDOUT_DURATION=2.75;
export const RECALL_DURATION=1.35;
export const SWITCH_COOLDOWN=6;
export function releaseProgress(sequence,side){return sequence?.sides.includes(side)?Math.max(0,Math.min(1,(sequence.age-SENDOUT_RELEASE)/.6)):1;}
