// No external requests or real Telegram messages. Uses the production queue.
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {StateStore} from '../src/state.mjs';import {PdfQueue} from '../src/pdf-queue.mjs';
import {DeliveryError} from '../src/delivery-errors.mjs';
const dir=await mkdtemp(path.join(os.tmpdir(),'hermes-dry-run-'));
try{
 const state=new StateStore(dir);await state.load();let now=100000,attempt=0;const sent=[];
 const submission={id:'dry-run',code:'DEMO-PDF-5',status:'antre',files:Array.from({length:5},(_,i)=>({driveFileId:'demo-'+i,name:'Demo '+(i+1)+'.pdf'}))};
 const deps={state,now:()=>now,config:{pdfRetryMs:1000},medcoel:{getSubmission:async()=>submission},
  drive:{configured:true,openFile:async()=>new Response('%PDF-1.7\nDemonstration only')},
  telegram:{sendMessage:async(_,message)=>console.log('[DRY-RUN] '+message),sendDocumentStream:async(_,name)=>{
   attempt++;if(attempt===3)throw new DeliveryError('Simulated Telegram 429',{retryAfterMs:2000});
   sent.push(name);return {message_id:sent.length};
  }}};
 await state.markAnnounced('legacy-announcement');
 let queue=new PdfQueue(deps);await queue.enqueue(submission,['demo-chat']);
 for(let i=0;i<3;i++)await queue.tick();
 const resumed=new StateStore(dir);await resumed.load();queue=new PdfQueue({...deps,state:resumed});await queue.recover();
 now+=3000;for(let i=0;i<5;i++)await queue.tick();
 await queue.enqueue(submission,['demo-chat']);await queue.tick();
 assert.equal(sent.length,5);assert.equal(new Set(sent).size,5);
 assert.ok(Object.values(resumed.data.pdfJobs).every(job=>job.files.every(file=>file.status==='delivered'&&file.messageId)));
 console.log('PASS: 5/5 acknowledged; retry + restart + repeat polling produced no duplicate. No real delivery.');
}finally{await rm(dir,{recursive:true,force:true});}
