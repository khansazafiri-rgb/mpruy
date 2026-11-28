"""Decode only pinned publisher segmentation labels; Python standard library only."""
import array
import hashlib
import json
import re
import stat
import struct
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path, PurePosixPath

REPO = Path(__file__).resolve().parents[2]
EVIDENCE = REPO / 'licensing/atlas-publication/checkpoint-evidence'
SHEET_SHA = '964804656a7b4320bf103c96cadd115da05eb187d1ab0f638ca1b81bf73afac8'
RAW_SHA = 'eb9751c32b37ac71c4409a31c11a32f7bc246219e587cce90ea0942bb61208b4'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_members(archive, cap, max_total):
    entries = archive.infolist()
    if len(entries) > cap:
        raise ValueError('archive member limit')
    seen, total = set(), 0
    for info in entries:
        p = PurePosixPath(info.filename)
        if (not info.filename or '\\' in info.filename or ':' in info.filename
                or p.is_absolute() or '..' in p.parts
                or info.filename.casefold() in seen
                or stat.S_ISLNK(info.external_attr >> 16) or info.flag_bits & 1):
            raise ValueError('unsafe archive member')
        seen.add(info.filename.casefold())
        total += info.file_size
        if total > max_total:
            raise ValueError('uncompressed archive byte limit')
    return entries


