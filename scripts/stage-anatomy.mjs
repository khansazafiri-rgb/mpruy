// Copies reviewed static assets into a chosen frontend build; no service actions.
import {cp,mkdir,readFile} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../',import.meta.url));
const source=path.resolve(repo,process.env.ANATOMY_DIST||'../anatomy/dist');const dest=path.resolve(repo,process.env.MAIN_DIST||'apps/web/dist');
const html=await readFile(path.join(source,'index.html'),'utf8');if(!html.includes('/anatomy/viewer/assets/'))throw Error('Build Anatomy with ANATOMY_BASE=/anatomy/viewer/ first');
await mkdir(path.join(dest,'anatomy/viewer'),{recursive:true});await cp(source,path.join(dest,'anatomy/viewer'),{recursive:true});console.log('Staged separate Anatomy build inside '+dest+'/anatomy/viewer');
