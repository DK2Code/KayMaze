import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.resolve(fileURLToPath(new URL('./dist/',import.meta.url)));
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.txt':'text/plain'};
const port=Number(process.env.PORT)||4175;
http.createServer(async(req,res)=>{try{const url=decodeURIComponent(new URL(req.url,'http://local').pathname);const file=path.resolve(root,'.'+(url.endsWith('/')?url+'index.html':url));if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html'))throw Error('Invalid path');if(!(await stat(file)).isFile())throw Error('Missing');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>{const url=`http://127.0.0.1:${port}`;console.log(`KayMaze ready: ${url}`);if(process.argv.includes('--open')&&process.platform==='win32')spawn('cmd',['/c','start','',url],{windowsHide:true,stdio:'ignore'});}).on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use. If KayMaze is running, open http://127.0.0.1:${port}.`:error.message);process.exitCode=1;});
