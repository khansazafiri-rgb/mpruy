import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { crc32 } from '../apps/studios/tools/zip-range.mjs';
import {
  openPrivateZip, selectCocoCases, sanitizeJpeg, makePrivateFracHtml,
  planFracAtlasArchive
} from './private-fracatlas-review.mjs';

function fakeJpeg(width = 24, height = 16) {
  const head = Buffer.from([0xff,0xd8]);
  const app1 = Buffer.concat([Buffer.from([0xff,0xe1,0,12]),Buffer.from('NameAlice!')]);
  const sof = Buffer.from([0xff,0xc0,0,11,8, height>>8,height&255, width>>8,width&255,1,1,0x11,0]);
  const sos = Buffer.from([0xff,0xda,0,8,1,1,0,0,0x3f,0]);
  return Buffer.concat([head, app1, sof, sos, Buffer.from([12,34,56,0xff,0xd9])]);
}
function zipBytes(files) {
  let offset = 0;
  const locals = [], central = [];
  for (const [name, bytes] of files) {
    const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const filename = Buffer.from(name, 'utf8');
    const packed = zlib.deflateRawSync(data);
    const crc = crc32(data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(8, 8);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(packed.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(filename.length, 26);
    locals.push(head, filename, packed);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50);
    cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(packed.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(filename.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, filename);
    offset += head.length + filename.length + packed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
function tempZip(t, entries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fracatlas-zip-test-'));
  t.after(() => fs.rmSync(dir, {recursive:true,force:true}));
  const file = path.join(dir,'source.zip');
  fs.writeFileSync(file, zipBytes(entries));
  return file;
}
const img = {
  id: 5, width: 24, height: 16, file_name: 'test1.jpg'
};
const coco = {
  images: [img], annotations: [
    {id:1, image_id:5, category_id:1, segmentation: [[4,4,14,4,14,12,4,12]]}
  ], categories:[{id:1,name:'fracture'}]
};

test('FRAC-001: index ZIP, match COCO polygons to true image and strip patient metadata', t => {
  const file = tempZip(t, [
    ['FracAtlas/', ''],
    ['FracAtlas/Annotations/COCO JSON/COCO_fracture_masks.json', JSON.stringify(coco)],
    ['FracAtlas/images/Fractured/test1.jpg', fakeJpeg()]
  ]);
  const zip = openPrivateZip(file);
  try {
    const preview = planFracAtlasArchive(zip, 4);
    assert.equal(preview.cases.length,1);
    assert.equal(preview.cases[0].width,24);
    assert.deepEqual(preview.cases[0].polygons[0],[[4,4],[14,4],[14,12],[4,12]]);
    assert.equal(preview.cases[0].jpeg.includes(Buffer.from('NameAlice!')),false);
    assert.ok(preview.cases[0].jpeg.readUInt16BE(0) === 0xffd8);
    assert.equal(preview.cases[0].jpeg.readUInt16BE(preview.cases[0].jpeg.length-2),0xffd9);
    const html = makePrivateFracHtml(preview.cases);
    assert.match(html,/LOCAL ONLY/);
    assert.match(html,/overlay-1\.svg/);
    assert.doesNotMatch(html,/NameAlice/);
  } finally { zip.close(); }
});

test('FRAC-002: COCO RLE and bbox alone are never converted into synthetic fracture polygons', () => {
  const noPolygon = structuredClone(coco);
  noPolygon.annotations[0].segmentation = {counts:[1,1,1],size:[16,24]};
  assert.deepEqual(selectCocoCases(noPolygon,['FracAtlas/images/Fractured/test1.jpg']),[]);
  noPolygon.annotations[0].segmentation = null;
  noPolygon.annotations[0].bbox = [4,4,10,8];
  assert.deepEqual(selectCocoCases(noPolygon,['FracAtlas/images/Fractured/test1.jpg']),[]);
});

test('FRAC-003: invalid polygon, JPEG dimensions, ZIP member paths and corrupt CRC fail closed', t => {
  const wrong = structuredClone(coco);
  wrong.annotations[0].segmentation = [[3,3,Infinity,3,4,5]];
  assert.throws(() => selectCocoCases(wrong,['FracAtlas/images/Fractured/test1.jpg']),/FRAC_NONFINITE_POLYGON/);
  assert.throws(() => sanitizeJpeg(Buffer.from('not a JPEG')),/FRAC_INVALID_JPEG_CONTAINER/);
  const file = tempZip(t,[['../escape.txt','secret']]);
  assert.throws(() => openPrivateZip(file),/FRAC_UNSAFE_ZIP_MEMBER_PATH/);
  const wrongSize = tempZip(t,[
    ['FracAtlas/Annotations/COCO JSON/COCO_fracture_masks.json',
      JSON.stringify({ ...coco, images:[{...img,width:26}]} )],
    ['FracAtlas/images/Fractured/test1.jpg', fakeJpeg()]
  ]);
  const zip = openPrivateZip(wrongSize);
  try { assert.throws(() => planFracAtlasArchive(zip),/FRAC_COCO_IMAGE_DIMENSIONS_MISMATCH/); }
  finally {zip.close();}
  const crcFile = tempZip(t,[['file.txt','hello']]);
  const bytes = fs.readFileSync(crcFile);
  const cd = bytes.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
  bytes.writeUInt32LE(0xdeadbeef, cd + 16);
  fs.writeFileSync(crcFile,bytes);
  const damaged = openPrivateZip(crcFile);
  try {assert.throws(()=>damaged.readMember('file.txt'),/FRAC_MEMBER_CRC_OR_LENGTH_INVALID/);}
  finally {damaged.close();}
});

test('FRAC-004: only actual matched fracture JPG enters candidate review, not normal cases', t => {
  const source = structuredClone(coco);
  source.images.push({id:6, file_name:'normal.jpg',width:24,height:16});
  source.annotations.push({id:2,image_id:6,segmentation:[[1,1,2,2,3,3]]});
  const matches = selectCocoCases(source,[
    'FracAtlas/images/Fractured/test1.jpg',
    'FracAtlas/images/Non-fractured/normal.jpg'
  ],6);
  assert.equal(matches.length,1);
  assert.equal(matches[0].member,'FracAtlas/images/Fractured/test1.jpg');
});
