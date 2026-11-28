#!/usr/bin/env python3
"""Reconstruct exact retained OBJ members from one verified publisher revision.

The original ZIP container is NOT reconstructed. No archive receipt or clinical,
registration or release approval is created. Default mode writes metadata only.
Explicit OBJ output is private, exclusive, and must never be served directly.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import tempfile
import zipfile

spec = importlib.util.spec_from_file_location('archive_drift',Path(__file__).with_name('audit-bp3d-archive-drift.py'))
drift = importlib.util.module_from_spec(spec)
spec.loader.exec_module(drift)
PROOF_SHA = '2939dc23c514802c79c302f78cad4324abf9d3e2451dfee00c87ca4d89c947d2'
PROOF = Path(__file__).resolve().parents[1] / 'licensing/atlas-publication/checkpoint-evidence/bp3d40-isa-license-comment-member-proof-20261127.json'

def restore_exact_member(raw, row):
    if hashlib.sha256(raw).hexdigest() != row['newRawSHA256']:
        raise ValueError('Current raw OBJ pin mismatch')
    if raw.count(drift.NEW_LICENSE) != 1 or drift.OLD_LICENSE in raw:
        raise ValueError('Unexpected current license comments')
    restored = raw.replace(drift.NEW_LICENSE,drift.OLD_LICENSE,1)
    if hashlib.sha256(restored).hexdigest() != row['oldRawSHA256']:
        raise ValueError('Retained raw OBJ pin mismatch')
    return restored

def reconstruct(archive, output=None):
    proof_bytes = PROOF.read_bytes()
    if hashlib.sha256(proof_bytes).hexdigest() != PROOF_SHA:
        raise ValueError('Member proof identity mismatch')
    p = json.loads(proof_bytes)
    receipt, members, other = drift.inventory(archive,drift.NEW_ISA_SHA256)
    rows = {r['fj']:r for r in p['rows']}
    if (receipt['bytes'] != 142717267 or len(rows) != 2234
        or rows.keys() != members.keys() or other):
        raise ValueError('Publisher member set differs')
    temp = None
    destination = Path(output).absolute() if output else None
    report_rows = []
    try:
        if destination:
            if destination.exists() or destination.is_symlink() or not destination.parent.is_dir():
                raise ValueError('OBJ destination must be new with existing private parent')
            temp = Path(tempfile.mkdtemp(prefix='.retained-obj-',dir=destination.parent))
            os.chmod(temp,0o700)
        with zipfile.ZipFile(archive) as z:
            for ident in sorted(rows):
                name = members[ident]['member']
                if name != 'isa_BP3D_4.0_obj_99/'+ident+'.obj':
                    raise ValueError('Unexpected publisher member path')
                restored = restore_exact_member(z.read(name),rows[ident])
                if temp:
                    with (temp/(ident+'.obj')).open('xb') as f:
                        os.chmod(f.name,0o600)
                        f.write(restored)
                report_rows.append({'id':ident,'newRawSHA256':rows[ident]['newRawSHA256'],'retainedRawSHA256':rows[ident]['oldRawSHA256'],'bytes':len(restored)})
        with Path(archive).open('rb') as stream:
            if drift.digest(stream) != receipt:
                raise ValueError('Publisher archive changed during reconstruction')
        if temp:
            # Refuse overwrite even when another process creates the destination.
            os.mkdir(destination,0o700)
            for item in temp.iterdir():
                os.link(item,destination/item.name)
            shutil.rmtree(temp)
            temp = None
        return {'schema':1,'status':'EXACT_RETAINED_RAW_OBJ_BYTES_RECONSTRUCTED','currentArchive':receipt,
                'memberProofSHA256':PROOF_SHA,'passed':len(report_rows),'failed':0,
                'originalArchiveReconstructed':False,'originalArchiveAcquisitionClaimed':False,
                'retainedArchiveHistoricalSHA256':drift.OLD_ISA_SHA256,
                'privateOBJFilesWritten':len(report_rows) if destination else 0,
                'clinicalValidation':False,'registrationValidated':False,'approvedForDistribution':False,
                'rows':report_rows}
    finally:
        if temp:
            shutil.rmtree(temp)

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('archive',type=Path)
    p.add_argument('--output-private-obj-directory',type=Path)
    args = p.parse_args()
    print(json.dumps(reconstruct(args.archive,args.output_private_obj_directory),indent=2))
