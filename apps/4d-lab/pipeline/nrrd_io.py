"""Minimal, dependency-light single-file NRRD reader/writer (scalar 3D, raw/gzip, LPS/RAS)."""
from pathlib import Path
import gzip, re
import numpy as np

_TYPES = {'short': 'i2', 'int16': 'i2', 'signed short': 'i2', 'unsigned short': 'u2', 'ushort': 'u2', 'uint16': 'u2',
          'float': 'f4', 'double': 'f8', 'uchar': 'u1', 'unsigned char': 'u1', 'uint8': 'u1', 'int': 'i4', 'int32': 'i4',
          'signed char': 'i1', 'int8': 'i1'}
_NAMES = {np.dtype('int16'): 'short', np.dtype('uint8'): 'unsigned char', np.dtype('float32'): 'float',
          np.dtype('uint16'): 'unsigned short', np.dtype('int32'): 'int'}


def write_nrrd(path, data, affine, comment=None, compress=True):
    """data is indexed [k, j, i]; affine maps (i, j, k, 1) -> LPS mm."""
    data = np.ascontiguousarray(data)
    t = _NAMES[data.dtype]
    dirs = affine[:3, :3]
    lines = ['NRRD0005']
    if comment:
        lines.append('# ' + comment)
    lines += [f'type: {t}', 'dimension: 3', 'space: left-posterior-superior',
              'sizes: ' + ' '.join(str(n) for n in data.shape[::-1]),
              'space directions: ' + ' '.join('(' + ','.join(f'{v:.6g}' for v in dirs[:, c]) + ')' for c in range(3)),
              'kinds: domain domain domain', 'endian: little', 'encoding: ' + ('gzip' if compress else 'raw'),
              'space origin: (' + ','.join(f'{v:.6g}' for v in affine[:3, 3]) + ')']
    payload = data.astype(data.dtype.newbyteorder('<')).tobytes()
    if compress:
        payload = gzip.compress(payload, compresslevel=9, mtime=0)
    Path(path).write_bytes(('\n'.join(lines) + '\n\n').encode('ascii') + payload)


def read_nrrd(path):
    with open(path, 'rb') as f:
        header = []
        while True:
            line = f.readline()
            if line in (b'\n', b'\r\n', b''):
                break
            header.append(line.decode('ascii').rstrip('\r\n'))
        fields = {s.split(':', 1)[0].strip().lower(): s.split(':', 1)[1].strip() for s in header if ':' in s and not s.startswith('#')}
        if 'data file' in fields:
            raise ValueError('Use single-file NRRD (.nrrd), not detached .nhdr')
        sizes = list(map(int, fields['sizes'].split()))
        dtype = np.dtype(_TYPES[fields['type']]).newbyteorder('<' if fields.get('endian', 'little') == 'little' else '>')
        raw = gzip.GzipFile(fileobj=f).read() if fields.get('encoding') in ('gzip', 'gz') else f.read()
    data = np.frombuffer(raw, dtype=dtype).reshape(sizes[::-1])
    dirs = np.array([[float(x) for x in v.split(',')] for v in re.findall(r'\(([^)]+)\)', fields['space directions'])]).T
    origin = np.array([float(x) for x in fields['space origin'].strip('()').split(',')])
    units = re.findall(r'"([^"]+)"', fields.get('space units', '"mm" "mm" "mm"'))
    factors = {'mm': 1, 'millimeter': 1, 'millimeters': 1, 'cm': 10, 'm': 1000}
    if len(units) != 3 or any(u not in factors for u in units):
        raise ValueError('Export NRRD in mm/cm/m spatial units')
    scale = np.array([factors[u] for u in units])
    dirs = dirs * scale[:, None]; origin = origin * scale
    space = fields.get('space', '').lower()
    if space not in ('left-posterior-superior', 'right-anterior-superior'):
        raise ValueError('Explicit LPS or RAS space is required')
    affine = np.eye(4); affine[:3, :3] = dirs; affine[:3, 3] = origin
    if space == 'right-anterior-superior':
        affine = np.diag([-1, -1, 1, 1]) @ affine
    return data, affine
