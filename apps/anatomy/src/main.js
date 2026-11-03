import {beginPhase,reportPerf} from './utils/perf.js';
import {reportAtlasStatus} from './integration/host.js';
import '@fontsource-variable/inter';import '@fontsource-variable/plus-jakarta-sans';
import './styles/medcoel-tokens.css';import './styles/atlas-v3.css';
import {createScene} from './viewer/createScene.js';
import {initSelection} from './viewer/selection.js';
import {enableBackgroundGeometry} from './viewer/backgroundGeometry.js';
import {setViewer,setPartsData,setSystemsData,setTranslations,subscribe} from './state/store.js';
import {loadSystemsData,loadLexicon,loadDefinitions,buildPartsData} from './data/anatomy.js';
import {translationsIt,translationsEn} from './data/translations.js';
import {fetchJson} from './utils/fetchJson.js';import {initAtlas,settings} from './atlas/engine.js';import {initUI} from './atlas/ui.js';
async function start(){
 const overlay=document.getElementById('loadingOverlay');
 try{
  reportAtlasStatus('loading',{phase:'scene',message:'Menyiapkan WebGL…'});
  const sceneTimer=beginPhase('scene'),viewer=createScene();sceneTimer();
  const params=new URLSearchParams(location.search),embedded=window.parent!==window;
  if(embedded&&params.get('annotator')==='1')document.body.classList.add('anatomy-annotator-active');
  if(embedded&&params.get('study')==='1')document.body.classList.add('anatomy-study-active');
  setViewer(viewer);viewer.startRenderLoop();setTranslations({it:translationsIt,en:translationsEn});
  reportAtlasStatus('loading',{phase:'metadata',message:'Memuat katalog anatomi…'});
  const metadataTimer=beginPhase('metadata');
  const [systems,catalog]=await Promise.all([loadSystemsData(),fetchJson('data/atlas-catalog.json')]);metadataTimer();
  const enrich=lexicon=>{const parts=buildPartsData(systems,lexicon);for(const [id,meta]of Object.entries(catalog))if(parts[id])Object.assign(parts[id],{studyGroup:meta.group,studyRegions:meta.regions});setPartsData(parts);};
  setSystemsData(systems);enrich({});
  subscribe('loading',data=>{const message='Memuat '+data.system+(data.total?' · '+Math.round(data.progress||0)+'%':'…');overlay.querySelector('.loading-text').textContent=message;reportAtlasStatus('loading',{phase:'model',message,progress:Math.round(data.progress||0)});});
  settings.groups.muscular.removed=1;
  const atlasTimer=beginPhase('atlas init');await initAtlas(catalog);atlasTimer();
  const uiTimer=beginPhase('UI');await initUI();uiTimer();initSelection(viewer);
  const {installLibraryBridge}=await import('./library/bridge.js');installLibraryBridge(viewer);
  if(embedded&&params.get('annotator')==='1'){const {installAnnotator}=await import('./annotations/annotator.js');installAnnotator(viewer);}
  const firstFrame=beginPhase('first frame');viewer.renderer.render(viewer.scene,viewer.camera);firstFrame();
  overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');reportAtlasStatus('interactive',{phase:'interactive',message:'Atlas dapat digunakan.'});reportPerf('interactive');
  reportAtlasStatus('ready');
  // Yield a painted, selectable skeleton before indexing/BVH and descriptions.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   enableBackgroundGeometry(viewer.render);
   loadLexicon().then(enrich).catch(()=>{});
   loadDefinitions();reportPerf('background started');
  }));
  document.addEventListener('visibilitychange',()=>document.hidden?viewer.stopRenderLoop():viewer.startRenderLoop());
 }catch(error){
  console.error('Anatomy startup failed:',error.message);
  reportAtlasStatus('error',{message:error.message});
  overlay.querySelector('.loading-text').textContent=error.message;overlay.querySelector('.loading-spinner').hidden=true;
  const retry=document.createElement('button');retry.className='action-btn';retry.textContent='Muat ulang atlas';retry.onclick=()=>location.reload();overlay.appendChild(retry);
 }
}
start();
