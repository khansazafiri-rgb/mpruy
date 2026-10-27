"""Offline JSON authoring from private selection manifests and registered media inventory.

No downloads, media uploads, API writes, or publication. Existing source snapshots are preserved.
"""
from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path

import bloodmnist
import import_medmnist as pneumonia
import visual_mnist
from authoring_gallery import gallery_items
from identification_guides import learning_guide
from medmnist_core import validate_groups
from pathmnist import CONFIG as PATH
from stage_authoring_media import DATASETS, media_key, source_key, source_definition

ROOT = Path(__file__).resolve().parents[2]
TAXONOMY = json.loads((ROOT / 'shared' / 'lab-taxonomy.json').read_text(encoding='utf-8'))
MODULES = {item['dataset']: item for item in TAXONOMY['modules']}
SUPPORTED = ('pneumoniamnist', 'bloodmnist', 'pathmnist')


def selection_from_manifest(value: dict, dataset: str) -> dict:
    spec, config, _ = DATASETS[dataset]
    if (value.get('dataset') != dataset or value.get('source_md5') != spec.md5 or
            value.get('schema_version') != 2 or
            value.get('resolution') != spec.resolution or value.get('split') != spec.split or
            (spec.version and value.get('dataset_version') != spec.version) or
            value.get('selection_config') != config.metadata() or value.get('overlap') != 0):
        raise ValueError('Manifest dataset/checksum/selection tidak sesuai.')
    groups = {}
    for role in ('learning', 'practice'):
        section = value[role]
        groups[role] = []
        for item in section['files']:
            row = {'dataset': dataset, 'split': spec.split, 'index': item['source_sample_index'],
                   'label': item['label_id'], 'label_name': item['label_name'], 'role': role}
            if item['role'] != role or item['media_key'] != media_key(row):
                raise ValueError('Identitas/role media manifest tidak sesuai.')
            groups[role].append(row)
        if section['total'] != len(groups[role]):
            raise ValueError('Jumlah manifest tidak sesuai.')
    validate_groups(groups, config, spec)
    return groups


def teaching_records(dataset: str, topic: str):
    guide = learning_guide(dataset)
    refs = {item['id']: item for item in guide['sources']}
    def cited(statement):
        names = [f"{refs[key]['organization']} — {refs[key]['resource']}" for key in statement['sources']]
        return statement['text'] + ' [Sumber: ' + '; '.join(names) + ']'
    sources = []
    for item in guide['sources']:
        citation = f"{item['organization']}, {item['resource']}. Diakses {item['accessed']}."
        sources.append({'kind': 'source', 'data': {
            'key': dataset + '-guide-' + item['id'],
            'title': f"{item['organization']} — {item['resource']}", 'role': 'reference',
            'ingestionAllowed': False, 'datasetReviewRequired': False, 'url': item['url'],
            'citation': citation, 'license': {'name': 'Izin reproduksi belum diverifikasi; tautan referensi saja',
                'url': item['url'], 'citation': citation, 'verified': False, 'commercialUse': False,
                'redistribution': False, 'attributionRequired': True},
            'disclosure': 'Rujukan untuk panduan; tidak mengizinkan ingest gambar.'}})
    steps = [{'title': 'Orientasi', 'text': cited(guide['introduction'])}]
    steps += [{'title': f'Langkah {i}', 'text': cited(item)} for i, item in enumerate(guide['checklist'], 1)]
    steps += [{'title': f'Catatan {i}', 'text': cited(item)} for i, item in enumerate(guide['notes'], 1)]
    record = {'kind': 'guide', 'data': {'key': dataset + '-panduan', 'title': guide['title'],
        'subject': topic, 'scope': 'module', 'steps': steps, 'sources': [s['data']['key'] for s in sources]}}
    table = {'key': 'perbandingan', 'type': 'identification_table', 'title': guide['comparison']['title'],
        'columns': ['Kategori'] + guide['comparison']['columns'],
        'rows': [[row['label']] + [cited(cell) for cell in row['values']] for row in guide['comparison']['rows']]}
    return sources, record, table


def questions_for(dataset: str, groups: dict) -> list[dict]:
    rows = groups['practice']
    pairs = []
    if dataset == 'pneumoniamnist':
        pairs = [(row, pneumonia.question_body(row, '', '')['data']) for row in rows]
    elif dataset == 'bloodmnist':
        for group in bloodmnist.GROUPS:
            pairs += [(row, bloodmnist.question_body(row, group, i, '', '')['data'])
                      for i, row in enumerate(bloodmnist.practice_rows(rows, group))]
    elif dataset == 'pathmnist':
        for group in PATH.groupings:
            slots = visual_mnist.answer_slots(PATH, rows, group)
            pairs += [(row, visual_mnist.question_body(PATH, row, group, slots[row['index']], '', '')['data'])
                      for row in visual_mnist.practice_rows(PATH, rows, group)]
    return [{'key': f"{dataset}-q-{row['index']:05d}", **data, 'asset': media_key(row),
             'sources': [source_key(dataset)]} for row, data in pairs]


