// Menyiapkan data uji LOKAL untuk merekam: PDF contoh, sakelar Drilling, dan satu materi (3 slide) lewat endpoint admin yang asli.
// Syarat: PocketBase (8090) sudah berjalan dengan seed video/tab-dua-puluh/seed. node siapkan.cjs
// Gambar slide memakai tautan lh3 bergaya asli; saat merekam, permintaan ke lh3 dijawab dari rekam/slide/*.png (lihat web.cjs).
const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const PB = 'http://127.0.0.1:8090';
const j = async (m, u, b, t) => { const r = await fetch(PB + u, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: t } : {}) }, body: b ? JSON.stringify(b) : undefined }); const x = await r.json().catch(() => ({})); if (!r.ok) throw new Error(m + ' ' + u + ' ' + r.status + ' ' + JSON.stringify(x).slice(0, 200)); return x; };
(async () => {
  // 1. PDF "PPT" contoh (3 halaman = 3 slide) untuk diunggah di Chat Admin
  const b = await chromium.launch(); const p = await b.newPage();
  const imgs = [1, 2, 3].map((i) => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'slide', `slide-${i}.png`)).toString('base64'));
  await p.setContent(`<style>@page{size:1600px 900px;margin:0}body{margin:0}img{display:block;width:1600px;height:900px;page-break-after:always}</style>${imgs.map((s) => `<img src="${s}">`).join('')}`);
  await p.pdf({ path: path.join(__dirname, 'Anatomi Sendi Bahu Kuliah 1.pdf'), width: '1600px', height: '900px', printBackground: true }); await b.close();
  // 2. nama kampus data uji dibuat generik (supaya tidak menyebut kampus nyata)
  const su = (await j('POST', '/api/collections/_superusers/auth-with-password', { identity: 'dev@medcoel.local', password: 'devpassword123' })).token;
  const nadia = (await j('POST', '/api/collections/users/auth-with-password', { identity: 'nadia.putri', password: 'rahasia-demo-1' })).record;
  await j('PATCH', `/api/collections/campuses/records/${nadia.campus}`, { name: 'FK Kampus Contoh', institution: 'Kampus Contoh', city: 'Kota Contoh' }, su);
  // 3. sakelar Drilling menyala
  const st = await j('GET', '/api/collections/app_settings/records?perPage=1', null, su); const rec = st.items[0];
  await j('PATCH', `/api/collections/app_settings/records/${rec.id}`, { drillingEnabled: true }, su);
  // 4. materi contoh lewat endpoint admin Drilling (admin.demo dari seed)
  const admin = (await j('POST', '/api/collections/users/auth-with-password', { identity: 'admin.demo', password: 'rahasia-demo-1' }).catch(() => j('POST', '/api/collections/users/auth-with-password', { identity: 'admin.demo', password: 'rahasia-demo-1' }))).token;
  const subj = (await j('GET', '/api/collections/subjects/records?filter=slug="anatomi"', null, su)).items[0];
  const deck = {
    schemaVersion: 1, title: 'Anatomi Sendi Bahu Kuliah 1', description: 'Materi contoh untuk video (skema buatan).',
    slides: [
      { title: 'Sendi bahu', image: 'https://lh3.googleusercontent.com/d/SLIDEBAHU0001',
        explanation: '## Sendi bahu\nSendi bahu (**articulatio glenohumeralis**) adalah sendi *ball-and-socket* antara **caput humeri** dan **fossa glenoidalis** scapula.\n\n- **Caput humeri** jauh lebih besar daripada fossa glenoidalis, jadi hanya sebagian kecil permukaannya yang berkontak.\n- **Labrum glenoidale** (cincin fibrokartilago) memperdalam fossa glenoidalis.\n- **Acromion** membentuk atap di atas sendi.\n- **Capsula articularis** dan ligamen membungkus sendi.\n\n> [!highyield] Mobilitas tinggi, stabilitas rendah\n> Karena kontaknya dangkal, sendi bahu sangat leluasa bergerak tetapi lebih mudah mengalami dislokasi.' },
      { title: 'Rotator cuff', image: 'https://lh3.googleusercontent.com/d/SLIDEBAHU0002',
        explanation: '## Rotator cuff\nEmpat otot **SITS** membungkus caput humeri dan membantu menjaganya tetap di fossa glenoidalis.\n\n1. **Supraspinatus**: membantu memulai abduksi lengan\n2. **Infraspinatus**: rotasi lateral\n3. **Teres minor**: rotasi lateral\n4. **Subscapularis**: rotasi medial\n\n> [!klinis] Klinis\n> Tendon supraspinatus adalah bagian rotator cuff yang paling sering mengalami cedera.' },
      { title: 'Gerakan sendi bahu', image: 'https://lh3.googleusercontent.com/d/SLIDEBAHU0003',
        explanation: '## Gerakan sendi bahu\n| Gerakan | Arah |\n|---|---|\n| Fleksi / ekstensi | ke depan / ke belakang |\n| Abduksi / adduksi | menjauhi / mendekati garis tengah tubuh |\n| Rotasi medial / lateral | memutar ke dalam / ke luar |\n| Sirkumduksi | gabungan gerakan membentuk lingkaran |' },
    ],
  };
  const r = await j('POST', '/api/medcoel/admin/drilling/decks', { subject: subj.id, scope: 'all', status: 'published', deck }, admin);
  console.log('materi:', JSON.stringify({ title: r.title, slideCount: r.slideCount, blocked: r.blocked, warnings: r.warnings }));
})().catch((e) => { console.error(e.message); process.exit(1); });
