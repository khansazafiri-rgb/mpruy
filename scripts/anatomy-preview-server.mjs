import {createServer} from 'node:http';import {readFile,stat} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {apiFixture} from '../preview/fixtures.mjs';
const repo=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.wasm':'application/wasm','.woff2':'font/woff2','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain'};
export function createPreviewServer({mainRoot=path.join(repo,'apps/web/dist-anatomy-preview'),atlasRoot=path.resolve(repo,'../anatomy/dist')}={}){
 return createServer(async(req,res)=>{
  const send=(status,body,type='text/plain; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?'':body);};
  try{
   if(!['GET','HEAD'].includes(req.method))return send(405,'Preview is read-only');
   let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return send(400,'Invalid URL');}
   if(pathname.split('/').includes('..')||pathname.includes('\\'))return send(400,'Invalid path');
   res.setHeader('X-Frame-Options',pathname.startsWith('/anatomy/viewer/')?'SAMEORIGIN':'DENY');
   if(pathname.startsWith('/anatomy/viewer/'))res.setHeader('Content-Security-Policy',"frame-ancestors 'self'");
   if(pathname.startsWith('/api/')){const fixture=apiFixture(pathname);return fixture?send(200,JSON.stringify(fixture),'application/json'):send(404,JSON.stringify({message:'This preview has no backend endpoint.'}),'application/json');}
   if(pathname==='/anatomy/viewer'){res.writeHead(308,{Location:'/anatomy/viewer/'});return res.end();}
   const atlas=pathname.startsWith('/anatomy/viewer/');
   const root=path.resolve(atlas?atlasRoot:mainRoot);
   const relative=atlas?pathname.slice('/anatomy/viewer/'.length):pathname.slice(1);
   let file=path.resolve(root,relative||'index.html');
   if(file!==root&&!file.startsWith(root+path.sep))return send(403,'Forbidden');
   let info;try{info=await stat(file);}catch{}
   if(info?.isDirectory()){file=path.join(file,'index.html');try{info=await stat(file);}catch{info=null;}}
   if(!info?.isFile()){
    // Only the main SPA receives HTML fallback. Asset misses are always 404.
    if(atlas||path.extname(pathname)||pathname.startsWith('/assets/'))return send(404,'Asset not found');
    file=path.join(root,'index.html');
   }
   return send(200,await readFile(file),types[path.extname(file)]||'application/octet-stream');
  }catch{return send(500,'Preview file unavailable');}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||4180);const mainRoot=process.env.MAIN_BUILD?path.resolve(repo,process.env.MAIN_BUILD):undefined;
 const atlasRoot=process.env.ANATOMY_DIST?path.resolve(repo,process.env.ANATOMY_DIST):undefined;
 createPreviewServer({mainRoot,atlasRoot}).listen(port,'127.0.0.1',()=>console.log(`MEDCOEL integration preview: http://127.0.0.1:${port}/lab`));
}
