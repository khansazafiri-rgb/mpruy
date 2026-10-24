// Narasi iklan dengan layanan TTS berlisensi komersial. Suara tidak diproses (tanpa EQ, nada, atau percepatan);
// hasil tiap kalimat disimpan apa adanya ke <out>/sNN-K.wav (WAV 16-bit mono 24 kHz).
//   node commercial.mjs --provider google --list                       daftar suara id-ID milik layanan
//   node commercial.mjs --provider google --voice id-ID-Chirp3-HD-Aoede --out narasi [--only 01,02,03]
// Kunci dibaca dari variabel lingkungan (jangan ditulis di berkas atau chat):
//   google:     GOOGLE_TTS_API_KEY   (Cloud Text-to-Speech API; suara Chirp 3 HD atau Neural2 id-ID)
//   elevenlabs: ELEVENLABS_API_KEY   (paket berbayar = lisensi komersial; --voice = voice_id, --model bawaan eleven_multilingual_v2)
//   azure:      AZURE_SPEECH_KEY dan AZURE_SPEECH_REGION   (--voice mis. id-ID-GadisNeural)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const provider = opt('provider', 'google');
const voice = opt('voice', '');
const out = path.resolve(opt('out', 'narasi'));
const only = opt('only') ? new Set(opt('only').split(',')) : null;
const RATE = 24000;
const need = (n) => { const v = process.env[n]; if (!v) { console.error(`Variabel ${n} belum diatur di lingkungan.`); process.exit(2); } return v; };

// PCM 16-bit mono -> berkas WAV
function wav(pcm, rate = RATE) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
// WAV dari layanan -> PCM mentah (lewati header RIFF sampai chunk data)
function pcmOf(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF') return buf;
  let p = 12;
  while (p + 8 <= buf.length) { const id = buf.toString('ascii', p, p + 4); const n = buf.readUInt32LE(p + 4); if (id === 'data') return buf.subarray(p + 8, Math.min(buf.length, p + 8 + n)); p += 8 + n + (n % 2); }
  return buf.subarray(44);
}

const post = async (url, init) => {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${provider} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r;
};

const engines = {
  async google(text, v) {
    const key = need('GOOGLE_TTS_API_KEY');
    const body = { input: { text }, voice: { languageCode: 'id-ID', name: v }, audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: RATE } };
    const j = await (await post(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
    return pcmOf(Buffer.from(j.audioContent, 'base64'));
  },
  async elevenlabs(text, v) {
    const key = need('ELEVENLABS_API_KEY');
    const body = { text, model_id: opt('model', 'eleven_multilingual_v2'), language_code: 'id' };
    const r = await post(`https://api.elevenlabs.io/v1/text-to-speech/${v}?output_format=pcm_${RATE}`, { method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return Buffer.from(await r.arrayBuffer());
  },
  async azure(text, v) {
    const key = need('AZURE_SPEECH_KEY'); const region = need('AZURE_SPEECH_REGION');
    const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const ssml = `<speak version="1.0" xml:lang="id-ID"><voice name="${v}">${esc(text)}</voice></speak>`;
    const r = await post(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm', 'User-Agent': 'medcoel-iklan' }, body: ssml });
    return pcmOf(Buffer.from(await r.arrayBuffer()));
  },
};

if (!engines[provider]) { console.error(`Penyedia tidak dikenal: ${provider} (google | elevenlabs | azure)`); process.exit(1); }

if (argv.includes('--list')) {
  if (provider === 'google') {
    const j = await (await post(`https://texttospeech.googleapis.com/v1/voices?languageCode=id-ID&key=${need('GOOGLE_TTS_API_KEY')}`, {})).json();
    (j.voices || []).forEach((x) => console.log(`${x.name}\t${x.ssmlGender}\t${x.naturalSampleRateHertz} Hz`));
  } else console.log('--list hanya untuk google. Untuk elevenlabs pilih voice_id dari Voice Library; untuk azure lihat daftar suara id-ID.');
  process.exit(0);
}
if (!voice) { console.error('Beri --voice (nama suara atau voice_id).'); process.exit(1); }

const spec = JSON.parse(fs.readFileSync(path.join(HERE, 'narasi-final.json'), 'utf8')).shot;
fs.mkdirSync(out, { recursive: true });
const report = {};
for (const [id, s] of Object.entries(spec)) {
  if (only && !only.has(id)) continue;
  for (const [k, teks] of s.teks.entries()) {
    // ejaan untuk mesin suara; takarir tetap memakai teks asli
    let say = teks;
    Object.entries(s.ucap || {}).forEach(([a, b]) => { say = say.split(a).join(b); });
    const pcm = await engines[provider](say, voice);
    const file = path.join(out, `s${id}-${k + 1}.wav`);
    fs.writeFileSync(file, wav(pcm));
    const sec = pcm.length / 2 / RATE;
    report[`${id}-${k + 1}`] = { teks, diucapkan: say, detik: +sec.toFixed(2) };
    console.log(`s${id}-${k + 1}: ${sec.toFixed(2)} dtk :: ${say}`);
  }
}
fs.writeFileSync(path.join(out, 'laporan.json'), JSON.stringify({ provider, voice, report }, null, 1));
console.log(`selesai: ${out}`);
