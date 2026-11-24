import test from 'node:test';
import assert from 'node:assert/strict';
import {FOCUS_SOURCE_REVIEW_ONLY,selectFocusSourceReview} from '../tools/bp3d-focus-source-shortlist.mjs';

const fixtures=()=>{
 const catalog=Object.fromEntries(FOCUS_SOURCE_REVIEW_ONLY.map(x=>[x.atlasName,{
   source:x.atlasName.includes('digiti')?'muscular':
     ['Manubrium of sternum','Ethmoid bone','Nasal septal cartilage'].includes(x.atlasName)?'skeletal':'visceral',
   group:'review-only',regions:[]}]));
 const officialRows=FOCUS_SOURCE_REVIEW_ONLY.map(x=>({name:x.officialName,fmaId:x.fmaId,bpId:x.bpId}));
 const elements=new Map(FOCUS_SOURCE_REVIEW_ONLY.map(x=>[x.fmaId,new Set(x.fjIds)]));
 const archiveFiles=FOCUS_SOURCE_REVIEW_ONLY.flatMap(x=>x.fjIds.map(y=>'obj/'+y+'.obj'));
 return {catalog,officialRows,elements,archiveFiles,existing:[]};
};
test('all 18 exact documented candidate identities can be PREPARED privately, none medically approved',()=>{
 const report=selectFocusSourceReview(fixtures());
 assert.equal(report.summary.attempted,18);
 assert.equal(report.summary.selected,18,JSON.stringify(report.rejected));
 assert.equal(report.summary.rejected,0);
 assert.equal(report.summary.medicallyApproved,0);
 assert.equal(report.summary.commerciallyApproved,0);
 assert.equal(report.candidates.every(x=>x.matches[0].sourceObjs.length===1 &&
   x.geometryIdentityVerified===false &&
   x.redistributionApproved===false &&
   x.matchMethod==='provisional-name-review-NOT-validated'),true);
 assert.equal(new Set(report.candidates.map(x=>x.matches[0].fmaId+'|'+x.matches[0].bpId)).size,18);
});
test('cannot repurpose already converted publisher FMA/BP or shared FJ geometry',()=>{
 const a=FOCUS_SOURCE_REVIEW_ONLY[0],args=fixtures();
 const claimed=selectFocusSourceReview({...args,existing:[{name:'prior model',fmaId:a.fmaId,bpId:a.bpId}]});
 assert.ok(claimed.rejected.some(x=>x.atlasName===a.atlasName&&x.reason==='OFFICIAL_ID_ALREADY_CONVERTED'));
 const other=selectFocusSourceReview({...args,existing:[{name:'parent aggregate model',
   fmaId:'FMA999',bpId:'BP999'}],
   elements:new Map([...args.elements,['FMA999',new Set(a.fjIds)]])});
 assert.ok(other.rejected.some(x=>x.atlasName===a.atlasName&&x.reason==='SOURCE_FJ_GEOMETRY_ALREADY_CLAIMED'));
});
test('official publisher naming, complete FJ archive entries and exact FMA/BP are mandatory',()=>{
 const a=FOCUS_SOURCE_REVIEW_ONLY[0],args=fixtures();
 const renamed=selectFocusSourceReview({...args,officialRows:args.officialRows.map(x=>
   x.fmaId===a.fmaId?{...x,name:'right foot vein'}:x)});
 assert.ok(renamed.rejected.some(x=>x.atlasName===a.atlasName&&x.reason==='PUBLISHER_FMA_BP_NAME_CHANGED'));
 const wrongFj=selectFocusSourceReview({...args,elements:new Map([...args.elements].map(([key,ids])=>
   [key,key===a.fmaId?new Set(['FJ999']):ids]))});
 assert.ok(wrongFj.rejected.some(x=>x.atlasName===a.atlasName&&x.reason==='SOURCE_FJ_SET_CHANGED'));
 const missing=selectFocusSourceReview({...args,archiveFiles:args.archiveFiles.filter(x=>!x.endsWith(a.fjIds[0]+'.obj'))});
 assert.ok(missing.rejected.some(x=>x.atlasName===a.atlasName&&x.reason==='SOURCE_FJ_OBJ_MISSING'));
});
test('source candidate search never silently treats related anatomy as exact identity',()=>{
 const args=fixtures(),first=FOCUS_SOURCE_REVIEW_ONLY[0];
 const mixed=selectFocusSourceReview({...args,
   officialRows:args.officialRows.map(x=>x.fmaId===first.fmaId?
     {...x,name:'abductor digiti minimi of right foot'}:x)});
 assert.equal(mixed.candidates.some(x=>x.atlasName===first.atlasName),false);
});
