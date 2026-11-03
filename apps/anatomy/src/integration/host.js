// Lifecycle only. No account data or authentication crosses the frame boundary.
const TYPES={loading:'medcoel:anatomy-loading',interactive:'medcoel:anatomy-interactive',ready:'medcoel:anatomy-ready',error:'medcoel:anatomy-error'};
let last={type:TYPES.loading,version:1},installed;
function installPing(){
 if(typeof window==='undefined'||installed===window||!window.addEventListener)return;installed=window;
 window.addEventListener('message',event=>{
  if(window.parent===window||event.source!==window.parent||event.origin!==window.location.origin||event.data?.type!=='medcoel:anatomy-ping'||event.data?.version!==1)return;
  window.parent.postMessage(last,window.location.origin);
 });
}
export function reportAtlasStatus(status,detail={}) {
 if(!TYPES[status])throw Error('Unknown Anatomy lifecycle status');
 const payload={type:TYPES[status],version:1};
 if(typeof detail.phase==='string')payload.phase=detail.phase.slice(0,64);
 if(typeof detail.message==='string')payload.message=detail.message.slice(0,240);
 if(Number.isFinite(detail.progress))payload.progress=Math.max(0,Math.min(100,detail.progress));
 last=payload;installPing();
 if(window.parent!==window)window.parent.postMessage(payload,window.location.origin);
}
installPing();
export function hostedShareUrl(viewerUrl){
 if(window.parent===window)return viewerUrl;
 const source=new URL(viewerUrl),host=new URL('/anatomy',window.location.origin);host.hash=source.hash;return host.href;
}
