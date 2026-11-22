import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { png as greyscaleFixture } from '../apps/studios/tools/make-image-fixture.mjs';
import { renderPrivateOverlay } from './generate-private-chest-xray-overlays.mjs';

function inspectRgbaPng(bytes) {
  assert.equal(bytes.readUInt32BE(0), 0x89504e47);
  let cursor = 8, width = 0, height = 0;
  const chunks = [], packed = [];
  while (cursor < bytes.length) {
    const length = bytes.readUInt32BE(cursor);
    const kind = bytes.toString('ascii', cursor + 4, cursor + 8);
    const data = bytes.subarray(cursor + 8, cursor + 8 + length);
    chunks.push(kind);
    if (kind === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[9], 6); // RGBA
    } else if (kind === 'IDAT') packed.push(data);
    cursor += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(packed));
  const pixel = (x, y) => {
    const stride = width * 4 + 1, offset = y * stride + 1 + x * 4;
    assert.equal(raw[y * stride], 0);
    return [...raw.subarray(offset, offset + 4)];
  };
  return { width, height, chunks, pixel };
}

test('PTX-OVERLAY-001: draw source-coordinate polygons over synthetic greyscale image only', () => {
  const input = greyscaleFixture(20, 16, () => 120);
  const result = renderPrivateOverlay(input, {
    schema: 'medcoel.annotations.v1', regions: [{
      id: 'synthetic-1', label: 'Synthetic fixture, not a patient image',
      polygon: [[4.5, 3.5], [15.5, 3.5], [15.5, 12.5], [4.5, 12.5]]
    }]
  });
  assert.equal(result.width, 20);
  assert.equal(result.height, 16);
  assert.equal(result.regions, 1);
  const png = inspectRgbaPng(result.png);
  assert.deepEqual(png.chunks, ['IHDR', 'IDAT', 'IEND']); // no metadata/text
  assert.deepEqual(png.pixel(0, 0), [120, 120, 120, 255]);
  const center = png.pixel(9, 8);
  assert.equal(center[3], 255);
  assert.ok(center[0] > center[1], 'red overlay should be visible');
  assert.ok(center[1] < 120, 'fill should be translucent on original grey');
  assert.deepEqual(png.pixel(4, 4), [255, 35, 35, 255]); // 2-px red outline
});

test('PTX-OVERLAY-002: reject invalid/out-of-bounds polygon without producing a reviewer image', () => {
  const image = greyscaleFixture(20, 16, () => 100);
  const make = polygon => ({
    schema: 'medcoel.annotations.v1',
    regions: [{ id: 'synthetic-1', polygon }]
  });
  assert.throws(
    () => renderPrivateOverlay(image, make([[1, 1], [2, 2]])), /REVIEW_INVALID_POLYGON/
  );
  assert.throws(
    () => renderPrivateOverlay(image, make([[1, 1], [40, 1], [2, 8]])), /REVIEW_POLYGON_OUTSIDE_IMAGE/
  );
  assert.throws(
    () => renderPrivateOverlay(image, make([[1, 1], [NaN, 1], [2, 8]])), /REVIEW_POLYGON_OUTSIDE_IMAGE/
  );
  assert.throws(
    () => renderPrivateOverlay(image, { schema: 'wrong', regions: [] }), /REVIEW_INVALID_ANNOTATIONS/
  );
});
