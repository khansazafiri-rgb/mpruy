import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {useAuth} from '@/context/AuthContext';
import {ANATOMY_VIEWER_PATH} from './hostProtocol.mjs';
import {buildRegistry} from './registry.mjs';
import {createLocalProgressRepository,emptyProgress} from './libraryProgress.mjs';
const Context=createContext(null);
let cachedRegistry;
async function fetchRegistry() {
 if(!cachedRegistry)cachedRegistry=(async()=>{
  const names=['systems','atlas-catalog','lexicon','definitions','synonyms.it','library-reference','structure-thumbnails'];
  const results=await Promise.all(names.map(async name=>{const response=await fetch(ANATOMY_VIEWER_PATH+'data/'+name+'.json');if(!response.ok)throw Error('Data Anatomy belum tersedia. Muat ulang setelah viewer diperbarui.');return response.json();}));
  return buildRegistry({systems:results[0],catalog:results[1],lexicon:results[2],definitions:results[3],synonyms:results[4],reference:results[5],previews:results[6]});
 })().catch(e=>{cachedRegistry=null;throw e;});return cachedRegistry;
}
export function AnatomyDataProvider({children}) {
 const {me}=useAuth(),[registry,setRegistry]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const repository=useMemo(()=>createLocalProgressRepository(localStorage,me.id),[me.id]);
 const [initialProgress]=useState(()=>{try{return {value:repository.load(),error:''};}catch{return {value:emptyProgress(),error:'Progres lokal tidak dapat dibaca. Sesi baru dimulai di perangkat ini.'};}});
 const [progress,setProgress]=useState(initialProgress.value),[storageError,setStorageError]=useState(initialProgress.error);
 useEffect(()=>{let alive=true;fetchRegistry().then(r=>{if(alive){setRegistry(r);setError('');}}).catch(e=>alive&&setError(e.message));return()=>{alive=false;};},[attempt]);
 function updateProgress(next){setProgress(next);try{repository.save(next);setStorageError('');}catch{setStorageError('Progres hanya tersimpan di sesi ini; penyimpanan browser tidak tersedia.');}}
 return <Context.Provider value={{registry,error,retry:()=>setAttempt(x=>x+1),progress,updateProgress,storageError}}>{children}</Context.Provider>;
}
export const useAnatomyLibrary=()=>useContext(Context);
