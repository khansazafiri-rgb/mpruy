// Local host static allowlist. Never fall through to the old Atlas or Lab router.
import fs from 'node:fs';
import path from 'node:path';
import {apiFixture} from '../preview/fixtures.mjs';
import {privateLibraryRoute} from './independent-atlas-routes.mjs';
export function hostRoute(p,libraryEnabled=false){
 if(libraryEnabled&&privateLibraryRoute(p))return {kind:'file',rel:'index.html'};
 if(p==='/'||p==='/anatomy'||p==='/anatomy/'||p==='/anatomy/explore'||p==='/anatomy/explore/')return {kind:'file',rel:'index.html'};
 if(/^\/assets\/[A-Za-z0-9_.-]+\.(js|css|woff2|svg|png|webp|jpg|jpeg|ico)$/.test(p))return {kind:'file',rel:p.slice(1)};
 if(/^\/api\/[a-zA-Z0-9/_-]+$/.test(p))return {kind:'fixture',path:p};
 return null;
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon'};
export function createIndependentHostHandler(root,libraryEnabled=false){
 return (req,res,p)=>{
  const send=(code,body,type='text/plain; charset=utf-8')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':"frame-ancestors 'none'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'"});res.end(req.method==='HEAD'?undefined:body);};
  const r=hostRoute(p,libraryEnabled);if(!r)return send(404,'Not found');
  if(r.kind==='fixture'){const data=apiFixture(r.path);return data?send(200,JSON.stringify(data),'application/json'):send(404,'No local fixture');}
  const file=path.resolve(root,r.rel);
  try{if(!file.startsWith(root+path.sep)||fs.realpathSync(file)!==file||!fs.statSync(file).isFile())return send(404,'Not found');return send(200,fs.readFileSync(file),types[path.extname(file)]);}catch{return send(404,'Not found');}
 };
}
