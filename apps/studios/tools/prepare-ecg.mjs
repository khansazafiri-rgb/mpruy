#!/usr/bin/env node
// ECG studio data from the OFFICIAL PTB-XL v1.0.3 (PhysioNet, CC BY 4.0). Reads the private raw subset in local-data/,
// verifies every file against the official SHA256SUMS, decodes WFDB with header checksums, keeps fs/gain/baseline/units,
// and writes waveforms WITHOUT patient metadata (no ids, age, sex, dates, site, device, free-text report).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseHeader, decodeFormat16, toMv, detectRPeaks, heartRate, STANDARD_LEADS } from '../engines/ecg/wfdb.js';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const RAW = path.join(REPO, 'local-data/studio-resources/raw/ptbxl');
const OUT = path.join(REPO, 'local-data/studio-resources/build/ecg');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const BASE = 'https://physionet.org/files/ptb-xl/1.0.3/';
// Curated subset: human-validated, no noise/drift/pacemaker flags, one high-likelihood statement (selection in the PR).
const CASES = [
  { id: 'c1', record: 'records500/00000/00003_hr', code: 'NORM' }, { id: 'c2', record: 'records500/00000/00023_hr', code: 'AFLT' },
  { id: 'c3', record: 'records500/00000/00286_hr', code: 'CLBBB' }, { id: 'c4', record: 'records500/00000/00903_hr', code: 'CRBBB' },
  { id: 'c5', record: 'records500/02000/02509_hr', code: '1AVB' }, { id: 'c6', record: 'records500/04000/04117_hr', code: 'AFIB' },
];
const LABEL = { NORM: 'EKG normal (ritme sinus)', AFIB: 'Fibrilasi atrium', AFLT: 'Flutter atrium', '1AVB': 'Blok AV derajat satu', CLBBB: 'Left bundle branch block komplet', CRBBB: 'Right bundle branch block komplet' };
const TEACH = {
  NORM: 'Ritme sinus teratur, gelombang P mendahului setiap QRS, interval dan aksis dalam batas normal menurut label PTB-XL.',
  AFIB: 'Interval RR tidak teratur dan tidak ada gelombang P yang jelas (garis dasar fibrilatoris).',
  AFLT: 'Gelombang flutter (pola gigi gergaji) dengan konduksi ventrikel yang relatif teratur.',
  '1AVB': 'Setiap P diikuti QRS, tetapi interval PR memanjang (> 200 ms).',
  CLBBB: 'QRS lebar (≥ 120 ms) dengan pola blok berkas cabang kiri di sadapan lateral.',
  CRBBB: 'QRS lebar (≥ 120 ms) dengan pola rSR\' di V1 dan S lebar di sadapan lateral.',
};
const ATTRIBUTION = 'PTB-XL v1.0.3: Wagner P, Strodthoff N, Bousseljot R, Samek W, Schaeffter T. PTB-XL, a large publicly available electrocardiography dataset. PhysioNet (2022), doi:10.13026/kfzx-aw45; Scientific Data 7:154 (2020), doi:10.1038/s41597-020-0495-6. Goldberger AL et al., PhysioBank, PhysioToolkit, and PhysioNet, Circulation 101(23):e215-e220 (2000). Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).';

