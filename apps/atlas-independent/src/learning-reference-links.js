// Related source elements are educational references, never whole-concept matches.
import {REFERENCE43_TOPIC_ROWS} from './reference43-topic-catalog.js';
import {muscleCheckpointAliases} from './learning-links.js';
const key=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ');
const discExamples=new Map(REFERENCE43_TOPIC_ROWS.filter(e=>e.system==='cartilage'&&e.region==='spine'&&e.name.startsWith('Intervertebral disk of ')).map(e=>[e.fmaId,e.name.toLowerCase()]));
const bilateralTargets=new Set(['olfactory tract','vagus nerve','phrenic nerve','olfactory nerve','oculomotor nerve','trigeminal nerve','abducens nerve','facial nerve','vestibulocochlear nerve','glossopharyngeal nerve','accessory nerve','hypoglossal nerve']);
const plexusTargets=new Set(['brachial plexus','left brachial plexus','right brachial plexus']);
export function referenceRelation(group,target,name,fmaId){
 const t=key(target),n=key(name);
 if(n===t)return 'EXACT_LABEL';
 if(group==='muscular'&&muscleCheckpointAliases[t]?.[1]===n&&muscleCheckpointAliases[t]?.[0]===fmaId)return 'PINNED_MUSCLE_LABEL';
 if(group==='joints'&&t==='intervertebral disc'&&discExamples.get(fmaId)===n)return 'LEVEL_SPECIFIC_REFERENCE';
 if(group!=='nervous')return null;
 if(bilateralTargets.has(t)&&['left '+t,'right '+t,'trunk of left '+t,'trunk of right '+t,'trunk of '+t].includes(n))return 'RELATED_COMPONENT_ONLY';
 if(plexusTargets.has(t)&&/^(inferior|middle|superior) trunk of (left|right) brachial nerve plexus$|^(lateral|medial|posterior) cord of (left|right) brachial nerve plexus$/.test(n)&&(!t.startsWith('left ')||n.includes('left '))&&(!t.startsWith('right ')||n.includes('right ')))return 'RELATED_COMPONENT_ONLY';
 return null;
}
export function privateReference(e){return /^bp43-[a-f0-9]{24}$/.test(e.id||'')&&/^FMA\d+$/.test(e.fmaId||'')&&/^FJ\d+[A-Za-z]?$/.test(e.fj||'')&&e.scope==='SINGLE_SOURCE_ELEMENT'&&e.approvedForDistribution===false&&e.registrationValidated===false&&e.clinicalValidation===false;}
