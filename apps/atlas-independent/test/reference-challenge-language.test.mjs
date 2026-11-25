import test from 'node:test';
import assert from 'node:assert/strict';
import {challengeLabel,typedReferenceAnswer} from '../src/reference-challenge-language.js';
const median={fmaId:'FMA37068',name:'Left median nerve'};
const vagus={fmaId:'FMA18157',name:'Trunk of left vagus nerve'};
test('exact multilingual labels and conservative typo',()=>{
 for(const s of ['Left median nerve','saraf median kiri','nervus medianus sinister'])assert.equal(typedReferenceAnswer(median,s).correct,true);
 assert.equal(challengeLabel(median,'latin'),'nervus medianus sinister');
 assert.equal(typedReferenceAnswer(median,'nervus medianuss sinister').kind,'MINOR_TYPO');
});
test('reject missing or opposite side, wrong concept and mismatched source identity',()=>{
 for(const s of ['right median nerve','median nerve','saraf median kanan','nervus medianus dexter','nervus medianus siniste','left radial nerve','left right median nerve'])assert.equal(typedReferenceAnswer(median,s).correct,false);
 assert.equal(typedReferenceAnswer(vagus,'left vagus nerve').correct,false);
 assert.equal(typedReferenceAnswer(vagus,'truncus nervi vagi dextri').correct,false);
 assert.equal(typedReferenceAnswer({...median,name:'Right median nerve'},'left median nerve').correct,false);
});
