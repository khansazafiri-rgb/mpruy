"""Reproduce private source conversions; no CT/RGB reads, uploads or release approval."""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path
from urllib.parse import quote, urlparse

from prepare_source import EVIDENCE, REPO, prepare

HERE = Path(__file__).resolve().parent
BASE = 'https://zenodo.org/records/'


def fetch(record, name, target, expected, limit):
    url = BASE + record + '/files/' + quote(name, safe='') + '?download=1'

    class Redirects(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            parsed = urlparse(newurl)
            if parsed.scheme != 'https' or parsed.hostname not in {'zenodo.org', 'www.zenodo.org'}:
                raise ValueError('publisher download redirected outside HTTPS allowlist')
            return super().redirect_request(req, fp, code, msg, headers, newurl)

    opener = urllib.request.build_opener(Redirects())
    h, md5, size = hashlib.sha256(), hashlib.md5(), 0
    with opener.open(urllib.request.Request(url, headers={'User-Agent': 'MEDCOEL-source-reproducibility/1.0'}), timeout=360) as response, target.open('wb') as out:
        while chunk := response.read(1024**2):
            size += len(chunk)
            if size > limit:
                raise ValueError('publisher source exceeds byte budget')
            out.write(chunk)
            h.update(chunk)
            md5.update(chunk)
    actual = {'bytes': size, 'sha256': h.hexdigest(), 'md5': md5.hexdigest()}
    if any(actual.get(k) != v for k, v in expected.items()):
        target.unlink(missing_ok=True)
        raise ValueError('publisher source checksum/size differs')
    target.chmod(0o600)
    return actual


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--local-label-dir', type=Path)
    parser.add_argument('--local-workbook', type=Path)
    parser.add_argument('--local-openear-dir', type=Path)
    args = parser.parse_args()
    if sys.byteorder != 'little':
        raise ValueError('native converter requires little endian float32/uint16')
    if bool(args.local_label_dir) != bool(args.local_workbook):
        raise ValueError('local labels and workbook must be supplied together')
    out = args.out.resolve()
    if out.exists():
        raise ValueError('Use a new output directory; retain previous evidence')
    out.mkdir(mode=0o700, parents=True)
    voxel = out / 'voxelman'
    voxel.mkdir(mode=0o700)
    source_receipt = json.loads((EVIDENCE / 'sio-label-volume-audit-20261127.json').read_text())
    if args.local_label_dir:
        prepare(voxel, args.local_workbook, labels_dir=args.local_label_dir, archive_verified=False)
    else:
        sheet, archive = out / 'labels.xlsx', out / 'sio.zip'
        fetch('15882019', 'SIO Object Labels.xlsx', sheet, source_receipt['sourceLabelFile'], 1024**2)
        fetch('15882019', 'VOXEL-MAN_segmented-internal-organs.zip', archive, source_receipt['sourceArchive'], 512 * 1024**2)
        prepare(voxel, sheet, archive=archive, archive_verified=True)
    compiler = shutil.which('c++')
    if not compiler:
        raise ValueError('C++17 compiler is required')
    subprocess.run([compiler, '-std=c++17', '-O3', str(HERE / 'mesh_source.cpp'), '-o', str(voxel / 'mesh_source')], check=True)
    (voxel / 'meshes').mkdir(mode=0o700)
    subprocess.run([str(voxel / 'mesh_source'), str(voxel / 'source/labels-774x330x573-u16le.raw'), str(voxel / 'conversion-plan.txt'), str(voxel / 'meshes')], check=True)
    subprocess.run([sys.executable, str(HERE / 'selftest_converter.py'), str(voxel)], check=True)
    subprocess.run([sys.executable, str(HERE / 'wrap_and_verify_glb.py'), str(voxel)], check=True)
    actual = json.loads((voxel / 'manifest.json').read_text())
    retained = json.loads((EVIDENCE / 'voxelman-source-33-conversion-20261127.json').read_text())
    keys = ('id', 'name', 'labels', 'row', 'sha256', 'bytes', 'triangles', 'vertices', 'voxelCount', 'bounds', 'touchesSourceVolumeBoundary')
    if [{k: r[k] for k in keys} for r in actual['rows']] != [{k: r[k] for k in keys} for r in retained['rows']]:
        raise ValueError('VOXEL-MAN geometry differs from retained final output')
    ears = out / 'openear'
    ears.mkdir(mode=0o700)
    retained_ears = json.loads((EVIDENCE / 'openear-source-3-conversion-20261127.json').read_text())
    source = args.local_openear_dir
    if not source:
        source = out / 'openear-ply'
        source.mkdir(mode=0o700)
        for row in retained_ears['rows']:
            fetch('4362584', row['sourceFile'], source / row['sourceFile'],
                  {'bytes': row['sourceBytes'], 'sha256': row['sourceSHA256'], 'md5': row['publisherMD5']}, 2 * 1024**2)
    subprocess.run([sys.executable, str(HERE / 'convert_openear.py'), str(ears), str(source)], check=True)
    generated = json.loads((ears / 'openear-acquisition-geometry-report-20261127.json').read_text())
    if len(generated['rows']) != len(retained_ears['rows']):
        raise ValueError('OpenEar output count differs')
    for got, expected in zip(generated['rows'], retained_ears['rows']):
        for key in ('sourceSHA256', 'outputSHA256', 'outputBytes', 'vertexCount', 'triangleCount', 'bounds', 'boundaryEdges', 'nonManifoldEdges', 'degenerateTriangles', 'laterality'):
            if got[key] != expected[key]:
                raise ValueError('OpenEar conversion differs from retained geometry')
    report = {'schema': 1, 'voxelmanRoundtripPass': 33, 'openearConversionPass': 3,
              'sourceArchiveHashReverifiedThisRun': not bool(args.local_label_dir),
              'engineeringCalibrationPass': 33, 'actualBrowserRendering': 'PENDING',
              'clinicalValidation': False, 'registrationValidated': False,
              'wholeStructuresRestoredClaim': 0, 'approvedForDistribution': False,
              'publicRelease': 'NO_GO'}
    (out / 'conversion-reproduction.json').write_text(json.dumps(report, indent=2) + '\n')
    print('ACTUAL SOURCE CONVERSION REPLAY ' + json.dumps(report, separators=(',', ':')))


if __name__ == '__main__':
    main()
