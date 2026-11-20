// gzip-aware fetch helper for label lookup (NiiVue decodes its own copy for rendering).
import { gunzipSync } from 'fflate';
export async function gunzipToArrayBuffer(buffer) {
  const u8 = new Uint8Array(buffer);
  if (u8[0] === 0x1f && u8[1] === 0x8b) { const out = gunzipSync(u8); return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength); }
  return buffer;
}
