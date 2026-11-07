import assert from 'node:assert/strict';import {readNrrdFile} from './nrrd.js';import {makeTransform} from './kinematics.js';
const h='NRRD0005\ntype: short\ndimension: 3\nsizes: 2 2 2\nspace: right-anterior-superior\nspace units: "cm" "cm" "cm"\nspace directions: (0.2,0,0) (0,0.3,0) (0,0,0.4)\nspace origin: (1,2,3)\nencoding: raw\nendian: little\n\n';
const v=await readNrrdFile(new File([h,new Int16Array(8)],'units.nrrd'));assert.deepEqual(v.spacing,[2,3,4]);assert.deepEqual(makeTransform(v).voxelToWorld(0,0,0),{x:10,y:20,z:30});
console.log('PASS: NRRD centimetre directions and origin converted to millimetres.');
