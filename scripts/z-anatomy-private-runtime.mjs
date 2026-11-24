// Build-time transforms for the original private Z-Anatomy preview only.
function once(code,a,b){
 if(code.split(a).length!==2)throw Error('Private runtime transform anchor mismatch: '+a.slice(0,100));
 return code.replace(a,()=>b);
}
export function patchPrivateSourceRuntime(code){
 code=once(code,'let inventoryPromise = null;',`let inventoryPromise = null;
const runtimeFailures = new Map(), runtimeLoaded = new Map();
function notifyPrivateRuntime(){
 if(typeof globalThis.CustomEvent==='function')globalThis.dispatchEvent?.(new CustomEvent('medcoel-private-model-runtime'));
}`);
 code=once(code,'|| ids.has(id);','|| (ids.has(id) && !runtimeFailures.has(id));');
 code=once(code,'  provisional: inventory?.provisionalSource === true,','  provisional: inventory?.provisionalSource === true,\n  runtimeLoaded: Object.fromEntries(runtimeLoaded), runtimeFailed: [...runtimeFailures.entries()].map(([name,detail])=>({name,...detail})),');
 code=once(code,"inventoryPromise = null; }\n\n/** Validate","inventoryPromise = null; runtimeFailures.clear(); runtimeLoaded.clear(); }\n\n/** Validate");
 code=once(code,'  let done = 0, failed = 0; const queue = [...entries];','  let done = 0, failed = 0; const queue = [...entries];\n  for(const entry of entries)runtimeFailures.delete(entry.name); runtimeLoaded.delete(systemId);');
 code=once(code,'      } catch { failed++; }',`      } catch (error) {
        failed++;
        const reason=String(error?.message||error).slice(0,300);
        runtimeFailures.set(entry.name,{system:systemId,reason});
        console.error('[Private Z-Anatomy] model failed',entry.name,entry.modelPath,error);
      }`);
 code=once(code,"  if (failed) throw new Error('BodyParts3D ' + systemId + ' incomplete: ' + failed + '/' + entries.length + ' models failed');\n  root.userData.bp3d = { total: entries.length, failed };",`  runtimeLoaded.set(systemId, entries.length-failed);
  notifyPrivateRuntime();
  if (failed===entries.length) throw new Error('Private Z-Anatomy '+systemId+': all '+failed+' models failed');
  // Only successful subtrees are attached. Failure remains visible in
  // the private banner and unavailable in search; never imply completeness.
  root.userData.bp3d = { total: entries.length, failed, partial:failed>0 };`);
 return code;
}
export function patchPrivatePanel(code){
 code=once(code,'    <label><input id="bp3dSkin"','    <div id="privateRuntimeCoverage" role="status"></div>\n    <label><input id="bp3dSkin"');
 code=once(code,'  host.querySelector("#bp3dSkin").addEventListener("change", (e) => setSkin(e.target.checked));',`  host.querySelector("#bp3dSkin").addEventListener("change", (e) => setSkin(e.target.checked));
  const runtime=host.querySelector('#privateRuntimeCoverage');
  const refresh=()=>{
    const s=bp3dSummary(),loaded=Object.values(s.runtimeLoaded||{}).reduce((a,b)=>a+b,0),failed=s.runtimeFailed||[];
    runtime.replaceChildren();
    const line=document.createElement('span');
    line.textContent='Runtime: '+fmt(loaded)+' model berhasil dimuat · '+fmt(failed.length)+' gagal · '+fmt(Math.max(0,s.structures-loaded-failed.length))+' belum dimuat';
    runtime.append(line);
    if(failed.length){
      const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('ul');
      summary.textContent='Model gagal (pratinjau tidak lengkap)';
      list.style.maxHeight='140px';list.style.overflow='auto';
      for(const f of failed){const li=document.createElement('li');li.textContent=f.name+' — '+f.reason;list.append(li);}
      details.append(summary,list);runtime.append(details);
    }
  };
  globalThis.addEventListener('medcoel-private-model-runtime',refresh);
  refresh();`);
 return code;
}
