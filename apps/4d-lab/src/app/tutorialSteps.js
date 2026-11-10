// Tutorial content. Every task is checked against the REAL state of the lab, so a step is only done when the learner has
// really pressed, dragged or hovered the real control. The camera is read here only to notice that the learner moved it;
// nothing in this file writes camera or imaging state (the lab's rule: camera never feeds imaging).
//
// ctx: { S, scene, padKind, setAssistLevel, assistSelect, hoverTip }

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const LEVEL_NAMES = { off: 'Mati', hover: 'Hanya hover', contours: 'Kontur', guided: 'Terpandu', challenge: 'Tantangan' };

export function generalSteps(ctx) {
  const { S, scene, padKind, setAssistLevel, assistSelect, hoverTip } = ctx;
  const probeKey = () => (padKind() === 'tri' ? S.tri.point : S.mode === 'free' ? S.free.position : S.contact?.point) || null;
  let hovered = null; // what the learner pointed at in the image, for the success message
  return [
    {
      id: 'welcome', target: '.brand', mascot: 'kori', mood: 'wave', next: 'Ayo mulai',
      title: 'Halo, aku Kori!',
      text: 'Aku menemanimu mengenal MEDCOEL 4D Lab. Kali ini kamu langsung mencoba sendiri: aku baru lanjut setelah kamu benar-benar menekannya, jadi kamu tahu hasilnya.',
    },
    {
      id: 'probe', target: '#probePad',
      title: 'Gerakkan probe',
      text: 'Panah di kotak ini selalu mengikuti tubuh pasien, bukan arah layar.',
      task: {
        text: 'tekan salah satu tombol arah, misalnya Superior.',
        hint: 'klik tombol ↑ Superior atau → Kiri di kotak "Gerakkan probe". Kalau ditahan, probe terus bergerak.',
        baseline: probeKey,
        done: (b) => !same(probeKey(), b),
        success: { title: 'Probe bergeser!', text: 'Lihat citra USG dan CT di kanan: irisannya ikut pindah karena probe pindah. Tiap tombol mengubah satu hal saja.' },
      },
    },
    {
      id: 'camera', target: '#viewport',
      title: 'Putar sudut pandang',
      text: 'Kamera hanya mengubah cara kamu melihat pasien.',
      task: {
        text: 'seret area kosong di sekitar pasien untuk memutar, atau scroll untuk zoom.',
        hint: 'tahan klik kiri di area kosong lalu geser. Di layar sentuh: geser dengan satu jari, cubit untuk zoom.',
        baseline: () => scene.camera.position.clone(),
        done: (b) => scene.camera.position.distanceTo(b) > 0.03 * Math.max(1, b.length()),
        success: { title: 'Kamera berputar', text: 'Sekarang lihat citra USG dan CT: tidak berubah. Kamera mengubah tampilanmu, bukan irisannya. Itu aturan emas di sini.' },
      },
    },
    {
      id: 'hover', target: '#monitor', pane: 'image',
      title: 'Sentuh citra untuk tahu isinya',
      text: 'Arahkan kursor ke bagian citra: nama struktur muncul tepat di sana. Aku menyalakan Bantuan anatomi → Hanya hover untukmu bila tadinya mati.',
      task: {
        text: 'gerakkan kursor di atas citra USG atau CT. (Layar sentuh: ketuk citra.)',
        hint: 'arahkan kursor ke bagian yang terang atau abu-abu di dalam kipas citra, bukan area hitam di luarnya.',
        prepare: () => {
          hovered = null;
          if (assistSelect.value === 'off') setAssistLevel('hover');
          const watch = () => { if (!hoverTip.hidden && !hovered) hovered = hoverTip.querySelector('b')?.textContent?.trim() || 'sebuah struktur'; };
          const mo = new MutationObserver(watch); mo.observe(hoverTip, { attributes: true, attributeFilter: ['hidden'], childList: true });
          return () => mo.disconnect();
        },
        done: () => !!hovered,
        success: () => ({ title: 'Itu dia!', text: `Kamu menunjuk: ${hovered}. Nama dan asal label muncul di dekat kursor. Struktur tanpa label tertulis "tidak teridentifikasi", bukan ditebak.` }),
      },
    },
    {
      id: 'assist', target: '#assistLevel', pane: 'image',
      title: 'Atur seberapa banyak bantuan',
      text: 'Mati: bersih. Hanya hover: nama saat ditunjuk. Kontur: garis tiap struktur. Terpandu: label dan penjelasan. Tantangan: nama disembunyikan untuk menguji.',
      task: {
        text: 'buka "Bantuan anatomi" lalu pilih Kontur.',
        hint: 'klik kotak pilihan "Bantuan anatomi" di atas citra, lalu pilih "Kontur".',
        baseline: () => assistSelect.value,
        done: (b) => assistSelect.value !== b && assistSelect.value !== 'off',
        success: () => ({ title: 'Mantap!', text: `Bantuan sekarang: ${LEVEL_NAMES[assistSelect.value] || assistSelect.value}. Lihat citranya: garis tiap struktur muncul di atas gambar abu-abu, dan hover masih bekerja.` }),
      },
    },
    {
      id: 'workspaces', target: '.ws-nav', mascot: 'kori', mood: 'cheer', next: 'Mulai simulasi',
      title: 'Siap berlatih!',
      text: 'Ruang kerja di atas: Anatomi & Citra, Auskultasi, Fisiologi, Patologi, dan Belajar. Mulai dari Belajar untuk latihan terpandu bertahap, atau jelajahi sendiri. Kamu juga bisa mengulangi tutorial ini dari tombol ?.',
    },
  ];
}

export function triSteps(ctx) {
  const { S } = ctx;
  const point = () => S.tri.point ? [...S.tri.point] : null;
  return [
    {
      id: 'tri-intro', target: '#triControls', pane: 'image', mascot: 'kori', mood: 'wave',
      title: 'Tiga bidang, satu titik silang',
      text: 'Aksial bergerak atas–bawah, koronal depan–belakang, dan sagital kanan–kiri pasien. Ketiganya berbagi satu titik silang.',
    },
    {
      id: 'tri-slider', target: '#tri-ax', pane: 'image',
      title: 'Geser irisan tanpa menyentuh citra',
      text: 'Setiap baris punya slider dan tombol −/+. Angkanya adalah posisi fisik dalam milimeter pasien.',
      task: {
        text: 'geser salah satu slider, atau tekan tombol −/+ pada barisnya.',
        hint: 'tarik bulatan slider "Aksial" ke kiri atau kanan, atau klik tombol + di sebelahnya.',
        baseline: point,
        done: (b) => !same(point(), b),
        success: { title: 'Irisan berpindah', text: 'Perhatikan tiga citra CT: garis silangnya ikut bergeser dan angka milimeter berubah.' },
      },
    },
    {
      id: 'tri-click', target: '#monitor', pane: 'image',
      title: 'Klik citra untuk memindahkan titik silang',
      text: 'Scroll pada citra menggeser irisan, seret menggeser tampilan, ⌘/Ctrl + scroll memperbesar. "Kembali ke Probe USG" selalu tersedia.',
      task: {
        text: 'klik satu titik pada salah satu citra CT.',
        hint: 'klik di dalam salah satu dari tiga gambar CT (aksial, koronal, atau sagital).',
        baseline: point,
        done: (b) => !same(point(), b),
        success: { title: 'Titik silang pindah!', text: 'Dua bidang lainnya langsung menyesuaikan, karena semuanya memakai satu titik yang sama.' },
      },
    },
  ];
}
