import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSourceIdentity,checkReleaseBoundary,checkBodyAttribution,checkHraAttribution} from './replay-independent-source-evidence.mjs';
test('replay requires exact publisher identity, complete element set and source hashes',()=>{
 const source={tree:'isa',hashes:{archive:'a'.repeat(64)},names:[{fmaId:'FMA1',bpId:'BP2',name:'Fixture'}],elements:new Map([['FMA1',new Set(['FJ3'])]]),archiveIndex:new Map([['FJ3','FJ3.obj']])};
 const model={sourceTree:'isa',approvedForDistribution:false,frame:'native-official-OBJ',license:'CC-BY-4.0',sourceHashes:source.hashes,fmaId:'FMA1',bpId:'BP2',name:'Fixture',sourceElements:[{id:'FJ3',zipEntry:'FJ3.obj',sha256:'b'.repeat(64)}]};
 assert.doesNotThrow(()=>checkSourceIdentity(model,source));
 for(const patch of [{name:'Other'},{bpId:'BP99'},{sourceHashes:{}},{sourceElements:[]},{sourceElements:[model.sourceElements[0],model.sourceElements[0]]},{sourceElements:[{...model.sourceElements[0],zipEntry:'../FJ3.obj'}]},{approvedForDistribution:true},{license:'CC-BY-NC-4.0'}])assert.throws(()=>checkSourceIdentity({...model,...patch},source));
});
test('QC cannot infer release approval or enable an owner override',()=>{
 const blocked={status:'blocked',approvedBuilds:[],ownerOverride:{enabled:false}};
 const policy={products:{'atlas-viewer':blocked,'4d-lab':blocked}};
 assert.deepEqual(checkReleaseBoundary(policy),{atlas:'BLOCKED',lab:'BLOCKED',ownerOverride:false});
 for(const patch of [{status:'approved'},{approvedBuilds:['x']},{ownerOverride:{enabled:true}}])assert.throws(()=>checkReleaseBoundary({products:{...policy.products,'atlas-viewer':{...blocked,...patch}}}));
});

test('body attribution binds the historical notice, publisher and archive to the exact model',()=>{
 const m={id:'fixture',name:'Fixture',sha256:'a'.repeat(64),sourceTree:'isa',license:'CC-BY-4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/',attribution:'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International',sourceArchive:'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip',changes:'Converted OBJ',historicalNotice:'Retain CC BY-SA 2.1 Japan notices.'};
 const a={...m,source:m.sourceArchive};assert.doesNotThrow(()=>checkBodyAttribution(m,a));
 for(const patch of [{historicalNotice:''},{attribution:'Other'},{source:'https://example.invalid'},{licenseURL:'https://example.invalid'},{changes:'Other'}])assert.throws(()=>checkBodyAttribution(m,{...a,...patch}));
 assert.throws(()=>checkBodyAttribution({...m,historicalNotice:''},{...a,historicalNotice:''}));
});
test('HRA attribution cannot lose creator, DOI or unchanged-byte statement',()=>{
 const p={assetURL:'fixture',version:'v1.3',doi:'fixture-doi',evidence:'fixture-evidence',license:'CC-BY-4.0',publisher:'HuBMAP',creators:['Fixture Creator']};
 const m={id:'fixture',name:'Fixture',sha256:'a'.repeat(64),exactApiAssetLink:true,publisherRevision:'27d6d493cd53761abb10f087767ec4cc74acb051',sourceURL:p.assetURL,version:p.version,doi:p.doi,evidence:p.evidence,publisherLicense:p.license,creators:p.creators,attribution:'Fixture Creator — Fixture v1.3; HuBMAP / Human Reference Atlas; fixture-doi; CC BY 4.0; https://creativecommons.org/licenses/by/4.0/'};
 const a={...m,source:m.sourceURL,license:m.publisherLicense,changes:'Original published GLB bytes copied without modification'};
 assert.doesNotThrow(()=>checkHraAttribution(m,a,p));
 for(const patch of [{doi:'Other'},{attribution:''},{changes:'Adapted'},{license:'CC-BY-NC-4.0'}])assert.throws(()=>checkHraAttribution(m,{...a,...patch},p));
 assert.throws(()=>checkHraAttribution(m,a,{...p,creators:['Other']}));
});
