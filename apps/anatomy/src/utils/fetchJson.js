import {asset} from './paths.js';
// AbortController works in Safari versions predating AbortSignal.timeout().
export async function fetchJson(file,{timeoutMs=20000,fetcher=globalThis.fetch}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetcher(asset(file),{signal:controller.signal});
  if(!response.ok)throw Error(file+' tidak tersedia (HTTP '+response.status+'). Periksa direktori viewer server.');
  if(response.headers?.get('content-type')?.includes('text/html'))throw Error(file+' dibalas HTML, bukan data Anatomy.');
  return await response.json();
 }finally{clearTimeout(timer);}
}
