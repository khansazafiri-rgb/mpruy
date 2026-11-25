import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePointer} from './audit-bp3d43-mirror-elements.mjs';
test('accept only bounded exact LFS pointer, not substituted text',()=>{
 const pointer='version https://git-lfs.github.com/spec/v1\noid sha256:'+'a'.repeat(64)+'\nsize 128\n';
 assert.deepEqual(parsePointer(pointer),{sha256:'a'.repeat(64),size:128});
 assert.throws(()=>parsePointer(pointer.replace('128','99999999999999999999')));
 assert.throws(()=>parsePointer(pointer.replace('sha256:','sha1:')));
 assert.throws(()=>parsePointer('v 1 2 3'));
});
