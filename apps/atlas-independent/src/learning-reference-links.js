// Related source elements are educational references, never whole-concept matches.
import {muscleCheckpointAliases} from './learning-links.js';
const key=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ');
const bilateralTargets=new Set(['olfactory tract','vagus nerve','phrenic nerve','olfactory nerve','oculomotor nerve','trigeminal nerve','abducens nerve','facial nerve','vestibulocochlear nerve','glossopharyngeal nerve','accessory nerve','hypoglossal nerve']);
const plexusTargets=new Set(['brachial plexus','left brachial plexus','right brachial plexus']);
export function referenceRelation(group,target,name){
 const t=key(target),n=key(name);
 if(n===t)return 'EXACT_LABEL';
 if(group==='muscular'&&muscleCheckpointAliases[t]?.[1]===n)return 'PINNED_MUSCLE_LABEL';
 if(group!=='nervous')return null;
 if(bilateralTargets.has(t)&&['left '+t,'right '+t,'trunk of left '+t,'trunk of right '+t,'trunk of '+t].includes(n))return 'RELATED_COMPONENT_ONLY';
 if(plexusTargets.has(t)&&/^(inferior|middle|superior) trunk of (left|right) brachial nerve plexus$|^(lateral|medial|posterior) cord of (left|right) brachial nerve plexus$/.test(n)&&(!t.startsWith('left ')||n.includes('left '))&&(!t.startsWith('right ')||n.includes('right ')))return 'RELATED_COMPONENT_ONLY';
 return null;
}
export function privateReference(e){return /^bp43-[a-f0-9]{24}$/.test(e.id||'')&&/^FMA\d+$/.test(e.fmaId||'')&&/^FJ\d+[A-Za-z]?$/.test(e.fj||'')&&e.scope==='SINGLE_SOURCE_ELEMENT'&&e.approvedForDistribution===false&&e.registrationValidated===false&&e.clinicalValidation===false;}
