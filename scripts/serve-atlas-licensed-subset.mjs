// Bounded local rehearsal server. Only a fully verified package is reachable.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {verifyPackage} from './build-atlas-licensed-subset.mjs';
const folder=fs.realpathSync(process.argv[2]),receipt=verifyPackage(folder),files=new Set(receipt.files.map(x=>x.path));
const port=Number(process.argv[3]||4191);assert(Number.isInteger(port)&&port>=1024&&port<65536);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.glb':'model/gltf-binary'};
const server=createServer((req,res)=>{
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'"};
 const send=(code,b,type='text/plain; charset=utf-8')=>{res.writeHead(code,{...headers,'Content-Type':type,'Content-Length':Buffer.byteLength(b)});res.end(req.method==='HEAD'?undefined:b);};
 if(req.headers.host!==`127.0.0.1:${port}`||!['GET','HEAD'].includes(req.method))return send(404,'Not found');
 if(req.headers.origin&&req.headers.origin!==`http://127.0.0.1:${port}`||req.headers['sec-fetch-site']==='cross-site')return send(403,'Forbidden');
 const raw=req.url.split('?')[0];if(raw==='/anatomy/viewer') {res.writeHead(308,{...headers,Location:'/anatomy/viewer/'});return res.end();}
 if(!raw.startsWith('/anatomy/viewer/')||/%|\\|\.\./.test(raw))return send(404,'Not found');
 const rel=raw.slice('/anatomy/viewer/'.length)||'index.html';if(!files.has(rel))return send(404,'Not found');
 const file=path.join(folder,rel);if(fs.realpathSync(file)!==file)return send(404,'Not found');
 send(200,fs.readFileSync(file),types[path.extname(file)]);
});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${port}/anatomy/viewer/`,models:receipt.models,packageContentsSHA256:receipt.packageContentsSHA256})));
