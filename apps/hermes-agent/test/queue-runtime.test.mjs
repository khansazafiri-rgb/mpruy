import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createServer} from 'node:http';import {spawn} from 'node:child_process';import {once} from 'node:events';import {fileURLToPath,pathToFileURL} from 'node:url';
test('running agent delivers an already-announced antre submission and a pre-existing diproses submission without commands',async t=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hermes-runtime-'));t.after(()=>fs.rm(tmp,{recursive:true,force:true}));
 const make=(id,status)=>({id,code:'TEST-'+id,status,updated:'old',files:[{driveFileId:'demo-'+id,name:id+'.pdf'}]});const queued=make('queued','antre'),processing={...make('claimed','diproses'),contentKind:'materi'};let uploads=0,materiUploads=0;
 const server=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const url=new URL(req.url,'http://local');let result;
  if(url.pathname.endsWith('/auth-with-password'))result={token:'test-only',record:{id:'agent'}};
  else if(url.pathname==='/api/medcoel/agent/submissions')result={items:url.searchParams.get('status')==='antre'?[queued]:url.searchParams.get('status')==='diproses'?[processing]:[]};
  else if(url.pathname.startsWith('/api/medcoel/agent/submissions/'))result=url.pathname.endsWith('/queued')?queued:processing;
  else if(url.pathname.endsWith('/sendDocument')){assert.match(raw,/%PDF-/);if(raw.includes('claimed.pdf')){assert.match(raw,/_MATERI_PDF-/);assert.match(raw,/PPT MATERI/);materiUploads++;}uploads++;result={ok:true,result:{message_id:100+uploads}};}
  else if(url.pathname.endsWith('/getUpdates')){await new Promise(r=>setTimeout(r,100));result={ok:true,result:[]};}
  else result={ok:true,result:{message_id:50}};
  res.setHeader('content-type','application/json');res.end(JSON.stringify(result));
 });server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 await fs.writeFile(path.join(tmp,'state.json'),JSON.stringify({announced:{'queued:old':'2026-01-01'}}));
 const preload=path.join(tmp,'fake-drive.mjs');await fs.writeFile(preload,`const original=globalThis.fetch;globalThis.fetch=async(url,options)=>{const value=String(url);if(value.startsWith('https://oauth2.googleapis.com/'))return Response.json({access_token:'fake-drive',expires_in:3600});if(value.startsWith('https://www.googleapis.com/drive/'))return value.includes('alt=media')?new Response('%PDF-1.7\\nFake safe fixture',{headers:{'content-type':'application/pdf'}}):Response.json({mimeType:'application/pdf',size:30,capabilities:{canDownload:true}});return original(url,options);};`);
 const root=fileURLToPath(new URL('../',import.meta.url)),base='http://127.0.0.1:'+server.address().port;let log='';
 const child=spawn(process.execPath,['--import',pathToFileURL(preload).href,'src/index.mjs'],{cwd:root,env:{...process.env,MEDCOEL_API_BASE_URL:base,MEDCOEL_AGENT_IDENTITY:'fake',MEDCOEL_AGENT_PASSWORD:'fake',TELEGRAM_BOT_TOKEN:'fake',TELEGRAM_API_BASE:base,TELEGRAM_ADMIN_IDS:'7',GDRIVE_CLIENT_ID:'fake',GDRIVE_CLIENT_SECRET:'fake',GDRIVE_REFRESH_TOKEN:'fake',HERMES_STATE_DIR:tmp,HERMES_NOTIFY_WAITING:'false',HERMES_PDF_POLL_MS:'100',HERMES_QUEUE_POLL_MS:'5000'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});
 const done=once(child,'exit');let completed=false;
 for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,50));try{const state=JSON.parse(await fs.readFile(path.join(tmp,'state.json'),'utf8'));completed=Object.values(state.pdfJobs||{}).length===2&&Object.values(state.pdfJobs).every(j=>j.completionNotified&&j.files.every(f=>f.status==='delivered'&&f.messageId));if(completed)break;}catch{}}
 assert.ok(completed,log);assert.equal(uploads,2);assert.equal(materiUploads,1);child.kill('SIGTERM');await done;assert.equal(child.exitCode,0,log);
});