def parse_workbook(path):
    if path.stat().st_size > 1024**2 or digest(path.read_bytes()) != SHEET_SHA:
        raise ValueError('workbook pin mismatch')
    with zipfile.ZipFile(path) as z:
        safe_members(z, 200, 16 * 1024**2)
        strings = [''.join(si.itertext()) for si in
                   ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', NS)]
        rows = []
        for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//s:row', NS):
            names, ids = [], []
            for cell in row.findall('s:c', NS):
                if cell.find('s:f', NS) is not None:
                    raise ValueError('workbook formula rejected')
                value = cell.findtext('s:v', None, NS)
                if value is None:
                    continue
                if cell.get('t') == 's':
                    names.append(strings[int(value)].strip())
                else:
                    if not re.fullmatch('[0-9]+', value) or not 0 < int(value) < 65536:
                        raise ValueError('label number rejected')
                    ids.append(int(value))
            if len(names) != 1 or not ids or len(ids) != len(set(ids)):
                raise ValueError('malformed publisher object row')
            rows.append({'row': int(row.get('r')), 'name': names[0], 'labels': ids})
    retained = json.loads((Path(__file__).parent / 'workbook-rows.json').read_text())['rows']
    if rows != retained or len(rows) != 202:
        raise ValueError('publisher rows differ from retained source evidence')
    all_labels = [label for row in rows for label in row['labels']]
    if len(set(all_labels)) != len(all_labels) or len(all_labels) != 336:
        raise ValueError('publisher label shared between named rows')
    return rows


def decode_tiff(data):
    if len(data) > 8 * 1024**2 or data[:2] not in (b'MM', b'II'):
        raise ValueError('unexpected TIFF')
    endian = '>' if data[:2] == b'MM' else '<'
    if struct.unpack_from(endian + 'H', data, 2)[0] != 42:
        raise ValueError('TIFF version')
    offset = struct.unpack_from(endian + 'I', data, 4)[0]
    count = struct.unpack_from(endian + 'H', data, offset)[0]
    if count > 100 or offset + 2 + 12 * count + 4 > len(data):
        raise ValueError('TIFF directory limit')
    if struct.unpack_from(endian + 'I', data, offset + 2 + 12 * count)[0]:
        raise ValueError('multi-image TIFF rejected')
    tags = {}
    for j in range(count):
        pos = offset + 2 + 12 * j
        tag, kind, n, value = struct.unpack_from(endian + 'HHII', data, pos)
        if tag in tags:
            raise ValueError('duplicate TIFF tag')
        if n == 1:
            if kind == 3:
                value = struct.unpack_from(endian + 'H', data, pos + 8)[0]
            tags[tag] = value
    if not (tags.get(256) == 573 and tags.get(257) == 330
            and tags.get(258) == 16 and tags.get(259, 1) == 1
            and tags.get(277) == 1 and tags.get(278) == 330
            and tags.get(279) == 573 * 330 * 2):
        raise ValueError('unexpected TIFF layout')
    pos, size = tags[273], tags[279]
    if pos + size > len(data):
        raise ValueError('TIFF payload overflow')
    values = array.array('H')
    values.frombytes(data[pos:pos + size])
    if values.itemsize != 2:
        raise ValueError('uint16 unavailable')
    if (endian == '>') == (sys.byteorder == 'little'):
        values.byteswap()
    if sys.byteorder != 'little':
        values.byteswap()
    return values.tobytes()


def prepare(out, workbook, labels_dir=None, archive=None, archive_verified=False):
    rows = parse_workbook(workbook)
    names = json.loads((REPO / 'licensing/atlas-publication/sio-visible-human-source-candidate.json').read_text())['prioritySourceLabels']
    plans = []
    for index, name in enumerate(names):
        matches = [r for r in rows if r['name'].casefold() == name.casefold()]
        if len(matches) != 1:
            raise ValueError('source object name not unique')
        row = matches[0]
        plans.append({'index': index, 'name': name, 'row': row['row'], 'labels': row['labels'],
                      'kind': 'SINGLE_SOURCE_LABEL' if len(row['labels']) == 1 else 'EXPLICIT_PUBLISHER_LABEL_UNION'})
    if len(plans) != 33 or sum(len(p['labels']) == 1 for p in plans) != 21:
        raise ValueError('priority conversion plan changed')
    (out / 'source').mkdir(mode=0o700, exist_ok=True)
    (out / 'conversion-plan.json').write_text(json.dumps({'sourceLabelSHA256': SHEET_SHA, 'rows': plans}, indent=2) + '\n')
    (out / 'conversion-plan.txt').write_text('\n'.join(str(r['index']) + ' ' + str(len(r['labels'])) + ' ' + ' '.join(map(str, r['labels'])) for r in plans) + '\n')
    retained = json.loads((EVIDENCE / 'voxelman-label-tiff-receipt-20261127.json').read_text())
    expected = {r['slice']: r for r in retained['slices']}
    z, slices = None, {}
    if archive:
        z = zipfile.ZipFile(archive)
        for info in safe_members(z, 10000, 2 * 1024**3):
            match = re.fullmatch(r'labels([0-9]{4})\.tif', PurePosixPath(info.filename).name, re.I)
            if not match:
                continue
            n = int(match[1])
            if n not in expected or n in slices or info.is_dir():
                raise ValueError('unexpected or duplicate label slice')
            slices[n] = info
        if set(slices) != set(expected):
            raise ValueError('missing label slice')
    h, records = hashlib.sha256(), []
    try:
        with (out / 'source/labels-774x330x573-u16le.raw').open('wb') as raw:
            for n in range(1256, 2030):
                data = z.read(slices[n]) if z else (labels_dir / f'labels{n}.tif').read_bytes()
                row = {'slice': n, 'bytes': len(data), 'sha256': digest(data)}
                if row != expected[n]:
                    raise ValueError('label TIFF differs from retained source')
                decoded = decode_tiff(data)
                raw.write(decoded)
                h.update(decoded)
                records.append(row)
    finally:
        if z:
            z.close()
    if h.hexdigest() != RAW_SHA:
        raise ValueError('decoded label volume differs')
    source = {'schema': 1, 'shape': [774, 330, 573], 'canonicalU16LESHA256': h.hexdigest(),
              'canonicalBytes': (out / 'source/labels-774x330x573-u16le.raw').stat().st_size,
              'labelFileSHA256': SHEET_SHA, 'slices': records, 'readsCTorRGB': False,
              'sourceZipSHA256ReverifiedThisRun': archive_verified,
              'sourceExtraction': 'Pinned ZIP; read only label TIFF entries' if archive_verified else 'Retained local label TIFFs; original ZIP hash not reverified',
              'publicRelease': 'NO_GO'}
    (out / 'source/local-label-volume.json').write_text(json.dumps(source, indent=2) + '\n')
    return source
