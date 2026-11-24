// Independent viewer rehearsal. No copy of private model bytes into dist/public.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {prepare} from './prepare-atlas-publication-review.mjs';
import {inspectInstalled,publicationBundleGate} from './atlas-independent-dependency-audit.mjs';
import {checkSourceNotices} from './audit-atlas-publication-rights.mjs';
import {buildHraRegistry,serveHraReference} from './atlas-hra-private-reference.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const app=path.join(root,'apps/atlas-independent');
const privateRoot=path.join(root,'local-data/licensing-quarantine');
const folder=process.argv[2]||'';
assert(/^z-anatomy-native-preview-[a-zA-Z0-9_-]+$/.test(folder),'Explicit private preview folder required');
const review=prepare(folder);
const pack=path.join(privateRoot,folder,'pack');
const inv=JSON.parse(fs.readFileSync(path.join(pack,'inventory.json'),'utf8'));
const manifest={schema:1,mode:'private-review',publicRelease:'NO_GO',entries:inv.converted.map(e=>({
 id:e.id,name:e.name,group:e.group,regions:e.privateAtlasMeta.regions,layer:e.privateAtlasMeta.layer,path:'models/'+e.id+'.glb',approvedForDistribution:false
}))};
const models=new Map(inv.converted.map(e=>['/anatomy/viewer/models/'+e.id+'.glb',path.join(pack,e.modelPath)]));
const req=createRequire(path.join(app,'package.json'));
const {build}=await import(pathToFileURL(req.resolve('vite')).href);
const out=fs.mkdtempSync(path.join(privateRoot,'atlas-independent-review-'));
const dependencyAudit=inspectInstalled(app),sourceNotices=checkSourceNotices(),bundleRecord={};
const noticeDir=path.join(root,'licensing/atlas-publication/source-notices');
const notices='MEDCOEL independent viewer — software notices\n\n'+['three','vite'].map(n=>fs.readFileSync(path.join(noticeDir,n+'.txt'),'utf8')).join('\n\n');
await build({root:app,configFile:false,publicDir:false,base:'/anatomy/viewer/',plugins:[publicationBundleGate(app,notices,bundleRecord)],build:{outDir:out,emptyOutDir:true,sourcemap:false}});
fs.writeFileSync(path.join(privateRoot,folder,'publication-software-audit.json'),JSON.stringify({...dependencyAudit,sourceNotices,bundle:bundleRecord},null,2)+'\n',{mode:0o600});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
let hra;try{hra=await buildHraRegistry(privateRoot);}catch(error){hra={assets:new Map(),blocked:[{reason:String(error.message||error)}]};}
const port=Number(process.env.PORT||4186);assert(Number.isInteger(port)&&port>=1024&&port<=65535);
const server=createServer((request,response)=>{
 const send=(status,body,type='text/plain; charset=utf-8')=>{response.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});response.end(request.method==='HEAD'?undefined:body);};
 if(request.headers.host!=='127.0.0.1:'+port||!['GET','HEAD'].includes(request.method))return send(403,'Loopback review only');
 let p;try{p=new URL(request.url,'http://127.0.0.1:'+port).pathname;if(p!==decodeURIComponent(p))return send(404,'Not found');}catch{return send(400,'Invalid path');}
 if(p==='/anatomy/viewer/inventory.json')return send(200,JSON.stringify(manifest),mime['.json']);
 if(p.startsWith('/anatomy/viewer/hra-reference/')&&serveHraReference(request,response,hra))return;
 const model=models.get(p);
 if(model){
  try{assert(fs.realpathSync(model)===model);const info=fs.statSync(model);assert(info.isFile());
  response.writeHead(200,{'Content-Type':'model/gltf-binary','Content-Length':info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(request.method==='HEAD'){response.end();return;}
  const stream=fs.createReadStream(model);stream.on('error',()=>response.destroy());response.on('close',()=>stream.destroy());stream.pipe(response);return;
  }catch{return send(404,'Model not available');}
 }
 if(p!=='/anatomy/viewer/'&&p!=='/anatomy/viewer/THIRD-PARTY-NOTICES.txt'&&!/^\/anatomy\/viewer\/assets\/[a-zA-Z0-9_.-]+\.(js|css)$/.test(p))return send(404,'Not found');
 const file=path.join(out,p==='/anatomy/viewer/'?'index.html':p.slice('/anatomy/viewer/'.length));
 try{assert(fs.realpathSync(file)===file&&fs.statSync(file).isFile());return send(200,fs.readFileSync(file),mime[path.extname(file)]);}
 catch{return send(404,'Not found');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
console.log('INDEPENDENT PRIVATE ATLAS:', 'http://127.0.0.1:'+port+'/anatomy/viewer/');
console.log('CANDIDATE MODELS:',review.totals.candidates,'APPROVED:',review.totals.approved,'PUBLIC RELEASE: NO_GO');
