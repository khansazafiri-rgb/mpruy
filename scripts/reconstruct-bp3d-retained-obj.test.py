import hashlib
import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('reconstruct',Path(__file__).with_name('reconstruct-bp3d-retained-obj.py'))
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
class Tests(unittest.TestCase):
    def test_exact_old_bytes_recovered(self):
        old=r.drift.OLD_LICENSE+b'# English name : left nerve\nv 1 0 0\nf 1 2 3\n'
        new=old.replace(r.drift.OLD_LICENSE,r.drift.NEW_LICENSE)
        row={'oldRawSHA256':hashlib.sha256(old).hexdigest(),'newRawSHA256':hashlib.sha256(new).hexdigest()}
        self.assertEqual(r.restore_exact_member(new,row),old)
        for bad in [new+b' ',new.replace(b'left',b'right')]:
            with self.assertRaises(ValueError):r.restore_exact_member(bad,row)
        with self.assertRaises(ValueError):r.restore_exact_member(new,{**row,'oldRawSHA256':'f'*64})
    def test_duplicate_notice_rejected_even_with_matching_new_pin(self):
        new=r.drift.NEW_LICENSE*2
        row={'oldRawSHA256':'a'*64,'newRawSHA256':hashlib.sha256(new).hexdigest()}
        with self.assertRaises(ValueError):r.restore_exact_member(new,row)
if __name__=='__main__':unittest.main()
