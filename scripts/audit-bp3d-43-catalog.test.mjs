import test from 'node:test';
import assert from 'node:assert/strict';
import {parse43Manifest,compare43} from './audit-bp3d-43-catalog.mjs';
const header='# Data Version\t4.3\n# Objects set\t4.3\n# Tree version FMA3.0\n';
test('explicit version and element membership, not filename or timestamp',()=>{
 const data=parse43Manifest(header+'FMA1\tis_a\tFJ1+FJ2\nFMA1\tpart_of\tFJ3\nFMA2\tis_a\tFJ2\n');
 assert.equal(data.rows.length,3);assert.deepEqual(data.elements,['FJ1','FJ2','FJ3']);
 const report=compare43(data,[{fmaId:'FMA1',sourceElements:[{id:'FJ1'}]}]);
 assert.equal(report.concepts,2);assert.equal(report.notInCurrentBodyConcepts,1);
 assert.equal(report.elementIdsNotInCurrentBody,2);
 assert.equal(report.registrationValidated,false);assert.equal(report.publicRelease,'NO_GO');
});
test('reject wrong version, unknown component, conflicting membership',()=>{
 assert.throws(()=>parse43Manifest(header.replace('Objects set\t4.3','Objects set\t4.0')+'FMA1 is_a FJ1'));
 assert.throws(()=>parse43Manifest(header+'FMA1 is_a OTHER123'));
 assert.throws(()=>parse43Manifest(header+'FMA1 is_a FJ1\nFMA1 is_a FJ2'));
});
