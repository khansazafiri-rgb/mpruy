// Self-study against exact publisher labels in the included, licensed body set.
// No question creates geometry, clinical claims, or score for missing models.
export const labelKey=s=>String(s).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
export function quizPool(entries,group='all'){
 const names=new Map();for(const e of entries){const key=labelKey(e.name);const s=names.get(key)||new Set();s.add(e.fmaId);names.set(key,s);}
 const seen=new Set();return entries.filter(e=>{if(group!=='all'&&e.group!==group||names.get(labelKey(e.name)).size!==1||seen.has(e.fmaId))return false;seen.add(e.fmaId);return true;});
}
export function mountSubsetLearning({groups,entries,choose,quizChoose,snapshot,restore,ready}){
 const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const panel=make('section');panel.id='publicLearningPanel';panel.hidden=true;panel.setAttribute('aria-label','Belajar label sumber anatomi');
 const top=make('div'),heading=make('h2','Guided Learning'),close=make('button','Tutup');top.append(heading,close);
 const group=make('select');group.setAttribute('aria-label','Sistem belajar');group.append(new Option('Semua sistem','all'));for(const [k,v]of Object.entries(groups))group.append(new Option(v,k));
 const mode=make('select');mode.setAttribute('aria-label','Mode jawaban');mode.append(new Option('Pilih label sumber (English)','mcq'),new Option('Ketik label sumber (English)','typed'));
 const progress=make('p'),target=make('h3'),identity=make('p'),status=make('p');status.setAttribute('role','status');
 const controls=make('div'),prev=make('button','Sebelumnya'),show=make('button','Tampilkan 3D'),next=make('button','Berikutnya');controls.append(prev,show,next);
 const answers=make('div'),form=make('form'),input=make('input'),submit=make('button','Periksa');input.setAttribute('aria-label','Jawaban label sumber');input.maxLength=180;input.autocomplete='off';submit.type='submit';form.append(input,submit);
 panel.append(top,group,mode,progress,target,identity,controls,answers,form,status,make('small','Pembelajaran mandiri memakai label penerbit. Klasifikasi sistem sementara; bukan validasi klinis atau ujian resmi.'));document.body.append(panel);
 let kind='guided',list=[],index=0,epoch=0,busy=false,locked=false,correct=0,answered=0,initial=null;const opened=new Set();
 const hideAnswers=()=>{answers.replaceChildren();form.hidden=true;input.value='';};
 const current=()=>list[index];
 function renderGuided(){const e=current();hideAnswers();mode.hidden=true;prev.hidden=false;show.hidden=false;next.textContent='Berikutnya';progress.textContent=(index+1)+'/'+list.length+' label sumber · '+list.filter(x=>opened.has(x.id)).length+' dibuka';target.textContent=e?.name||'Tidak ada struktur pada sistem ini';identity.textContent=e?e.fmaId+' · '+e.bpId:'';prev.disabled=busy||index===0;show.disabled=busy||!e;next.disabled=busy||index>=list.length-1;group.disabled=busy;status.textContent=e?'Tampilkan dan amati struktur sumber.':'';}
 function mark(right){if(locked||busy)return;locked=true;answered++;if(right)correct++;for(const b of answers.querySelectorAll('button'))b.disabled=true;input.disabled=true;submit.disabled=true;status.textContent=(right?'Benar. ':'Belum tepat. ')+current().name+' · '+current().fmaId;next.disabled=false;}
 async function renderQuiz(){const e=current(),token=++epoch;hideAnswers();busy=true;locked=false;mode.hidden=false;prev.hidden=true;show.hidden=true;group.disabled=true;mode.disabled=true;next.disabled=true;next.textContent='Soal berikutnya';target.textContent='Identifikasi struktur sumber yang ditampilkan';identity.textContent='';progress.textContent=e?'Soal '+(index+1)+'/'+list.length:'Selesai · '+correct+'/'+answered+' benar (penilaian lokal)';
 if(!e){busy=false;group.disabled=false;mode.disabled=false;next.disabled=true;status.textContent='Sesi latihan selesai.';return;}
 status.textContent='Memuat model soal…';const ok=await quizChoose(e);if(token!==epoch||panel.hidden)return;busy=false;group.disabled=false;mode.disabled=false;
 if(!ok){locked=true;status.textContent='Model gagal dimuat; tidak dihitung dalam nilai.';next.disabled=false;return;}
 status.textContent='Gunakan label sumber English.';
 if(mode.value==='typed'){form.hidden=false;input.disabled=submit.disabled=false;input.focus();return;}
 const others=list.filter(x=>x.fmaId!==e.fmaId);const offset=index%others.length;const options=[e,...Array.from({length:3},(_,i)=>others[(offset+i)%others.length])].sort((a,b)=>a.id.localeCompare(b.id));
 for(const a of options){const b=make('button',a.name);b.type='button';b.onclick=()=>mark(a.fmaId===e.fmaId);answers.append(b);}
 }
 async function reset(){const token=++epoch;busy=false;correct=answered=index=0;list=kind==='challenge'?quizPool(entries(),group.value):entries().filter(e=>group.value==='all'||e.group===group.value);list=[...list].sort((a,b)=>a.name.localeCompare(b.name));
 group.disabled=false;mode.disabled=false;if(kind==='challenge'&&list.length<4){hideAnswers();target.textContent='Minimal empat label sumber berbeda diperlukan';identity.textContent='';progress.textContent='';prev.hidden=show.hidden=true;mode.hidden=false;next.disabled=true;status.textContent='Pilih sistem lain atau Semua sistem.';return;}
 if(token!==epoch)return;if(kind==='guided')renderGuided();else await renderQuiz();
 }
 close.onclick=()=>{epoch++;busy=false;panel.hidden=true;document.body.classList.remove('subset-quiz-active');if(initial){restore(initial);initial=null;}};
 prev.onclick=()=>{if(!busy&&index>0){index--;renderGuided();}};
 next.onclick=async()=>{if(busy||next.disabled)return;index++;if(kind==='guided')renderGuided();else await renderQuiz();};
 show.onclick=async()=>{const e=current();if(!e||busy)return;const token=++epoch;busy=true;renderGuided();const ok=await choose(e);if(token!==epoch||panel.hidden)return;busy=false;if(ok)opened.add(e.id);renderGuided();status.textContent=ok?'Struktur sumber berhasil dibuka.':'Model gagal dimuat; belum dihitung.';};
 group.onchange=reset;mode.onchange=reset;form.onsubmit=e=>{e.preventDefault();if(input.value.trim())mark(labelKey(input.value)===labelKey(current().name));};
 async function open(value){await ready();if(!panel.hidden)close.click();initial=snapshot();kind=value;heading.textContent=value==='guided'?'Guided Learning':'Challenge · Label sumber';panel.hidden=false;document.body.classList.toggle('subset-quiz-active',value==='challenge');await reset();}
 return {guided:()=>open('guided'),challenge:()=>open('challenge')};
}
