export async function executeLibrarySelection(command,atlas) {
 const catalog=atlas.catalog(),meta=catalog[command.structureId];
 if(!Object.hasOwn(catalog,command.structureId)||!meta)throw Error('This structure is not available in the supplied atlas.');
 // Scope comes from participant setup, never inferred from the answer.
 if(command.mode==='find')await atlas.prepareStudy({region:command.region,system:command.system});
 else {if(command.mode!=='explore')atlas.restoreScene();await atlas.reveal(command.structureId);}
 return command.structureId;
}
