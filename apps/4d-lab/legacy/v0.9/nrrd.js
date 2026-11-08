/** Single-file scalar 3D NRRD reader. No network requests or patient-data uploads. */
export async function readNrrdFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Pilih file .nrrd.');
  if (file.size > 700 * 1024 * 1024) throw new Error('File melebihi batas 700 MiB untuk browser 8 GB.');
  const source = new Uint8Array(await file.arrayBuffer());
  let split = -1;
  for (let i = 1; i < Math.min(source.length, 1048576); i++) {
    if (source[i] === 10 && source[i-1] === 10) { split = i+1; break; }
    if (i >= 3 && source[i] === 10 && source[i-1] === 13 && source[i-2] === 10 && source[i-3] === 13) { split = i+1; break; }
  }
  if (split < 0) throw new Error('Header NRRD tidak memiliki pemisah baris kosong.');
  const header = new TextDecoder().decode(source.subarray(0, split));
  if (!/^NRRD\d+\r?\n/.test(header)) throw new Error('File bukan NRRD yang valid.');
  const fields = {};
  for (const line of header.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || /^NRRD\d+/.test(line)) continue;
    const idx = line.indexOf(':');
    if (idx > 0 && line[idx+1] !== '=') fields[line.slice(0,idx).trim().toLowerCase()] = line.slice(idx+1).trim();
  }
  if (fields['data file']) throw new Error('NRRD terpisah (.nhdr) belum didukung; simpan sebagai single-file .nrrd.');
  if (Number(fields.dimension) !== 3) throw new Error('Hanya NRRD scalar 3D yang didukung.');
  const unitNames=fields['space units']?[...fields['space units'].matchAll(/"([^"]+)"/g)].map(m=>m[1].toLowerCase()):['mm','mm','mm'];
  const scales=unitNames.map(u=>({mm:1,millimeter:1,millimeters:1,cm:10,m:1000}[u]));
  if(scales.length!==3||scales.some(x=>!x))throw new Error('Satuan ruang NRRD tidak didukung; ekspor dalam mm.');
  if(fields['space origin'])fields['space origin']='('+fields['space origin'].replace(/[()]/g,'').split(',').map((x,i)=>Number(x)*scales[i]).join(',')+')';
  const sizes = (fields.sizes || '').trim().split(/\s+/).map(Number);
  if (sizes.length !== 3 || sizes.some(x => !Number.isSafeInteger(x) || x < 2)) throw new Error('Dimensi NRRD tidak valid.');
  const n = sizes.reduce((a,b) => a*b, 1);
  if (!Number.isSafeInteger(n) || n > 160e6) throw new Error('Jumlah voxel terlalu besar untuk demo browser 8 GB.');
  const dtype = (fields.type || '').toLowerCase().replace(/\s+/g,' ').trim();
  const types = {
    'signed char':['getInt8',1],char:['getInt8',1],int8:['getInt8',1],int8_t:['getInt8',1],
    'unsigned char':['getUint8',1],uchar:['getUint8',1],uint8:['getUint8',1],uint8_t:['getUint8',1],
    short:['getInt16',2],'short int':['getInt16',2],'signed short':['getInt16',2],int16:['getInt16',2],int16_t:['getInt16',2],
    ushort:['getUint16',2],'unsigned short':['getUint16',2],uint16:['getUint16',2],uint16_t:['getUint16',2],
    int:['getInt32',4],int32:['getInt32',4],int32_t:['getInt32',4],
    uint:['getUint32',4],uint32:['getUint32',4],uint32_t:['getUint32',4],
    float:['getFloat32',4],float32:['getFloat32',4],double:['getFloat64',8],float64:['getFloat64',8]
  };
  const type = types[dtype];
  if (!type) throw new Error(`Tipe voxel '${dtype}' belum didukung.`);
  const encoding = (fields.encoding || 'raw').toLowerCase();
  let body = source.subarray(split);
  if (encoding === 'gzip' || encoding === 'gz') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Safari ini tidak mendukung gzip; simpan NRRD sebagai raw atau gunakan Safari terbaru.');
    try { body = new Uint8Array(await new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); }
    catch { throw new Error('Dekompresi gzip NRRD gagal; periksa integritas file.'); }
  } else if (encoding !== 'raw') throw new Error(`Encoding '${encoding}' belum didukung; gunakan raw atau gzip.`);
  const needed = n * type[1];
  if (body.byteLength < needed) throw new Error(`Data NRRD terpotong: perlu ${needed} byte, ada ${body.byteLength}.`);
  if (body.byteLength > needed) throw new Error('Ukuran payload NRRD melebihi dimensi yang tercantum.');
  const view = new DataView(body.buffer, body.byteOffset, needed);
  const little = (fields.endian || 'little').toLowerCase() !== 'big';
  const read = view[type[0]].bind(view);
  let spacing = [1,1,1], axisVectors = null;
  const directions = fields['space directions'];
  if (directions) {
    const vectors = [...directions.matchAll(/\(([^)]*)\)/g)].map(m => m[1].split(',').map((x,i)=>Number(x)*scales[i]));
    if (vectors.length !== 3 || vectors.some(v => v.length !== 3 || v.some(x => !Number.isFinite(x)))) throw new Error('space directions NRRD tidak valid.');
    spacing = vectors.map(v => Math.hypot(...v));
    if (spacing.some(x => x <= 0)) throw new Error('space directions memiliki panjang nol.');
    // The proxy uses an orthogonal IJK frame; explicitly reject sheared grids.
    for (let a=0; a<3; a++) for (let b=a+1; b<3; b++) {
      const cosine = vectors[a].reduce((s,x,i) => s+x*vectors[b][i],0) / (spacing[a]*spacing[b]);
      if (Math.abs(cosine) > .02) throw new Error('NRRD dengan sumbu miring tidak ortogonal belum didukung oleh proksi ini.');
    }
    axisVectors = vectors;
  } else if (fields.spacings) {
    spacing = fields.spacings.trim().split(/\s+/).map((x,i)=>Number(x)*scales[i]);
  }
  if (spacing.length !== 3 || spacing.some(x => !Number.isFinite(x) || x <= 0)) throw new Error('Voxel spacing NRRD tidak valid.');
  const [nx,ny,nz] = sizes, stride = type[1];
  const at = (i,j,k) => read(((k*ny+j)*nx+i)*stride, little);
  const voxel = (i,j,k) => {
    if (![i,j,k].every(Number.isFinite) || i < 0 || j < 0 || k < 0 || i > nx-1 || j > ny-1 || k > nz-1) return -1024;
    const i0=Math.floor(i),j0=Math.floor(j),k0=Math.floor(k);
    const i1=Math.min(i0+1,nx-1),j1=Math.min(j0+1,ny-1),k1=Math.min(k0+1,nz-1);
    const x=i-i0,y=j-j0,z=k-k0;
    const lerp=(a,b,t)=>a+(b-a)*t;
    const lo=lerp(lerp(at(i0,j0,k0),at(i1,j0,k0),x),lerp(at(i0,j1,k0),at(i1,j1,k0),x),y);
    const hi=lerp(lerp(at(i0,j0,k1),at(i1,j0,k1),x),lerp(at(i0,j1,k1),at(i1,j1,k1),x),y);
    const value=lerp(lo,hi,z);
    return Number.isFinite(value) ? value : -1024;
  };
  return {name:file.name,sizes,spacing,axisVectors,fields,voxel,kind:'nrrd',sizeBytes:needed};
}
