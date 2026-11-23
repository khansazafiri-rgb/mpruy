// Separate from licensing/quarantine-policy.json: an operational fail-closed
// public deployment gate for the exact assets observed served without
// commercial rights clearance on 2026-11-23. Not an approval of any other asset.
// Do not swap a withheld skeletal/visceral system for a mislabeled geometry.
export const PUBLIC_WITHHELD_SOURCES = Object.freeze(['skeletal','visceral']);
export function isPublicContainment(location = globalThis.location){
  const hostname=String(location?.hostname||'').toLowerCase();
  return hostname==='medcoel.com'||hostname==='www.medcoel.com';
}
export function isPublicWithheldSource(source,location=globalThis.location){
  return isPublicContainment(location)&&PUBLIC_WITHHELD_SOURCES.includes(source);
}
export function recoverPublicGroups(groups,studyGroups,location=globalThis.location){
  if(!isPublicContainment(location))return groups;
  const updated=structuredClone(groups);
  for(const g of studyGroups)if(isPublicWithheldSource(g.source,location)&&updated[g.id])
    updated[g.id].enabled=false;
  // Show only the already-deployed muscular system as a limited substitute
  // view; do not label it skeletal or visceral.
  if(!Object.values(updated).some(s=>s.enabled)&&updated.muscular)
    updated.muscular={enabled:true,removed:0};
  return updated;
}
