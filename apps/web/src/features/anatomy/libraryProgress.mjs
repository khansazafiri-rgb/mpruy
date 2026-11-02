import {SPATIAL_SOURCE} from './registry.mjs';
export const PROGRESS_STATES=['NOT_STUDIED','LEARNING','MASTERED'];
export const progressKey=userId=>`medcoel:anatomy-library:v1:${encodeURIComponent(userId)}:${SPATIAL_SOURCE}`;
export function emptyProgress(){return {schemaVersion:1,sourceCommit:SPATIAL_SOURCE,structures:{}};}
export function parseProgress(text) {
 const data=JSON.parse(text);
 if(data?.schemaVersion!==1||data.sourceCommit!==SPATIAL_SOURCE||!data.structures||typeof data.structures!=='object'||Array.isArray(data.structures))throw Error('Unsupported local progress');
 const clean=emptyProgress();
 for(const [id,r] of Object.entries(data.structures)) {
  if(['__proto__','constructor','prototype'].includes(id)||!PROGRESS_STATES.includes(r?.status)||!Number.isSafeInteger(r.attempts)||r.attempts<0||!Number.isSafeInteger(r.correct)||r.correct<0||r.correct>r.attempts||!Number.isInteger(r.streak)||r.streak<0||r.streak>r.attempts)throw Error('Invalid structure progress');
  clean.structures[id]={status:r.status,attempts:r.attempts,correct:r.correct,streak:r.streak,updatedAt:r.updatedAt||null};
 }
 return clean;
}
export function recordAnswer(progress,id,correct,now=new Date().toISOString()) {
 const next=globalThis.structuredClone(progress),previous=next.structures[id]||{attempts:0,correct:0,streak:0};
 const streak=correct?previous.streak+1:0;
 next.structures[id]={status:streak>=3?'MASTERED':'LEARNING',attempts:previous.attempts+1,correct:previous.correct+Number(correct),streak,updatedAt:now};return next;
}
export function setProgressStatus(progress,id,status,now=new Date().toISOString()) {
 if(!PROGRESS_STATES.includes(status))throw Error('Invalid learning status');
 const next=globalThis.structuredClone(progress),old=next.structures[id]||{attempts:0,correct:0,streak:0};next.structures[id]={...old,status,updatedAt:now};return next;
}
// Storage is an adapter boundary: a future PocketBase repository can replace it.
export function createLocalProgressRepository(storage,userId) {
 return {load(){const text=storage.getItem(progressKey(userId));return text?parseProgress(text):emptyProgress();},save(progress){storage.setItem(progressKey(userId),JSON.stringify(parseProgress(JSON.stringify(progress))));}};
}
