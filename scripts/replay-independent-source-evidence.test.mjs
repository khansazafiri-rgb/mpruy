import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSourceIdentity,checkReleaseBoundary} from './replay-independent-source-evidence.mjs';
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
