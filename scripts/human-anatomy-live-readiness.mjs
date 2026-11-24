// MEDCOEL Human Anatomy deployment diagnostic. READ ONLY: GET and HEAD
// against the actual site, never deployment, uploads, writes or auth cookies.
// Reports runtime readiness separately from medical and commercial clearance.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {checkLiveLab} from '../apps/web/src/features/anatomy/liveLab.mjs';
import {checkViewerAsset} from '../apps/web/src/features/anatomy/hostProtocol.mjs';

const rights=JSON.parse(fs.readFileSync(new URL('../licensing/commercial-release.json',import.meta.url),'utf8'));
export async function auditHumanAnatomyHost(fetcher){
  const result={schema:'medcoel.human-anatomy-host-readiness.v1',
    atlas:{mounted:false,error:null},lab4d:{mounted:false,error:null},
    quarantine:{privateBP3DBlocked:false,atlasCTBlocked:false},
    rights:{atlasViewer:rights.products['atlas-viewer'].status,
      lab4d:rights.products['4d-lab'].status},
    commercialPolicyCleared:false,exactBuildApproved:false,readyForPublicClinicalUse:false};
  try{await checkViewerAsset(fetcher);result.atlas.mounted=true;}
  catch(e){result.atlas.error=e.message;}
  try{await checkLiveLab(fetcher);result.lab4d.mounted=true;}
  catch(e){result.lab4d.error=e.message;}
  try{
    const bp=await fetcher('/anatomy/viewer/bp3d/inventory.json',{method:'HEAD',cache:'no-store'});
    result.quarantine.privateBP3DBlocked=bp.status===404;
  }catch(e){result.quarantine.bp3dProbeError=e.message;}
  try{
    const ct=await fetcher('/anatomy/4d-lab/data/atlas/ct.nrrd',{method:'HEAD',cache:'no-store'});
    result.quarantine.atlasCTBlocked=ct.status===404;
  }catch(e){result.quarantine.atlasCTProbeError=e.message;}
  result.runtimeRoutesReady=result.atlas.mounted&&result.lab4d.mounted;
  result.commercialPolicyCleared=result.rights.atlasViewer==='cleared'&&result.rights.lab4d==='cleared';
  // A cleared product policy is still NOT approval of this exact build digest.
  // This read-only probe never validates medical morphology or issuer consent.
  result.action=result.commercialPolicyCleared&&result.runtimeRoutesReady
    ? 'Perform separate exact-build licence and clinical review before public release.'
    : 'Keep private GLBs and unapproved Atlas CT withheld; correct missing routes, source permissions and reviewed build before activating.';
  return result;
}
async function main(){
  const target=(process.env.MEDCOEL_HUMAN_ANATOMY_BASE||'https://medcoel.com').replace(/\/+$/,'');
  const url=new URL(target);
  if(!['http:','https:'].includes(url.protocol))throw Error('Only http(s) health checks are supported');
  const fetcher=(pathname,options={})=>
    fetch(new URL(pathname,url.origin),{...options,redirect:'manual',
      signal:options.signal||AbortSignal.timeout(12000)});
  const report=await auditHumanAnatomyHost(fetcher);
  console.log(JSON.stringify({base:url.origin,...report},null,2));
  if(!report.runtimeRoutesReady||!report.commercialPolicyCleared||
     !report.quarantine.privateBP3DBlocked)process.exitCode=1;
}
if(process.argv[1]===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error('Human Anatomy read-only readiness check failed: '+e.message);process.exitCode=2;});
