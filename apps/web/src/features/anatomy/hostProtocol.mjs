export const ANATOMY_VIEWER_PATH='/anatomy/viewer/';
export const ANATOMY_CATALOG_PATH=ANATOMY_VIEWER_PATH+'data/atlas-catalog.json';
export const ATLAS_EVENTS=['medcoel:anatomy-loading','medcoel:anatomy-interactive','medcoel:anatomy-ready','medcoel:anatomy-error'];
export function acceptsAtlasMessage(event,origin,viewerWindow){
 const data=event.data;
 if(acceptsLicensedSubsetMessage(event,origin,viewerWindow))return true;
 return !!viewerWindow&&event.origin===origin&&event.source===viewerWindow&&data?.version===1&&ATLAS_EVENTS.includes(data.type)&&
  Object.keys(data).every(k=>['type','version','phase','message','progress'].includes(k))&&
  (data.phase===undefined||(typeof data.phase==='string'&&data.phase.length<=64))&&
  (data.message===undefined||(typeof data.message==='string'&&data.message.length<=240))&&
  (data.progress===undefined||(Number.isFinite(data.progress)&&data.progress>=0&&data.progress<=100));
}
export function atlasFrameSrc(hash=''){
 const params=new globalThis.URLSearchParams(hash.replace(/^#/,''));
 return ANATOMY_VIEWER_PATH+(params.has('atlas')?'#atlas='+encodeURIComponent(params.get('atlas')):'');
}
export function nextAtlasStatus(current,type){
 if(type==='medcoel:independent-atlas-status')return current;
 if(type==='medcoel:anatomy-error')return 'error';
 if(type==='medcoel:anatomy-ready')return 'ready';
 if(type==='medcoel:anatomy-interactive')return current==='ready'?'ready':'interactive';
 return current;
}
export async function checkViewerAsset(fetcher=globalThis.fetch,signal){
 const controller=signal?null:new globalThis.AbortController(),
   timer=controller?globalThis.setTimeout(()=>controller.abort(),10000):null;
 const options={method:'HEAD',cache:'no-cache',signal:signal||controller.signal};
 try{
  // The public SPA fallback returns HTTP 200 text/html for *missing* routes.
  // The viewer root alone cannot prove an actual Anatomy installation.
  const viewer=await fetcher(ANATOMY_VIEWER_PATH,options);
  if(!viewer.ok)throw Error('Viewer Anatomy tidak tersedia di server (HTTP '+viewer.status+').');
  const viewerType=viewer.headers.get('content-type')||'';
  if(!viewerType.toLowerCase().includes('text/html'))
   throw Error('Server mengembalikan tipe file viewer yang tidak sesuai.');
  const catalog=await fetcher(ANATOMY_CATALOG_PATH,options);
  if(!catalog.ok){try{return await checkLicensedSubset(fetcher,options.signal);}catch{throw Error('Katalog Atlas 3D belum dipasang di server (HTTP '+catalog.status+').');}}
  const catalogType=(catalog.headers.get('content-type')||'').toLowerCase();
  if(!catalogType.includes('json')){try{return await checkLicensedSubset(fetcher,options.signal);}catch{throw Error('Rute Atlas 3D masih mengarah ke halaman utama, bukan katalog anatomi. Periksa mount /anatomy/viewer/.');}}
  // Availability only. Real anatomy/rights validation is a separate release gate.
  return {viewerMounted:true,catalogMounted:true};
 }finally{if(timer)globalThis.clearTimeout(timer);}
}

// Tells the atlas where its "back" link goes, so the 3D page needs no second header from the host.
// The atlas only accepts plain path characters, so ( ) ! ' * (left as is by encodeURIComponent) are escaped.
export function withBackLink(src, back) {
  if (!back?.path) return src;
  const path = String(back.path).replace(/[()!'*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const [base, hash = ''] = src.split('#');
  const query = 'back=' + encodeURIComponent(path) + (back.label ? '&backLabel=' + encodeURIComponent(String(back.label).slice(0, 40)) : '');
  return base + (base.includes('?') ? '&' : '?') + query + (hash ? '#' + hash : '');
}

export const LICENSED_SUBSET_PIN='6e6de134b9ae06c01df65e746f7f671802faf2a851ed221b569b776141038fa3';
export const LICENSED_SUBSET_PRODUCT='medcoel-human-anatomy-independent-subset';
export function acceptsLicensedSubsetMessage(event,origin,frame){
 const d=event?.data;return !!frame&&event.source===frame&&event.origin===origin&&d?.type==='medcoel:independent-atlas-status'&&d.version===1&&d.product===LICENSED_SUBSET_PRODUCT&&d.assetSetSHA256===LICENSED_SUBSET_PIN&&['loading','interactive','partial','error'].includes(d.state)&&typeof d.message==='string'&&d.message.length<=240&&Object.keys(d).every(k=>['type','version','product','assetSetSHA256','state','message'].includes(k));
}
export async function checkLicensedSubset(fetcher,signal,subtle=globalThis.crypto?.subtle){
 const response=await fetcher(ANATOMY_VIEWER_PATH+'inventory.json',{cache:'no-cache',signal});
 if(!response.ok||!(response.headers.get('content-type')||'').includes('json'))throw Error('Subset inventory unavailable');
 const text=await response.text();if(text.length>2*1024*1024)throw Error('Subset inventory too large');
 const d=JSON.parse(text);if(d.product!==LICENSED_SUBSET_PRODUCT||d.mode!=='licensed-educational-subset'||d.assetSetSHA256!==LICENSED_SUBSET_PIN||d.entries?.length!==1016||d.clinicalValidation!==false||d.registrationValidated!==false)throw Error('Unknown subset');
 const rows=d.entries.map(e=>[e.id,e.name,e.group,e.fmaId,e.bpId,e.path,e.sha256,e.bytes,e.license]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 if(!subtle)throw Error('Checksum unavailable');
 const hash=[...new Uint8Array(await subtle.digest('SHA-256',new globalThis.TextEncoder().encode(JSON.stringify(rows))))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==LICENSED_SUBSET_PIN)throw Error('Subset inventory checksum differs');
 return {viewerMounted:true,catalogMounted:false,licensedSubsetMounted:true,assetSetSHA256:hash};
}
