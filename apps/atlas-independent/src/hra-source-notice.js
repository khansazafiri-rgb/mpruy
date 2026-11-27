// Source-bound educational caveats; do not infer clinical anatomy from source object names.
const notes=Object.freeze({
 NOT_INDEPENDENT_BILATERAL_ANATOMY:'Bukan anatomi bilateral independen.',
 NO_LATERALIZATION_OR_ASYMMETRY_CLAIMS:'Tidak untuk menyimpulkan lateralisasi atau asimetri.',
 NO_SEX_SPECIFIC_NEUROANATOMY_CLAIMS:'Tidak untuk menyimpulkan perbedaan neuroanatomi berdasarkan jenis kelamin.',
 SOURCE_DONOR_HAS_SIX_LUMBAR_VERTEBRAE:'Donor sumber memiliki enam vertebra lumbal.',
 SOURCE_CROSSWALK_INCOMPLETE_FOR_STANDARD_SEGMENT_SET:'Crosswalk tidak mencakup seluruh set segmen standar.',
 SOURCE_CROSSWALK_DOES_NOT_ESTABLISH_FULL_STANDARD_SEGMENT_SET:'Crosswalk tidak membuktikan kelengkapan seluruh segmen standar.'
});
export function hraSourceNotice(e){
 const organ=typeof e?.source==='string'?e.source.match(/^https:\/\/cdn\.humanatlas\.io\/digital-objects\/ref-organ\/(brain|spinal-cord)-(female|male)\/v(1\.4|1\.1)\/assets\/[a-z0-9-]+\.glb$/):null;
 if(!organ||organ[1]==='brain'&&organ[3]!=='1.4'||organ[1]==='spinal-cord'&&organ[3]!=='1.1')return '';
 const expected=organ[1]==='brain'?'PUBLISHER_MIRRORED_AND_RESCALED_ALLEN_ATLAS':'VISIBLE_HUMAN_SOURCE';
 if(e.sourceMethod!==expected||!Array.isArray(e.clinicalLimitations))return ' · Metadata metode sumber belum terverifikasi; jangan gunakan untuk kesimpulan klinis.';
 const required=organ[1]==='brain'?['NOT_INDEPENDENT_BILATERAL_ANATOMY','NO_LATERALIZATION_OR_ASYMMETRY_CLAIMS','NO_SEX_SPECIFIC_NEUROANATOMY_CLAIMS']:organ[2]==='female'?['SOURCE_DONOR_HAS_SIX_LUMBAR_VERTEBRAE','SOURCE_CROSSWALK_INCOMPLETE_FOR_STANDARD_SEGMENT_SET']:['SOURCE_CROSSWALK_DOES_NOT_ESTABLISH_FULL_STANDARD_SEGMENT_SET'];
 if(!required.every(k=>e.clinicalLimitations.includes(k)))return ' · Metadata batasan sumber belum lengkap; jangan gunakan untuk kesimpulan klinis.';
 return ' · '+(organ[1]==='brain'?'Atlas Allen dicerminkan dan diskalakan oleh publisher. ':'Sumber Visible Human. ')+required.map(k=>notes[k]).join(' ');
}
