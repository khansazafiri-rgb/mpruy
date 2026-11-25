// Private noncommercial comparison only. Original markup and CSS remain under
// their declared legacy license. Never embed in production or the normal build.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function attachOriginalShell(root,out){
 const legacy=path.join(root,'apps/anatomy');
 const read=rel=>{const f=path.join(legacy,rel);assert(fs.realpathSync(f)===f&&fs.statSync(f).isFile());return fs.readFileSync(f,'utf8');};
 const html=read('index.html'),css=read('src/styles/atlas-v3.css'),tokens=read('src/styles/medcoel-tokens.css'),license=read('LICENSE');
 assert(license.includes('CC BY-NC-SA 4.0'),'Review original UI rights before proceeding');
 const body=html.match(/<body>([\s\S]*?)<\/body>/i)?.[1];
 assert(body&&body.includes('id="systemsList"')&&body.includes('id="threeCanvas"'));
 let shell=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 // Avoid unavailable old brand/mascot routes and any legacy thumbnails.
 const logo=path.join(root,'apps/web/src/assets/logo-mark.webp');
 assert(fs.realpathSync(logo)===logo&&fs.statSync(logo).isFile());
 shell=shell.replace(/src="\/brand\/logo-mark\.webp"/g,'src="data:image/webp;base64,'+fs.readFileSync(logo).toString('base64')+'"');
 shell=shell.replace(/<img\b[^>]*src="\/brand\/mascots\/[^"]+"[^>]*>/gi,'');
 assert(!/<script\b|\son[a-z]+\s*=|src="\/brand\//i.test(shell),'Unexpected original shell executable or asset');
 // Legacy help text refers to withheld data, not the independent dataset.
 shell=shell.replace(/<div class="modal-body">[\s\S]*?(?=<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*$)/,'<div class="modal-body"><p>Review lokal privat. Model dari BodyParts3D; referensi HRA terpisah. Regio, lapisan, dan orientasi belum tervalidasi. UI asli digunakan untuk perbandingan nonkomersial.</p><p><a href="./MODEL-ATTRIBUTIONS.json" target="_blank" rel="noopener">Atribusi model</a></p><p><a href="./THIRD-PARTY-NOTICES.txt" target="_blank" rel="noopener">Lisensi software</a></p>');
 // Keep the exact original CSS, loaded after the independent bundle CSS.
 const extra=String.raw
`#originalEngineControls{display:none!important}
#viewerContainer>#view{position:absolute;inset:0;width:100%;height:100%;background:transparent}
#viewerContainer>#view>:not(canvas){display:none!important}
#app .atlas-stage{display:block;height:auto;grid-template:none}
#app .atlas-topbar{height:var(--topbar);padding:0 14px;gap:12px}
#app .atlas-topbar input{width:100%}
#app :is(.sys-toggle,.sys-more,.sys-steps button,.atlas-navigation button,.control-btn,.btn-icon,.atlas-result,.action-btn){font-family:inherit}
#app .atlas-systembar .sidebar-content{overflow-x:auto}
#app .atlas-infobox{padding:0}
#app .atlas-region-button{width:auto}
#app .atlas-scene-bottom{pointer-events:auto}
#app .atlas-scene-bottom button{font-size:11px;border:1px solid #45685d;background:transparent;color:inherit;border-radius:6px;padding:3px 8px}
#app .atlas-bp3d{pointer-events:none}
#originalBrowse[hidden]{display:none!important}
#originalBrowse{overflow:auto}
#originalBrowseList{overflow:auto;padding:8px}
#originalBrowseList button{display:block;width:100%;text-align:left;background:transparent;color:rgb(var(--ink));border:0;border-bottom:1px solid rgb(var(--line));padding:8px}
#originalBrowseList button:hover{background:rgb(var(--brand-soft))}
#app .atlas-result{color:rgb(var(--ink))}
@media(max-width:900px){#app .atlas-topbar{padding:0 8px;gap:6px}}
`;
 const dest=path.join(out,'assets','original-shell-private.css');
 fs.writeFileSync(dest,tokens+'\n'+css+'\n'+extra,{flag:'wx',mode:0o600});
 const index=path.join(out,'index.html'),built=fs.readFileSync(index,'utf8');
 assert(built.includes('</head>')&&built.includes('</body>'));
 fs.writeFileSync(index,built.replace('</head>','<link rel="stylesheet" href="./assets/original-shell-private.css"></head>').replace('</body>','<template id="originalShellTemplate">'+shell+'</template></body>'));
 return {mode:'PRIVATE_ORIGINAL_UI_COMPARISON',publicRelease:'NO_GO',legacyLicense:'CC BY-NC-SA 4.0',sourceHashes:{html:hash(html),css:hash(css),tokens:hash(tokens),license:hash(license)},legacyJavascriptIncluded:false};
}
