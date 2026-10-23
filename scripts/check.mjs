import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
for(const file of await readdir(new URL('../dist/',import.meta.url)))if(file.endsWith('.mjs')){const r=spawnSync(process.execPath,['--check','dist/'+file],{stdio:'inherit'});if(r.status)process.exit(r.status);}
const tests=(await readdir(new URL('../tests/',import.meta.url))).filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f);const result=spawnSync(process.execPath,['--test',...tests],{stdio:'inherit'});process.exit(result.status||0);
