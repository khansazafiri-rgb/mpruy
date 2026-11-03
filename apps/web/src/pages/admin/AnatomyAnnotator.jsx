import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/context/AuthContext';
import {ANATOMY_VIEWER_PATH,acceptsAtlasMessage} from '../../features/anatomy/hostProtocol.mjs';
import {PREFIX,acceptsAnnotationEvent} from '../../features/anatomy/annotatorProtocol.mjs';
import {PART_ID,STATUSES,REPRESENTATIONS,parseDocument,validateDocument,geometryComplete,transitionLandmark} from '../../features/anatomy/annotationSchema.mjs';
import {loadDraft,storeDraft,exportFilename} from '../../features/anatomy/annotationStorage.mjs';
import pilot from '../../features/anatomy/pilot.json';
import './AnatomyAnnotator.css';

export default function AnatomyAnnotator() {
 const {me}=useAuth(),userId=me.id;
 const [initial]=useState(()=>{try{return {document:loadDraft(localStorage,userId,pilot),error:''};}catch(e){return {document:structuredClone(pilot),error:`Draft tidak dapat dimuat: ${e.message}. Import JSON cadangan atau lanjutkan draft baru.`};}});
 const [documentData,setDocumentData]=useState(initial.document),[selected,setSelected]=useState('greater-tubercle');
 const [status,setStatus]=useState('loading'),[error,setError]=useState(initial.error),[saved,setSaved]=useState('Draft lokal · belum diexport');
 const [student,setStudent]=useState(false),[tool,setTool]=useState('navigate'),[brushMm,setBrushMm]=useState(8),[canUndo,setCanUndo]=useState(false);
 const [reviewer,setReviewer]=useState(''),[manual,setManual]=useState(false),[attempt,setAttempt]=useState(0),[hit,setHit]=useState(null);
 const iframe=useRef(null),fileInput=useRef(null),docRef=useRef(documentData),session=useRef(crypto.randomUUID());
 const l=documentData.landmarks.find(l=>l.id===selected),ready=status==='ready';
 const send=(type,payload={})=>iframe.current?.contentWindow?.postMessage({type:PREFIX+type,version:1,session:session.current,...payload},location.origin);
 function persist(d) {
  validateDocument(d);docRef.current=d;setDocumentData(d);
  try{storeDraft(localStorage,userId,d);setSaved(`Draft lokal tersimpan · revisi ${d.revision}`);}
  catch{setSaved('Draft hanya di memori — segera export JSON');setError('Penyimpanan browser penuh/tidak tersedia. Export JSON sebelum menutup halaman.');}
 }
 useEffect(()=>{
  const listener=event=>{
   if(acceptsAtlasMessage(event,location.origin,iframe.current?.contentWindow)) {
    if(event.data.type==='medcoel:anatomy-error'){setStatus('error');setError('Viewer gagal dimuat. Coba lagi.');return;}
    if(event.data.type!=='medcoel:anatomy-ready')return;
    setStatus('initializing');send('enter',{document:docRef.current});return;
   }
   if(!acceptsAnnotationEvent(event,location.origin,iframe.current?.contentWindow,session.current))return;
   const d=event.data;
   if(d.type==='medcoel:anatomy-annotation-error'){setError(d.message);setStatus(s=>s==='ready'?s:'error');return;}
   if(d.type==='medcoel:anatomy-annotation-hit'){setHit(d);return;}
   if(d.type==='medcoel:anatomy-annotation-change'){
    persist(d.document);setCanUndo(!!d.canUndo);setStatus('ready');
   }
  };
  window.addEventListener('message',listener);
  const timer=setTimeout(()=>setStatus(s=>s==='loading'||s==='initializing'?'slow':s),60000);
  return()=>{window.removeEventListener('message',listener);clearTimeout(timer);};
  // Each iframe attempt owns one channel; document changes use docRef.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[attempt,userId]);
 useEffect(()=>{document.title='Human Anatomy Annotator | MEDCOEL';},[]);
 function selectLandmark(id) {
  setSelected(id);setTool('navigate');setManual(false);setHit(null);setError('');send('select-landmark',{landmarkId:id});
 }
 function selectTool(value,size=brushMm){setTool(value);send('set-tool',{tool:value,brushMm:size});}
 function switchPreview(value){setStudent(value);setTool('navigate');setError('');send('preview',{document:docRef.current,student:value});}
 function changeRepresentation(value) {
  if(l.geometry&&!window.confirm('Ganti bentuk anotasi dan hapus geometri landmark ini? Status review akan direset.'))return;
  setTool('navigate');send('select-landmark',{landmarkId:selected,representation:value});
 }
 function transition() {
  try {
   const next=STATUSES[STATUSES.indexOf(l.status)+1],updated=transitionLandmark(l,next,{reviewer,manual});
   const d={...docRef.current,revision:docRef.current.revision+1,landmarks:docRef.current.landmarks.map(x=>x.id===selected?updated:x)};
   persist(d);send('preview',{document:d,student:false});setTool('navigate');setManual(false);setError('');
  } catch(e){setError(e.message);}
 }
 function download() {
  const d=docRef.current,text=JSON.stringify(validateDocument(d),null,2)+'\n',url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=exportFilename(d);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setSaved(`JSON diexport · revisi ${d.revision}`);
 }
 async function importFile(event) {
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try{
   if(file.size>6000000)throw Error('JSON maksimal 6 MB');
   const d=parseDocument(await file.text());
   if(d.spatialSource.modelSha256!==pilot.spatialSource.modelSha256)throw Error('JSON dibuat untuk model lain');
   d.importedFromRevision=d.revision;d.revision=Math.max(d.revision,docRef.current.revision)+1;
   // Persist only after the viewer validates all anchors/facets against the loaded geometry.
   if(ready)send('preview',{document:d,student});else send('enter',{document:d});
   setTool('navigate');setManual(false);setError('');
  }catch(e){setError(`Import ditolak: ${e.message}`);}
 }
 const count=l.representation==='surface_region'?l.geometry?.faceIndices?.length||0:l.representation==='surface_line'?l.geometry?.anchors?.length||0:l.geometry?1:0;
 const next=STATUSES[STATUSES.indexOf(l.status)+1],actionLabels={DRAFT:'Mulai draft',ANNOTATED:'Tandai Annotated',REVIEWED:'Tandai Reviewed',VERIFIED:'Verifikasi manual'};
 return <div className="anatomy-admin">
  <header className="anatomy-admin-heading">
   <div><p className="eyebrow">Konten belajar · Human Anatomy</p><h1 className="page-title">Anatomy Annotator</h1><p className="meta">Pilot right humerus · Z-Anatomy · {student?'Student preview':'Admin workspace'}</p></div>
   <div className="anatomy-admin-actions"><button className="btn-secondary btn-sm" disabled={!ready&&status!=='error'} onClick={()=>fileInput.current.click()}>Import JSON</button><button className="btn-primary btn-sm" onClick={download}>Save JSON</button><input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importFile}/></div>
  </header>
  <div className="anatomy-modebar"><div className="anatomy-mode-tabs" aria-label="Workspace mode"><button aria-pressed={!student} disabled={!ready} onClick={()=>switchPreview(false)}>Annotate</button><button aria-pressed={student} disabled={!ready} onClick={()=>switchPreview(true)}>Preview Student</button></div><span role="status" className="meta">{saved}</span></div>
  {error&&<div role="alert" className="anatomy-admin-error">{error}<button aria-label="Tutup pesan" onClick={()=>setError('')}>×</button></div>}
  <div className="anatomy-admin-grid">
   <aside className="anatomy-landmarks card" aria-label="Pilot landmarks"><div className="anatomy-panel-title"><span className="eyebrow">SKELETAL</span><h2>Right humerus</h2><button className="anatomy-part" disabled={!ready} onClick={()=>send('select-part',{partId:PART_ID})}>{PART_ID} <span>↗ Focus</span></button></div>
    <div className="anatomy-landmark-list">{documentData.landmarks.map((x,i)=><button key={x.id} disabled={!ready} aria-pressed={selected===x.id} onClick={()=>selectLandmark(x.id)}><span className="anatomy-landmark-number">{String(i+1).padStart(2,'0')}</span><span><strong>{x.name_en}</strong><small>{x.status.replaceAll('_',' ')}{x.geometry?' · mapped':''}</small></span></button>)}</div>
    <p className="anatomy-note">{student?'Pilih landmark untuk melihat lokasinya pada mesh.':'Pilih landmark, lalu tandai langsung di permukaan tulang. Semua landmark awal belum dipetakan.'}</p>
   </aside>
   <section className="anatomy-canvas-card card" aria-label="Z-Anatomy annotation viewer">
    <div className="anatomy-canvas-heading"><span>{student?'STUDENT PREVIEW':'SURFACE WORKSPACE'}</span><span>{tool==='navigate'?'Rotate · zoom · pan':tool==='paint'?`Paint · ${brushMm} mm`:tool==='erase'?`Erase · ${brushMm} mm`:tool==='point'?'Klik untuk menempatkan point':'Klik untuk menambah anchor'}</span></div>
    <iframe key={attempt} ref={iframe} src={ANATOMY_VIEWER_PATH+'?annotator=1'} title="Anatomy Annotator — right humerus" allow="clipboard-write" onError={()=>setStatus('error')}/>
    {!ready&&<div className="anatomy-canvas-loading" role="status"><strong>{status==='error'?'Viewer belum dapat dibuka':status==='slow'?'Model membutuhkan waktu lebih lama':'Memuat right humerus…'}</strong><p>Menyiapkan mesh dan surface identity.</p>{['error','slow'].includes(status)&&<button className="btn-primary btn-sm" onClick={()=>{session.current=crypto.randomUUID();setStatus('loading');setAttempt(x=>x+1);}}>Coba lagi</button>}</div>}
   </section>
   <aside className="anatomy-inspector card" aria-label="Landmark inspector">
    <div className="anatomy-panel-title"><p className="eyebrow">{student?'LANDMARK DETAIL':'INSPECTOR'}</p><h2>{l.name_en}</h2><p className="meta"><i>{l.name_la}</i></p><span className={'anatomy-status status-'+l.status.toLowerCase()}>{l.status.replaceAll('_',' ')}</span></div>
    <div className="anatomy-inspector-body">
     {!student&&<><label className="anatomy-field">Representation<select value={l.representation} disabled={!ready} onChange={e=>changeRepresentation(e.target.value)}>{REPRESENTATIONS.map(r=><option key={r} value={r}>{r.replaceAll('_',' ').toUpperCase()}</option>)}</select></label>
      <div className="anatomy-tools" aria-label="Annotation tools">{[['navigate','Rotate / pan'],...(l.representation==='point'?[['point','Place point']]:l.representation==='surface_region'?[['paint','Paint'],['erase','Erase']]:[['line','Add anchor']])].map(([id,label])=><button key={id} disabled={!ready} aria-pressed={tool===id} onClick={()=>selectTool(id)}>{label}</button>)}</div>
      {l.representation==='surface_region'&&<label className="anatomy-field">Brush radius <span>{brushMm} mm</span><input aria-label="Brush radius" type="range" min="1" max="30" value={brushMm} disabled={!ready} onChange={e=>{const size=Number(e.target.value);setBrushMm(size);selectTool(tool,size);}}/></label>}
     </>}
     <p className="anatomy-note">{student?'Lokasi mengikuti triangle mesh saat model diputar.':tool==='navigate'?'Drag untuk rotate. Shift + drag untuk pan. Scroll / pinch untuk zoom.':'Tandai permukaan yang terlihat. Pilih Rotate / pan untuk melihat sisi lain; Shift + drag juga bisa menggerakkan kamera.'}</p>
     <div className="anatomy-geometry-summary"><strong>{count}</strong><span>{l.representation==='surface_region'?'selected triangles':l.representation==='surface_line'?'surface anchors':'surface point'}</span></div>
     {hit&&<p className="meta">Last hit · face {hit.faceIndex}</p>}
     <button className="btn-secondary btn-sm w-full" disabled={!ready||!l.geometry} onClick={()=>{setTool('navigate');send('select-landmark',{landmarkId:selected});}}>Focus landmark</button>
     {!student&&<><div className="anatomy-edit-actions"><button className="btn-secondary btn-sm" disabled={!ready||!canUndo} onClick={()=>{setManual(false);send('clear',{action:'undo'});}}>Undo</button><button className="btn-secondary btn-sm" disabled={!ready||!l.geometry} onClick={()=>{if(window.confirm('Hapus geometri landmark ini? Bisa dikembalikan dengan Undo.')){setManual(false);send('clear',{action:'landmark'});}}}>Clear</button></div>
      <section className="anatomy-review"><h3>Review workflow</h3><p className="meta">Edit geometri mengembalikan status ke DRAFT. VERIFIED hanya setelah review manual.</p><label className="anatomy-field">Nama reviewer<input value={reviewer} maxLength="100" onChange={e=>setReviewer(e.target.value)} placeholder="Nama pemeriksa"/></label>
       {next==='VERIFIED'&&<label className="anatomy-manual"><input type="checkbox" checked={manual} onChange={e=>setManual(e.target.checked)}/>Saya sudah memeriksa anotasi ini langsung pada mesh Z-Anatomy.</label>}
       {next&&<button className="btn-primary btn-sm w-full" disabled={!ready||(STATUSES.indexOf(next)>=2&&!geometryComplete(l))||(STATUSES.indexOf(next)>=3&&!reviewer.trim())||(next==='VERIFIED'&&!manual)} onClick={transition}>{actionLabels[next]}</button>}
       {l.review.reviewedBy&&<p className="meta">Reviewed: {l.review.reviewedBy}</p>}{l.review.verifiedBy&&<p className="meta">Verified: {l.review.verifiedBy} · manual</p>}
      </section></>}
     <details className="anatomy-provenance"><summary>Spatial source</summary><p>Z-Anatomy · {PART_ID}</p><code>{documentData.spatialSource.sourceCommit}</code><p>External terminology: reference only. No imported coordinates.</p></details>
    </div>
   </aside>
  </div>
  <p className="anatomy-admin-footnote">Draft tersimpan hanya di browser ini untuk akun ini. Save JSON untuk cadangan berversi; commit JSON setelah review. Belum disimpan ke server.</p>
 </div>;
}
