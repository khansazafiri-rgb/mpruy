// Independent adapter for an explicitly supplied private original presentation.
export function mountOriginalShell(api){
 const template=document.getElementById('originalShellTemplate');
 if(!template)return null;
 const $=id=>document.getElementById(id),make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 const old=make('div');old.id='originalEngineControls';old.hidden=true;
 const header=document.querySelector('body > header'),main=document.querySelector('body > main'),view=$('view');
 document.body.insertBefore(old,header);old.append(header,main);
 document.body.insertBefore(template.content.cloneNode(true),old);
 const original=$('app'),canvas=view.querySelector('canvas');$('threeCanvas').replaceWith(view);canvas.id='threeCanvas';canvas.tabIndex=0;
 canvas.setAttribute('aria-label','Penampil anatomi 3D');
 // Keep the actual original CSS and controls. Unvalidated functions stay disabled.
 const disable=(id,reason)=>{const b=$(id);if(b){b.disabled=true;b.title=reason;}};
 const click=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
 const history=[];
 function act(fn){history.push(api.snapshot());if(history.length>30)history.shift();fn();render();}
 click('undoAtlas',()=>{if(history.length)api.restore(history.pop());render();});
 click('restoreAtlas',()=>act(()=>api.reset()));click('emptyRestore',()=>act(()=>api.reset()));
 click('returnContext',()=>act(()=>api.restoreContext()));
 click('resetBtn',()=>api.fit());click('zoomInAtlas',()=>api.zoom(.8));click('zoomOutAtlas',()=>api.zoom(1.25));
 click('panAtlas',()=>{const b=$('panAtlas');const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));api.pan(on);});
 for(const [id,axis,label] of [['frontViewBtn','front','+Z'],['sideViewBtn','side','−X'],['backViewBtn','back','−Z'],['topViewBtn','top','+Y']]){
  $(id).textContent=label;$(id).title='Sumbu sumber '+label+'; orientasi anatomi belum divalidasi';click(id,()=>api.axis(axis));
 }
 click('infoToggle',()=>api.clear());click('infoExpand',()=>{const on=original.classList.toggle('info-expanded');$('infoExpand').setAttribute('aria-expanded',String(on));});
 click('footerIsolateBtn',()=>act(()=>api.isolate()));click('footerHideBtn',()=>act(()=>api.hide()));
 click('footerTransparentBtn',()=>act(()=>api.fadeSelected()));click('footerFadeOthersBtn',()=>act(()=>api.fadeOthers()));
 click('footerFocusBtn',()=>api.focus());click('footerShowAllBtn',()=>act(()=>api.restoreContext()));
 click('searchOpen',()=>{const on=original.querySelector('.atlas-topbar').classList.toggle('search-open');$('searchOpen').setAttribute('aria-expanded',String(on));if(on)$('searchInput').focus();});
 click('helpBtn',()=>{$('helpModal').classList.remove('hidden');});click('helpClose',()=>{$('helpModal').classList.add('hidden');});
 const help=$('helpModal').querySelector('.modal-body');help.replaceChildren();
 for(const t of ['Review privat nonkomersial: tampilan asli, engine independen.','Klik struktur atau cari nama untuk highlight. Tombol sistem di bawah mengaktifkan sistem, menu ⋯ membuka daftar struktur.','Regio, lapisan, dan orientasi anatomi belum tervalidasi. Referensi alternatif hanya dibuka terpisah.'])help.append(make('p','',t));
 const source=make('a','','Atribusi model BodyParts3D');source.href='./MODEL-ATTRIBUTIONS.json';source.target='_blank';source.rel='noopener';help.append(source);
 $('helpModal').querySelector('.modal-overlay').onclick=()=>$('helpModal').classList.add('hidden');
 disable('shareAtlas','Tautan publik tidak tersedia dalam review privat');disable('regionButton','Regio belum divalidasi');
 $('sceneTitle').textContent='Seluruh tubuh';$('sceneSubtitle').textContent='Koordinat sumber';
 const presets=make('div','atlas-presets');presets.append(make('span','','Tampilan'));
 for(const [label,fn] of [['Semua',()=>api.all()],['Reset',()=>api.reset()],['HRA',()=>api.references()],['Layar penuh',()=>api.fullscreen()]]){const b=make('button','',label);b.onclick=()=>act(fn);presets.append(b);}
 const tiles=make('div','atlas-groups');$('systemsList').replaceChildren(presets,tiles);
 const browse=make('section','atlas-browse');browse.id='originalBrowse';browse.hidden=true;
 const head=make('div','atlas-browse-head'),title=make('strong'),close=make('button','','×');close.onclick=()=>{browse.hidden=true;};head.append(title,close);
 const list=make('div');list.id='originalBrowseList';browse.append(head,list);original.append(browse);
 const search=$('searchInput'),results=$('searchResults');let activeGroup=null;
 function result(e){const b=make('button','atlas-result'),thumb=make('span','atlas-result-thumb'),dot=make('i'),txt=make('span','atlas-result-text');dot.style.setProperty('--group-color',api.color(e.group));thumb.append(dot);txt.append(make('span','',e.name),make('small','',api.groups[e.group]+(e.contextCandidate?' · kandidat konteks':e.priorityOnly?' · representasi terpisah':e.selectionOnly?' · seleksi elemen sumber':'')+' · '+(e.fmaId||'')));b.append(thumb,txt);b.onclick=()=>{act(()=>api.choose(e));results.classList.remove('show');browse.hidden=true;original.querySelector('.atlas-topbar').classList.remove('search-open');};return b;}
 function showResults(){results.replaceChildren();const q=search.value.trim();if(q.length<2){results.classList.remove('show');return;}const hits=api.entries().filter(e=>(e.name+' '+(e.fmaId||'')).toLowerCase().includes(q.toLowerCase())).slice(0,40);for(const e of hits)results.append(result(e));if(!hits.length)results.append(make('p','search-empty','Struktur tidak ditemukan dalam paket ini.'));results.classList.add('show');}
 search.oninput=showResults;search.onkeydown=e=>{if(e.key==='Escape')results.classList.remove('show');if(e.key==='Enter')results.querySelector('button')?.click();};
 function showGroup(g){activeGroup=g;title.textContent=api.groups[g];list.replaceChildren();for(const e of api.entries().filter(e=>e.group===g).sort((a,b)=>a.name.localeCompare(b.name)))list.append(result(e));browse.hidden=false;}
 const tileMap=new Map();for(const [g,label] of Object.entries(api.groups)){
  const tile=make('div','sys-tile'),steps=make('div','sys-steps'),minus=make('button','','−'),plus=make('button','','+');
  minus.disabled=true;plus.disabled=true;minus.title=plus.title='Lapisan belum tervalidasi';steps.append(minus,plus);
  const toggle=make('button','sys-toggle'),dot=make('span','sys-dot'),name=make('span','sys-name',label),layers=make('span','sys-layers');layers.append(make('i'));
  toggle.append(dot,name,layers);toggle.onclick=()=>act(()=>api.toggle(g));const more=make('button','sys-more','⋯');more.title='Daftar '+label;more.onclick=()=>showGroup(g);
  tile.style.setProperty('--group-color',api.color(g));tile.append(steps,toggle,more);tiles.append(tile);tileMap.set(g,{tile,toggle,more,layers});
 }
 let scheduled=false,lastSelection=null;
 function renderNow(){
  scheduled=false;const s=api.state();for(const [g,t] of tileMap){const n=api.entries().filter(e=>e.group===g&&!e.priorityOnly).length;t.tile.classList.toggle('is-on',s.enabled.has(g));t.toggle.setAttribute('aria-pressed',String(s.enabled.has(g)));t.toggle.disabled=!n;t.more.disabled=!api.entries().some(e=>e.group===g);t.toggle.title=String(n)+' model tubuh';t.layers.firstChild.classList.toggle('on',s.enabled.has(g));}
  const e=s.selected;original.classList.toggle('info-open',!!e);$('returnContext').hidden=!s.isolated&&!s.hidden.size;$('footerBar').style.display=e?'':'none';$('structureInfo').classList.toggle('hidden',!e);original.querySelector('.info-placeholder').hidden=!!e;
  if(e&&lastSelection!==e.id){const h=make('div','structure-title');h.append(make('h3','',e.name));const tags=make('div','structure-tags');tags.append(make('span','structure-system',api.groups[e.group]),make('span','structure-tag warn','Review privat'));h.append(tags,make('p','structure-description',(e.fmaId||'')+' · '+(e.bpId||'')+(e.contextCandidate?' · kandidat konteks':e.priorityOnly?' · representasi terpisah':e.selectionOnly?' · seleksi elemen sumber':'')+' · identitas sumber; belum tervalidasi klinis.'));$('structureInfo').replaceChildren(h);}
  lastSelection=e?.id||null;$('atlasStatus').textContent=api.status();$('loadingOverlay').classList.toggle('hidden',s.ready);$('undoAtlas').disabled=!history.length;
 }
 function render(){if(!scheduled){scheduled=true;requestAnimationFrame(renderNow);}}
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA'].includes(e.target?.tagName)){e.preventDefault();$('undoAtlas').click();}});
 const full=make('button','btn-icon','⛶');full.title='Layar penuh';full.onclick=()=>api.fullscreen();original.querySelector('.header-right').append(full);
 return {render};
}
