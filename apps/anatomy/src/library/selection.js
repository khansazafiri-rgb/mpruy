export async function executeLibrarySelection(command,atlas) {
 const catalog=atlas.catalog(),meta=catalog[command.structureId];
 if(!Object.hasOwn(catalog,command.structureId)||!meta)throw Error('This structure is not available in the supplied atlas.');
 if(command.mode==='find') {
  await atlas.viewGroup(meta.group);
  const bands={headNeck:[1.38,1.9],thorax:[1.08,1.46],abdomen:[.86,1.28],pelvis:[.7,1.04]};
  const region=meta.regions[0],band=bands[region];
  const fits=!band||(meta.box[1]>=band[0]&&meta.box[4]<=band[1]);
  await atlas.chooseRegion(fits&&region?region:'whole');
 } else {
  await atlas.reveal(command.structureId);
  // Context stays visible and faded; isolation remains an explicit viewer action.
 }
 return command.structureId;
}
