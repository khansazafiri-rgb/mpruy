"""Real SQLite recovery and failure regression. No live database access."""
import gzip
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('backup', Path(__file__).resolve().parents[1] / 'deploy/backup.py')
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


class BackupRehearsal(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name).resolve()
        self.source = self.root / 'pb'
        self.source.mkdir()
        self.dest = self.root / 'backups'
        for name in ['data.db', 'auxiliary.db']:
            with sqlite3.connect(self.source / name) as db:
                db.execute('create table fixture (id integer, value text)')
                db.execute("insert into fixture values (1, 'restore me')")
        (self.source / 'storage').mkdir()
        (self.source / 'storage/item.txt').write_text('private engineering fixture')

    def tearDown(self):
        self.tmp.cleanup()

    def test_restore_both_databases_and_storage_with_hashes(self):
        before = {p.name: p.read_bytes() for p in self.source.glob('*.db')}
        final, report = backup.create_backup(self.source, self.dest, '')
        self.assertTrue(report['databaseRestoreVerified'] and report['storageArchiveVerified'])
        self.assertEqual(report['storageFiles'], 1)
        self.assertEqual(set(report['files']), {'data.db.gz', 'auxiliary.db.gz', 'storage.tar.gz'})
        for name in before:
            restored = self.root / ('restored-' + name)
            restored.write_bytes(gzip.decompress((final / (name + '.gz')).read_bytes()))
            with sqlite3.connect(restored) as db:
                self.assertEqual(db.execute('select * from fixture').fetchall(), [(1, 'restore me')])
            self.assertEqual((self.source / name).read_bytes(), before[name])
        self.assertEqual(json.loads((final / 'manifest.json').read_text()), report)
        self.assertEqual(final.stat().st_mode & 0o777, 0o700)
        self.assertTrue(all(p.stat().st_mode & 0o077 == 0 for p in final.iterdir()))

    def test_corrupt_auxiliary_preserves_previous_backup(self):
        old, _ = backup.create_backup(self.source, self.dest, '')
        os.utime(old, (1, 1))
        (self.source / 'auxiliary.db').write_bytes(b'corrupt')
        with self.assertRaises(sqlite3.DatabaseError):
            backup.create_backup(self.source, self.dest, '')
        self.assertTrue(old.exists())
        self.assertEqual(list(self.dest.glob('.pending-*')), [])
        self.assertEqual(list(self.dest.glob('backup-*')), [old])

    def test_failed_upload_retains_local_and_old_backup(self):
        old, _ = backup.create_backup(self.source, self.dest, '')
        os.utime(old, (1, 1))
        with patch.object(backup.shutil, 'which', return_value='/fake/rclone'), patch.object(backup.subprocess, 'check_output', return_value='gdrive:\n'), patch.object(backup.subprocess, 'run', side_effect=RuntimeError('upload failed')):
            with self.assertRaisesRegex(RuntimeError, 'upload failed'):
                backup.create_backup(self.source, self.dest, 'gdrive:backups')
        self.assertTrue(old.exists())
        self.assertEqual(len(list(self.dest.glob('backup-*'))), 2)

    def test_retention_follows_success_and_ignores_legacy_files(self):
        old, _ = backup.create_backup(self.source, self.dest, '')
        os.utime(old, (1, 1))
        legacy = self.dest / 'data-legacy.db.gz'
        legacy.write_bytes(b'keep')
        backup.create_backup(self.source, self.dest, '')
        self.assertFalse(old.exists())
        self.assertTrue(legacy.exists())


if __name__ == '__main__':
    unittest.main()