export function prepare() {
  const sums = new Map(fs.readFileSync(path.join(RAW, 'SHA256SUMS.txt'), 'utf8').trim().split('\n').map(l => { const [h, f] = l.split(/\s+/); return [f, h]; }));
  const verify = rel => { const b = fs.readFileSync(path.join(RAW, rel)); if (sums.get(rel) !== sha(b)) throw Error('PTB-XL digest mismatch: ' + rel); return b; };
  const db = verify('ptbxl_database.csv').toString('utf8');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'data/cases'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'server'), { recursive: true });
  const outputs = {}, members = {}, validation = [];
  for (const c of CASES) {
    const row = db.split('\n').find(l => l.includes(',' + c.record + '\n') || l.endsWith(',' + c.record) || l.includes(',' + c.record + '\r'));
    if (!row || !row.includes("'" + c.code + "': 100.0")) throw Error('Label mismatch for ' + c.record);
    const hea = verify(c.record + '.hea'), dat = verify(c.record + '.dat');
    members[c.record + '.hea'] = sha(hea); members[c.record + '.dat'] = sha(dat);
    const h = parseHeader(hea.toString('utf8')), adu = decodeFormat16(h, dat);
    if (h.fs !== 500 || h.samples !== 5000 || h.signals.map(s => s.lead).join() !== STANDARD_LEADS.join() || h.signals.some(s => s.units !== 'mV')) throw Error('Unexpected header for ' + c.record);
    const ii = h.signals.findIndex(s => s.lead === 'II'), hr = heartRate(detectRPeaks(Array.from(adu[ii], v => toMv(v, h.signals[ii])), h.fs), h.fs);
    const wave = { schema: 'medcoel.ecg.v1', caseId: c.id, fs: h.fs, samples: h.samples, units: 'mV', paperSpeedMmPerS: 25, gainMmPerMv: 10,
      leads: h.signals.map((s, k) => ({ lead: s.lead === 'AVR' ? 'aVR' : s.lead === 'AVL' ? 'aVL' : s.lead === 'AVF' ? 'aVF' : s.lead, gainAduPerMv: s.gain, baselineAdu: s.baseline, adu: Array.from(adu[k]) })) };
    outputs['data/cases/' + c.id + '.json'] = Buffer.from(JSON.stringify(wave));
    validation.push({ case: c.id, checksums: 'all 12 leads match header', fs: h.fs, gain: h.signals[0].gain, detectedHrBpm: +hr.bpm.toFixed(1), rrSdMs: +hr.rrSdMs.toFixed(1) });
  }
  outputs['data/labels.json'] = Buffer.from(JSON.stringify({ schema: 'medcoel.ecg-labels.v1', source: 'PTB-XL scp_codes (likelihood 100), validated_by_human = True', review: 'pending',
    note: 'Label kurasi dataset, bukan diagnosis definitif. Tidak ada data identitas pasien.', cases: Object.fromEntries(CASES.map(c => [c.id, { scp: c.code, label: LABEL[c.code], teaching: TEACH[c.code] }])) }, null, 1));
  outputs['data/dataset.json'] = Buffer.from(JSON.stringify({ schema: 'medcoel.dataset.v1', status: 'PRIVATE_REVIEW', source: 'PTB-XL v1.0.3 (PhysioNet), CC BY 4.0',
    notice: 'Data: PTB-XL v1.0.3 (PhysioNet) © Wagner dkk., CC BY 4.0. Rekaman pasien yang telah dide-identifikasi oleh penerbit; label dataset bukan diagnosis definitif. Review klinis kunci kasus belum selesai: hanya review privat.',
    cases: CASES.map(c => c.id), labels: 'data/labels.json', guidedCase: 'c1' }, null, 1));
  outputs['data/NOTICE-PTB-XL.txt'] = Buffer.from(ATTRIBUTION + '\n\nChanges by MEDCOEL: six records selected; WFDB format-16 samples re-expressed as JSON integers with their ADC gain, baseline, units and sampling frequency (no resampling, filtering or scaling). Patient metadata removed. Adapted data shared under CC BY 4.0.\n');
  outputs['data/LICENSE-PTB-XL.txt'] = verify('LICENSE.txt');
  outputs['server/challenge.json'] = Buffer.from(JSON.stringify({ schema: 'medcoel.challenge.v1', source: 'PTB-XL v1.0.3', medicalReview: 'pending', count: 6,
    items: CASES.map((c, n) => {
      const options = ['NORM', 'AFIB', 'AFLT', '1AVB', 'CLBBB', 'CRBBB'];
      const ordered = options.slice(n % options.length).concat(options.slice(0, n % options.length)).filter((o, i) => i < 4 || o === c.code).slice(0, 4);
      if (!ordered.includes(c.code)) ordered[3] = c.code;
      return { id: 'ecg-' + c.id, prompt: { kind: 'ecg-interpretation', caseId: c.id, text: 'Interpretasi utama EKG ini (menurut label kurasi dataset)?' }, options: ordered.map(o => LABEL[o]), answer: { index: ordered.indexOf(c.code) },
        canonical: LABEL[c.code], explanation: TEACH[c.code] + ' Label: PTB-XL (' + c.code + '), bukan diagnosis definitif; review klinis kunci belum selesai.' };
    }) }, null, 1));
  if (!fs.existsSync(path.join(RAW, 'LICENSE.txt'))) throw Error('Licence file missing');
  for (const [rel, b] of Object.entries(outputs)) { fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true }); fs.writeFileSync(path.join(OUT, rel), b); }
  const provenance = { schema: 'medcoel.provenance.v1', studio: 'ecg', generatedAt: new Date().toISOString(), tool: 'apps/studios/tools/prepare-ecg.mjs',
    source: { url: BASE, release: '1.0.3', doi: '10.13026/kfzx-aw45', sha256sums: sha(fs.readFileSync(path.join(RAW, 'SHA256SUMS.txt'))) },
    members, outputs: Object.fromEntries(Object.entries(outputs).map(([k, b]) => [k, { bytes: b.length, sha256: sha(b) }])), validation,
    privacy: 'removed patient_id, age, sex, height, weight, recording_date, nurse, site, device, report text; case ids are opaque', licence: 'CC-BY-4.0', medicalReview: 'pending' };
  fs.writeFileSync(path.join(OUT, 'provenance.json'), JSON.stringify(provenance, null, 2));
  return provenance;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) { const p = prepare(); console.log(JSON.stringify(p.validation, null, 1)); }
