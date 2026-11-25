import {guidedTracks,guidedProgress} from './guided-state.js';
export function mountGuided({base,groups,entries,choose,ready}){
 const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const panel=make('section');panel.id='guidedLearningPanel';panel.hidden=true;panel.setAttribute('aria-label','Alur belajar anatomi privat');
 const header=make('div'),title=make('strong','Guided Learning'),close=make('button','Tutup');header.append(title,close);
 const select=make('select');select.setAttribute('aria-label','Pilih sistem anatomi');
 const progress=make('p'),target=make('h3'),identity=make('p'),representations=make('select');representations.setAttribute('aria-label','Pilih representasi sumber');
 const status=make('p');status.setAttribute('role','status');
 const controls=make('div'),previous=make('button','Sebelumnya'),show=make('button','Tampilkan 3D'),next=make('button','Berikutnya');controls.append(previous,show,next);
 panel.append(header,select,progress,target,identity,representations,status,controls,make('small','Checkpoint sumber privat, bukan kelengkapan anatomi atau validasi klinis.'));document.body.append(panel);
 let tracks=[],index=0,epoch=0,busy=false;const visited=new Set(),preferred=new Map();
 const track=()=>tracks.find(t=>t.id===select.value);
 function render(){
  const t=track(),s=t?.steps[index];if(!s){target.textContent='Belum ada checkpoint';identity.textContent='';progress.textContent='';representations.replaceChildren();show.disabled=previous.disabled=next.disabled=true;return;}
  const p=guidedProgress(t,visited);progress.textContent=(index+1)+'/'+p.total+' · '+p.visited+'/'+p.available+' checkpoint tersedia telah dibuka · '+p.held+' belum tersedia';
  target.textContent=s.target;identity.textContent=(s.fmaId||'Identitas belum cocok')+' · '+s.status;
  representations.replaceChildren();for(const a of s.representations){const o=make('option',a.name+' · '+a.type);o.value=a.id;representations.append(o);}
  const prior=preferred.get(s.key);if(s.representations.some(a=>a.id===prior))representations.value=prior;
  representations.disabled=busy;representations.hidden=!s.representations.length;show.disabled=busy||!s.representations.length;previous.disabled=busy||index===0;next.disabled=busy||index>=t.steps.length-1;select.disabled=busy;
  status.textContent=s.representations.length?(visited.has(s.key)?'Sudah dibuka.':'Tampilkan struktur untuk memulai.'):'Belum tersedia pada inventaris ini; tidak dihitung sebagai selesai.';
 }
 close.onclick=()=>{epoch++;busy=false;panel.hidden=true;};
 representations.onchange=()=>{const s=track()?.steps[index];if(s&&!busy)preferred.set(s.key,representations.value);};
 select.onchange=()=>{index=0;render();};previous.onclick=()=>{if(!busy&&index>0){index--;render();}};next.onclick=()=>{if(!busy&&index<track().steps.length-1){index++;render();}};
 show.onclick=async()=>{
  const s=track()?.steps[index],a=s?.representations.find(r=>r.id===representations.value),e=entries().find(x=>x.id===a?.id);if(busy||!e)return;
  preferred.set(s.key,a.id);const token=++epoch;busy=true;render();status.textContent='Memuat struktur…';
  try{const ok=await choose(e);if(token!==epoch||panel.hidden)return;busy=false;if(ok===true)visited.add(s.key);render();status.textContent=ok===true?'Struktur berhasil dibuka.':'Struktur gagal dibuka; belum dihitung.';}
  catch(error){if(token===epoch){busy=false;render();status.textContent='Gagal memuat struktur: '+String(error.message||error);}}
 };
 return async()=>{
  if(location.hostname!=='127.0.0.1')return;
  if(!panel.hidden){close.click();return;}
  const token=++epoch;panel.hidden=false;busy=true;show.disabled=previous.disabled=next.disabled=select.disabled=representations.disabled=true;status.textContent='Memeriksa inventaris checkpoint…';
  try{await ready();const res=await fetch(base+'learning-coverage.json',{cache:'no-store'});if(!res.ok)throw Error('Laporan checkpoint tidak tersedia pada preview ini.');
   const data=guidedTracks(await res.json(),entries(),groups);if(token!==epoch||panel.hidden)return;
   tracks=data;select.replaceChildren();for(const t of tracks){const option=make('option',t.label);option.value=t.id;select.append(option);}index=0;busy=false;select.disabled=false;render();
  }catch(e){if(token===epoch){busy=false;tracks=[];select.replaceChildren();render();status.textContent=String(e.message||e);}}
 };
}