def authoring_bundle(dataset: str, groups: dict, media: dict, existing_sources: dict) -> dict:
    if dataset not in SUPPORTED:
        raise ValueError('Generator ini hanya untuk tiga modul baru; OCT terbit tetap memakai key yang ada.')
    spec, config, labels = DATASETS[dataset]
    validate_groups(groups, config, spec)
    placement = MODULES[dataset]
    for role, rows in groups.items():
        for row in rows:
            item = media.get(media_key(row))
            if not item or item['sourceKey'] != source_key(dataset):
                raise ValueError('Media belum terdaftar atau sumbernya berbeda: ' + media_key(row))
            if role == 'practice' and (item.get('title') != 'Citra latihan' or item.get('alt') != 'Citra latihan identifikasi'):
                raise ValueError('Metadata media latihan harus generik; tinjau pool media dahulu.')
    sources, guide, table = teaching_records(dataset, placement['childTitle'])
    asset_source = source_definition(spec)
    asset_source['policies'] = [{'collection': placement['moduleKey'], 'allowed': True, 'reviewed': False,
                                 'note': 'Periksa sumber dan konten modul sebelum publikasi.'}]
    sources.insert(0, {'kind': 'source', 'data': asset_source})
    for record in sources:
        previous = existing_sources.get(record['data']['key'])
        if previous:
            previous = previous.get('data', previous)
            if previous.get('role') != record['data']['role'] or previous.get('url') != record['data']['url']:
                raise ValueError('Sumber yang ada memerlukan pemeriksaan manual: ' + record['data']['key'])
            record['data'] = copy.deepcopy(previous)
    items = gallery_items(dataset, groups['learning'], labels, media_key)
    root = next(root for root in TAXONOMY['roots'] if root['key'] == placement['root'])
    summary = learning_guide(dataset)['introduction']['text']
    module = {'key': placement['moduleKey'], 'title': placement['title'], 'summary': summary,
        'sources': [record['data']['key'] for record in sources],
        'chapters': [{'key': 'belajar', 'title': placement['childTitle'], 'sections': [
            {'key': 'contoh-berlabel', 'title': 'Amati dan bandingkan', 'blocks': [
                {'key': 'batas', 'type': 'callout', 'tone': 'warn', 'title': 'Batas penggunaan',
                 'text': 'Label dataset untuk pembelajaran pola kelas, bukan diagnosis atau keputusan terapi pasien.'},
                {'key': 'panduan', 'type': 'identification_guide', 'guide': guide['data']['key'], 'title': 'Urutan pengamatan'},
                {'key': 'galeri', 'type': 'gallery', 'title': 'Contoh berlabel', 'items': items},
                table,
                {'key': 'latihan', 'type': 'practice', 'title': 'Latihan identifikasi', 'bank': 'identifikasi'}]}]}],
        'questionBanks': [{'key': 'identifikasi', 'title': 'Latihan identifikasi', 'questions': questions_for(dataset, groups)}],
        'pathways': [{'key': 'awal', 'title': 'Amati lalu latihan', 'sections': ['contoh-berlabel']}]}
    return {'schemaVersion': 1, 'records': [*sources,
        {'kind': 'catalog', 'data': {'key': root['key'], 'title': root['title'], 'order': TAXONOMY['roots'].index(root) * 10}},
        {'kind': 'catalog', 'data': {'key': placement['child'], 'title': placement['childTitle'], 'parent': root['key'], 'order': 10}},
        guide, {'kind': 'module', 'data': module},
        {'kind': 'placement', 'data': {'key': placement['moduleKey'] + '-placement', 'title': placement['title'],
                                     'module': placement['moduleKey'], 'catalog': placement['child'], 'order': 10}}]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', choices=[*SUPPORTED, 'all'], default='all')
    parser.add_argument('--manifest-dir', type=Path, default=ROOT / 'tools/lab-ingest/cache/manifests')
    parser.add_argument('--media-inventory', type=Path, required=True, help='Saved GET lab-authoring/media JSON')
    parser.add_argument('--source-records', type=Path, required=True, help='Saved GET lab-authoring/records?kind=source JSON')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'tools/lab-ingest/cache/authoring-bundles')
    args = parser.parse_args()
    public = (ROOT / 'apps/web/public').resolve()
    if args.output_dir.resolve().is_relative_to(public):
        parser.error('Bundle mengandung kunci jawaban; output harus privat.')
    media = {row['key']: row for row in json.loads(args.media_inventory.read_text())['items']}
    sources = {row['key']: row for row in json.loads(args.source_records.read_text())['items']}
    outputs = []
    for dataset in SUPPORTED if args.dataset == 'all' else (args.dataset,):
        value = json.loads((args.manifest_dir / f'authoring-media-{dataset}.json').read_text())
        groups = selection_from_manifest(value, dataset)
        outputs.append((dataset, authoring_bundle(dataset, groups, media, sources)))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for dataset, bundle in outputs:
        path = args.output_dir / (MODULES[dataset]['moduleKey'] + '.json')
        path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        spec, config, _ = DATASETS[dataset]
        print(f'{dataset}: learning={len(spec.labels) * config.learning_per_class} '
              f'practice={len(spec.labels) * config.practice_per_class} overlap=0; '
              f'private bundle {path}; no API writes or publication.')


if __name__ == '__main__':
    main()
