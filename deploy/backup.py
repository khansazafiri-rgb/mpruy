#!/usr/bin/env python3
"""Verified SQLite backup and restore rehearsal, with atomic publication.
PB_DATA/BACKUP_DIR/REMOTE retain their existing environment interface.
Database and storage are separate snapshots, not an application-wide transaction.
"""
import datetime
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import tarfile
import tempfile


def check_database(file):
    with sqlite3.connect(file.resolve().as_uri() + '?mode=ro', uri=True) as db:
        if db.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
            raise RuntimeError('SQLite integrity check failed: ' + file.name)
        return db.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()[0]


def digest(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest() if hasattr(hashlib, 'file_digest') else stream_digest(stream)


def stream_digest(stream):
    h = hashlib.sha256()
    for block in iter(lambda: stream.read(1024 * 1024), b''):
        h.update(block)
    return h.hexdigest()


def create_backup(source, destination, remote='gdrive:medcoel-backups'):
    os.umask(0o077)
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if not (source / 'data.db').is_file():
        raise RuntimeError('PocketBase data.db not found')
    if destination == source or source in destination.parents or destination in source.parents:
        raise RuntimeError('Backup and source directories must be separate')
    destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    staging = Path(tempfile.mkdtemp(prefix='.pending-backup-', dir=destination))
    final = destination / ('backup-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    report = {'schema': 1, 'databaseRestoreVerified': False, 'storageArchiveVerified': False, 'files': {}}
    try:
        for name in ['data.db', 'auxiliary.db']:
            original = source / name
            if name != 'data.db' and not original.exists():
                continue
            if original.is_symlink() or not original.is_file():
                raise RuntimeError('Unsafe source database: ' + name)
            local = staging / name
            with sqlite3.connect(original.as_uri() + '?mode=ro', uri=True) as src:
                with sqlite3.connect(local) as dst:
                    src.backup(dst)
            tables = check_database(local)
            zipped = staging / (name + '.gz')
            with local.open('rb') as src, gzip.open(zipped, 'wb') as dst:
                shutil.copyfileobj(src, dst)
            local.unlink()
            restored = staging / ('restore-' + name)
            with gzip.open(zipped, 'rb') as src, restored.open('xb') as dst:
                shutil.copyfileobj(src, dst)
            if check_database(restored) != tables:
                raise RuntimeError('Restored database table count differs')
            restored.unlink()
        report['databaseRestoreVerified'] = True
        storage = source / 'storage'
        if storage.exists():
            if storage.is_symlink() or not storage.is_dir() or any(p.is_symlink() for p in storage.rglob('*')):
                raise RuntimeError('Unsafe storage directory')
            expected = {str(p.relative_to(source)): digest(p) for p in storage.rglob('*') if p.is_file()}
            archive = staging / 'storage.tar.gz'
            with tarfile.open(archive, 'w:gz') as tar:
                tar.add(storage, arcname='storage')
            with tarfile.open(archive, 'r:gz') as tar:
                actual = {m.name: stream_digest(tar.extractfile(m)) for m in tar if m.isfile()}
            if actual != expected:
                raise RuntimeError('Storage changed during backup')
            report['storageArchiveVerified'] = True
            report['storageFiles'] = len(expected)
        for file in staging.iterdir():
            os.chmod(file, 0o600)
            report['files'][file.name] = {'bytes': file.stat().st_size, 'sha256': digest(file)}
            with file.open('rb') as stream:
                os.fsync(stream.fileno())
        with (staging / 'manifest.json').open('x') as stream:
            stream.write(json.dumps(report, indent=2) + '\n')
            stream.flush()
            os.fsync(stream.fileno())
        staging.rename(final)
        if remote:
            rclone = shutil.which('rclone')
            if rclone is None:
                print('rclone unavailable; verified backup saved locally', flush=True)
            else:
                remotes = subprocess.check_output([rclone, 'listremotes'], text=True).splitlines()
                if remote.split(':', 1)[0] + ':' not in remotes:
                    raise RuntimeError('Configured remote unavailable; local backup retained')
                subprocess.run([rclone, 'copy', str(final), remote.rstrip('/') + '/' + final.name], check=True)
        cutoff = datetime.datetime.now().timestamp() - 3 * 86400
        for old in destination.glob('backup-*'):
            if old != final and old.is_dir() and not old.is_symlink() and (old / 'manifest.json').is_file() and old.stat().st_mtime < cutoff:
                shutil.rmtree(old)
        return final, report
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise


if __name__ == '__main__':
    final, report = create_backup(os.environ.get('PB_DATA', '/opt/medcoel/pb_data'), os.environ.get('BACKUP_DIR', '/opt/medcoel/backups'), os.environ.get('REMOTE', 'gdrive:medcoel-backups'))
    print('Verified backup complete: ' + str(final))
