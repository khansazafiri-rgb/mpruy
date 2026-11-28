// First-party MEDCOEL presentation authored 2026-11-27 from visual requirements.
// Does not read, import, or copy the legacy NC application's HTML/CSS/JS.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
export function attachIndependentShell(root,out){
 const source=path.join(fs.realpathSync(root),'apps/atlas-independent/presentation');
 const read=name=>{const file=path.join(source,name);assert.equal(fs.realpathSync(file),file,'Unsafe presentation source');assert(fs.statSync(file).isFile());return fs.readFileSync(file,'utf8');};
 const markup=read('medcoel-anatomy-shell.html'),css=read('medcoel-anatomy-shell.css');
 assert(!/<script\b|\son[a-z]+\s*=|<img\b/i.test(markup),'Unexpected executable or external image in presentation');
 assert(!/@import|url\s*\(/i.test(css),'Presentation must not import external or legacy stylesheet assets');
 const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate presentation IDs');
 const index=path.join(out,'index.html'),built=fs.readFileSync(index,'utf8');
 assert(built.includes('</head>')&&built.includes('</body>')&&!built.includes('originalShellTemplate'),'Invalid build or presentation already attached');
 const cssPath=path.join(out,'assets/medcoel-independent-shell.css');
 fs.mkdirSync(path.dirname(cssPath),{recursive:true});fs.writeFileSync(cssPath,css,{flag:'wx'});
 fs.writeFileSync(index,built.replace('</head>','<link rel="stylesheet" href="./assets/medcoel-independent-shell.css"></head>').replace('</body>','<template id="originalShellTemplate">'+markup+'</template></body>'));
 return {schema:1,mode:'INDEPENDENT_MEDCOEL_PRESENTATION',legacyCodeIncluded:false,legacyJavascriptIncluded:false,externalAssets:0,sourceHashes:{markup:sha(markup),css:sha(css)},publicRelease:'NO_GO',note:'Software presentation evidence only. Does not approve models, clinical accuracy, or a public release.'};
}
