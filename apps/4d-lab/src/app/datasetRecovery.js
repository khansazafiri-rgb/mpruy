/**
 * Browser-agnostic recovery policy for the existing procedural phantom.
 * Never falls back to an alternate Atlas/public path or republishes a held file.
 */
export async function recoverBundledDataset(requested,read,onRecovered=()=>{}){
  try{
    await read(requested);
    return {dataset:requested,recovered:false};
  }catch(primary){
    if(requested!=='atlas')throw primary;
    try{await read('phantom');}
    catch(secondary){
      throw new Error('Atlas tidak tersedia ('+(primary?.message||primary)+
        '); phantom prosedural juga gagal ('+(secondary?.message||secondary)+').');
    }
    onRecovered(primary);
    return {dataset:'phantom',recovered:true};
  }
}
