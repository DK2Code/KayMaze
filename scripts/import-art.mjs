import {mkdir,readFile,writeFile,copyFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const sourceDirectory=process.argv[2];
if(!sourceDirectory){console.error('Usage: node scripts/import-art.mjs <source-directory>');process.exit(1);}
const source=pathToFileURL(resolve(sourceDirectory)+sep),dest=new URL('../dist/',import.meta.url);
const {DIRECTIONAL}=await import(new URL('directional-data.mjs',source));
const ids=[27,66,104,25,1,4,7,10,16,43,54,60,120,37,58,77,41,74,95,86,124,131,138,147,6,151];
for(const dir of ['arena','assets','assets/directional','assets/trainers'])await mkdir(new URL(dir+'/',dest),{recursive:true});
const hashes={};
for(const name of ['sprite-animation.mjs','combat-art.mjs','move-art.mjs','moves.mjs','move-data.mjs','loadouts.mjs','trainers.mjs','trainer-art.mjs']){const bytes=await readFile(new URL(name,source));hashes[name]=createHash('sha256').update(bytes).digest('hex');await writeFile(new URL('arena/'+name,dest),bytes);}
const subset=Object.fromEntries(ids.map(id=>[id,DIRECTIONAL[id]]));
await writeFile(new URL('arena/directional-data.mjs',dest),'export const DIRECTIONAL='+JSON.stringify(subset)+';\n');
for(const id of ids){await copyFile(new URL(`assets/${id}.png`,source),new URL(`assets/${id}.png`,dest));for(const state of Object.values(subset[id].states))await copyFile(new URL('assets/directional/'+state.file,source),new URL('assets/directional/'+state.file,dest));await copyFile(new URL(`assets/directional/${id}-credits.txt`,source),new URL(`assets/directional/${id}-credits.txt`,dest));}
for(const name of await readdir(new URL('assets/directional/',source))){if(!/^\d+-/.test(name)&&!name.endsWith('.png'))await copyFile(new URL('assets/directional/'+name,source),new URL('assets/directional/'+name,dest));}
for(const name of await readdir(new URL('assets/trainers/',source)))await copyFile(new URL('assets/trainers/'+name,source),new URL('assets/trainers/'+name,dest));
await copyFile(new URL('assets/CREDITS.txt',source),new URL('assets/CREDITS.txt',dest));
await writeFile(new URL('arena/source.json',dest),JSON.stringify({source:'Bundled animation and effect modules',files:hashes},null,2));
console.log(`Imported ${ids.length} Pokémon and shared animation/effect modules.`);
