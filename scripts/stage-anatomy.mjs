// Static release installation only. Never reloads Caddy or any application service.
import {cp,mkdir,readFile,writeFile,rename,symlink,lstat,readlink,rm,open,readdir,realpath} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';import {randomUUID,createHash} from 'node:crypto';
const repo=fileURLToPath(new URL('../',import.meta.url));
const systems=['skeletal','muscular','joints','cardiovascular','nervous','lymphatic','visceral'];
async function fingerprint(root){
 const files={};async function walk(relative=''){for(const entry of (await readdir(path.join(root,relative),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(!relative&&entry.name==='.release-source.json')continue;const file=path.posix.join(relative,entry.name);if(entry.isDirectory())await walk(file);else if(entry.isFile())files[file]=createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');else throw Error('Viewer source must contain regular files only');}}
 await walk();return {files,digest:createHash('sha256').update(JSON.stringify(files)).digest('hex')};
}
export async function validateViewer(root){
 const read=file=>readFile(path.join(root,file));
 const html=(await read('index.html')).toString();
 const assets=[...html.matchAll(/(?:src|href)="(\/anatomy\/viewer\/assets\/[^"#]+)"/g)].map(m=>m[1].slice('/anatomy/viewer/'.length));
 if(!assets.some(file=>file.endsWith('.js')))throw Error('Build Anatomy with base /anatomy/viewer/ first');
 for(const asset of assets){if(asset.split('/').includes('..'))throw Error('Invalid asset path');await read(asset);}
 const data={};for(const name of ['systems','atlas-catalog','lexicon','definitions','structure-thumbnails'])data[name]=JSON.parse((await read('data/'+name+'.json')).toString());
 for(const system of systems){if(!Array.isArray(data.systems[system]))throw Error('Incomplete systems registry');const bytes=await read('models/'+system+'.glb');if(bytes.length<12||bytes.subarray(0,4).toString()!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw Error('Invalid GLB '+system);}
 const wasm=await read('draco/draco_decoder.wasm');if(!wasm.subarray(0,4).equals(Buffer.from([0,97,115,109])))throw Error('Invalid Draco WASM');await read('draco/draco_wasm_wrapper.js');await read('draco/draco_decoder.js');
 for(const id of Object.values(data.systems).flat()){
  if(!data['atlas-catalog'][id])throw Error('Missing catalogue entry '+id);
  const file=data['structure-thumbnails'].structures?.[id]?.url;
  if(!/^thumbnails\/structures\/[a-f0-9]{24}\.webp$/.test(file||''))throw Error('Missing/invalid preview '+id);
  const bytes=await read(file);if(bytes.toString('ascii',8,12)!=='WEBP')throw Error('Invalid preview '+id);
 }
 return {structures:Object.values(data.systems).flat().length,indexSha256:createHash('sha256').update(html).digest('hex')};
}
async function previousTarget(dest){try{const stat=await lstat(dest);if(!stat.isSymbolicLink())throw Error('Viewer destination is a real directory; back it up and migrate to a release symlink first.');return path.resolve(path.dirname(dest),await readlink(dest));}catch(error){if(error.code==='ENOENT')return null;throw error;}}
async function activate(dest,target){const tmp=dest+'.next-'+randomUUID();await symlink(target,tmp,'dir');try{await rename(tmp,dest);}catch(error){await rm(tmp,{force:true});throw error;}}
export async function stageAnatomy({source=path.resolve(repo,process.env.ANATOMY_DIST||'apps/anatomy/dist'),dest=process.env.ANATOMY_VIEWER_DIR||'/var/lib/medcoel/anatomy-viewer',releaseId=process.env.ANATOMY_RELEASE_ID||new Date().toISOString().replace(/[^0-9]/g,''),rollback=false}={}){
 dest=path.resolve(dest);const webDist=path.resolve(repo,process.env.MAIN_DIST||'apps/web/dist');
 if(dest===webDist||dest.startsWith(webDist+path.sep))throw Error('Persistent Anatomy destination must be outside the main web dist');
 if(!/^[a-zA-Z0-9._-]{1,80}$/.test(releaseId))throw Error('Invalid release ID');
 const releases=path.join(path.dirname(dest),path.basename(dest)+'-releases'),recordFile=path.join(releases,'deployment.json');
 await mkdir(releases,{recursive:true});
 const lockFile=dest+'.stage.lock',lock=await open(lockFile,'wx');
 try{
  const previous=await previousTarget(dest);
  if(rollback){
   const record=JSON.parse(await readFile(recordFile,'utf8'));
   if(previous!==record.currentTarget||!record.previousTarget)throw Error('No matching previous release to roll back to');
   await validateViewer(record.previousTarget);await activate(dest,record.previousTarget);
   await writeFile(recordFile,JSON.stringify({currentTarget:record.previousTarget,previousTarget:previous,rolledBackAt:new Date().toISOString()},null,2)+'\n');
   return {dest,currentTarget:record.previousTarget,previousTarget:previous};
  }
  // A reviewed candidate is itself an atomic release symlink. Copy its directory
  // contents, not the symlink over the new release directory.
  source=await realpath(source);
  const validation=await validateViewer(source),release=path.join(releases,releaseId),content=await fingerprint(source);
  let exists=false;try{exists=(await lstat(release)).isDirectory();}catch(error){if(error.code!=='ENOENT')throw error;}
  if(exists){
   const installed=JSON.parse(await readFile(path.join(release,'.release-source.json'),'utf8'));
   if(installed.digest!==content.digest)throw Error('Release ID already exists with different content; choose a new release ID');
   for(const [file,hash]of Object.entries(content.files))if(createHash('sha256').update(await readFile(path.join(release,file))).digest('hex')!==hash)throw Error('Existing release content mismatch: '+file);
   await validateViewer(release);
   if(previous===release)return {dest,currentTarget:release,unchanged:true,...validation};
   const record={dest,currentTarget:release,previousTarget:previous,createdAt:new Date().toISOString(),...validation};
   await writeFile(recordFile,JSON.stringify(record,null,2)+'\n');await activate(dest,release);return record;
  }
  await mkdir(release);let activated=false;
  try{
   await cp(source,release,{recursive:true});
   await writeFile(path.join(release,'.release-source.json'),JSON.stringify(content));
   // Keep old hashed chunks reachable for tabs opened before this release.
   if(previous){try{await cp(path.join(previous,'assets'),path.join(release,'assets'),{recursive:true,force:false,errorOnExist:false});}catch(error){if(error.code!=='ENOENT')throw error;}}
   await validateViewer(release);
   const record={dest,currentTarget:release,previousTarget:previous,createdAt:new Date().toISOString(),...validation};
   // Keep rollback coordinates before switching; an interrupted process cannot
   // delete the formerly active release or copy a half-built tree into it.
   await writeFile(recordFile,JSON.stringify(record,null,2)+'\n');
   await activate(dest,release);activated=true;return record;
  }catch(error){if(!activated)await rm(release,{recursive:true,force:true});throw error;}
 }finally{await lock.close();await rm(lockFile,{force:true});}
}
if(process.argv[1]===fileURLToPath(import.meta.url))stageAnatomy({rollback:process.argv.includes('--rollback')}).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
