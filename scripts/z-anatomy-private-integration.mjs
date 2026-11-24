// Private source-specific engine/UI integration. Fail closed on upstream changes.
function once(code,a,b){if(code.split(a).length!==2)throw Error('Private integration anchor mismatch: '+a.slice(0,100));return code.replace(a,()=>b);}
export function patchNativeEngine(code){
 code=once(code,'import { bp3dHas } from "../viewer/bp3dSource.js";',`import { bp3dHas, bp3dUsesSystem } from "../viewer/bp3dSource.js";
import {representationIndex,representationVisible,focusRepresentation,validRepresentationState} from "./privateOrganRepresentations.js";
const nativeStorageKey="medcoel:atlas:z-anatomy-private:v1";
const nativeFrame="z-anatomy-world-y-up-metres";
let nativeRepresentations=new Map();`);
 code=once(code,'return m && visibleBySettings(m, settings);',`return m && visibleBySettings(m, settings) &&
      representationVisible(id,nativeRepresentations,x=>getMeshRegistry().has(x),settings,selectedIsolation||state.selectedPart?.id);`);
 const bands=/const bands = \{\s*headNeck: \[1\.38, 1\.9\],\s*thorax: \[1\.08, 1\.46\],\s*abdomen: \[0\.86, 1\.28\],\s*pelvis: \[0\.7, 1\.04\],\s*\};/g;
 if([...code.matchAll(bands)].length!==3)throw Error('Private coordinate band anchors changed');
 code=code.replace(bands,'const bands = {}; // native frame: metadata filter, no legacy-height clipping');
 code=once(code,'m.geometry.computeBoundingBox();','if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();');
 code=once(code,'GROUPS.filter((g) => settings.groups[g.id].enabled && !isPublicWithheldSource(g.source)).map((g) => g.source)',`GROUPS.filter((g) => settings.groups[g.id]?.enabled && !isPublicWithheldSource(g.source) && bp3dUsesSystem(g.source) &&
        Object.entries(catalog).some(([id,m])=>m.group===g.id&&bp3dHas(id,g.source))).map((g) => g.source)`);
 code=once(code,'      } catch {\n        failed.push(source);','      } catch (error) {\n        console.error("[Private source] system failed",source,error);\n        failed.push(source);');
 code=once(code,'export const chooseRegion = (id) =>',`export const setOrganRepresentation = (mode) => {
  if(!["auto","whole","parts","all"].includes(mode))throw new Error("Invalid organ representation");
  return commit(()=>{settings.representationMode=mode;settings.representationOverrides={};},{fit:false});
};
export const chooseRegion = (id) =>`);
 code=once(code,'    const yMin = meta.box[1],','    focusRepresentation(id,nativeRepresentations,settings);\n    const yMin = meta.box[1],');
 code=once(code,'  quiet(() => showPart(id));\n  mask();\n  selectPartById(id, state.viewer);',`  if(!getMeshRegistry().has(id))throw new Error("Model belum berhasil dimuat: "+id);
  quiet(() => showPart(id));
  mask();
  if(!selectPartById(id, state.viewer))throw new Error("Struktur belum dapat dipilih: "+id);`);
 code=once(code,'    settings: context.settings,','    sourceFrame:nativeFrame,\n    settings: context.settings,');
 code=code.replaceAll('"medcoel:atlas:v2"','nativeStorageKey');
 code=once(code,'    !saved?.settings ||','    saved?.sourceFrame!==nativeFrame || !saved?.settings || !validRepresentationState(saved.settings) ||');
 code=once(code,'  catalog = data;\n  state.atlas = {};','  catalog = data;\n  nativeRepresentations=representationIndex(catalog,bp3dHas);\n  state.atlas = {};');
 code=once(code,'  if (validSaved(saved)) {','  if(!validSaved(saved))saved=null;\n  if (validSaved(saved)) {');
 code=once(code,'  await loadEnabled();\n  if (validSaved(saved)',`  let initialError=null;
  try{await loadEnabled();}catch(error){initialError=error.message;}
  if (validSaved(saved)`);
 code=once(code,'  status = "Ready";\n  await frame(undefined,','  status = initialError||"Ready";\n  await frame(undefined,');
 code=once(code,'  if (saved?.selected && catalog[saved.selected]) await reveal(saved.selected);',`  if(saved?.selected&&catalog[saved.selected]&&bp3dHas(saved.selected,catalog[saved.selected].source)){
    try{await reveal(saved.selected);}catch(error){status=error.message;}
  }`);
 return code;
}
export function patchNativeUI(code){
 code=once(code,'  getStatus,\n','  getStatus,\n  getCatalog,\n');
 code=once(code,'const total = g.layers.length, shown = value.enabled ? total - value.removed : 0;',`const hasCandidates=Object.entries(getCatalog()).some(([id,m])=>m.group===g.id&&bp3dHas(id,g.source));
    const total = g.layers.length, shown = value.enabled ? total - value.removed : 0;`);
 code=once(code,'${pending ? "disabled" : ""} title="${escape(g.label)} · ${escape(layerName)}','${pending || !hasCandidates ? "disabled" : ""} title="${escape(g.label)} · ${escape(layerName)}');
 code=once(code,'${pending || (value.enabled && value.removed === 0) ? "disabled" : ""}','${pending || !hasCandidates || (value.enabled && value.removed === 0) ? "disabled" : ""}');
 code=once(code,'${pending || !value.enabled ? "disabled" : ""}','${pending || !hasCandidates || !value.enabled ? "disabled" : ""}');
 code=once(code,'    if(isPublicWithheldSource(group.source))continue;','    if(isPublicWithheldSource(group.source)||!Object.entries(getCatalog()).some(([id,m])=>m.group===group.id&&bp3dHas(id,group.source)))continue;');
 code=once(code,'terms = [n, normalise(info.latinName || "")];','terms = [n, normalise(id), normalise(info.name?.en||""), normalise(info.latinName || "")];');
 code=once(code,'const image = structurePreview(id);','const image = null; // no legacy structure thumbnail in native source view');
 code=once(code,'image = !r.system && structurePreview(r.id);','image = null;');
 if(code.split('hostedShareUrl(shareView())').length!==3)throw Error('Private share anchors changed');
 code=code.replaceAll('hostedShareUrl(shareView())','shareView()'); // private loopback link only
 return code;
}
export function patchNativePanel(code){
 code=once(code,'import { GROUPS } from "./catalog.js";',`import { GROUPS } from "./catalog.js";
import { settings, setOrganRepresentation } from "./engine.js";`);
 code=once(code,'    <label><input id="bp3dSkin" type="checkbox" data-testid="bp3d-skin"> Kulit referensi</label>',`    <label><input id="bp3dSkin" type="checkbox" data-testid="bp3d-skin" disabled> Kulit referensi (tidak tersedia)</label>
    <label>Representasi organ <select id="nativeRepresentation"><option value="auto">Otomatis (komponen lengkap jika tersedia)</option><option value="whole">Organ utuh</option><option value="parts">Komponen</option><option value="all">Semua kandidat</option></select></label>
    <small>Alternatif paru/lobus, tiroid, dan hipofisis berdasarkan nama sumber; bukan verifikasi permukaan. Pencarian dapat membuka alternatif individual.</small>`);
 code=once(code,'    <a href="${esc(backToAtlasHref())}" data-testid="bp3d-back">Kembali ke model Atlas</a>','');
 code=once(code,'  host.querySelector("#bp3dSkin").addEventListener("change", (e) => setSkin(e.target.checked));',`  host.querySelector("#bp3dSkin").addEventListener("change", (e) => setSkin(e.target.checked));
  const selector=host.querySelector("#nativeRepresentation");
  selector.value=settings.representationMode||"auto";
  selector.addEventListener("change",async()=>{
    selector.disabled=true;
    try{await setOrganRepresentation(selector.value);}
    catch(error){console.error("Representation selection failed",error);}
    finally{selector.disabled=false;}
  });`);
 return code;
}
