// "Anatomi" tab: shared Atlas layer controls + explicit coordinate frames / registration status.
// Built from plain state passed in by main.js (no circular imports).
import { ATLAS_GROUPS, UNAVAILABLE_ANATOMY, isRespiratoryDetail } from './atlasLayer.js';

const fmtM = (m) => [0, 1, 2].map((r) => '[' + [0, 1, 2, 3].map((c) => String(+m[r * 4 + c].toFixed(3)).padStart(7)).join(' ') + ' ]').join('\n');

/** Frames and registration status, as data (also used by tests and docs). */
export function frameSummary({ D, comparison }) {
  const an = D?.anatomy, isAtlas = an?.dataset === 'atlas', ct = D?.ct;
  const frames = [
    { key: 'atlas', name: 'Koordinat atlas', text: 'glTF meter · +X kiri pasien · +Y superior · +Z anterior · asal di lantai, bidang mid-sagital (sama dengan Atlas MEDCOEL /anatomy/viewer/)' },
    { key: 'patient', name: 'Koordinat pasien (LPS)', text: `milimeter · +x kiri · +y posterior · +z superior${isAtlas ? ' · z = 0 di ujung prosesus xiphoideus atlas' : ' · z ≈ 0 setinggi xiphisternum phantom'}` },
    { key: 'ct', name: 'Koordinat fisik CT', text: ct ? `indeks voxel (i,j,k) → LPS lewat affine NRRD · ${ct.sizes.join('×')} voxel · ${ct.spacing.map((v) => v.toFixed(2)).join('/')} mm` : '—' },
    { key: 'probe', name: 'Koordinat probe', text: 'titik kontak + sumbu u (lebar citra), b (arah berkas), e (elevasi), semuanya dalam LPS; tidak bergantung pada kamera' },
    { key: 'world', name: 'Koordinat dunia render', text: 'satu matriks LPS → scene (x = superior, y = anterior, z = kiri); kamera hanya melihat, tidak pernah mengubah citra' },
  ];
  let relations;
  if (isAtlas) {
    relations = [
      { pair: 'Atlas → pasien (LPS)', status: 'exact', text: 'Eksak: kaku + konversi satuan (tanpa fitting). CT sintetis dan label DIBANGUN dari mesh atlas dalam kerangka ini.', matrix: an.atlasFrame.atlasToLPS },
      { pair: 'Pasien ↔ CT', status: 'exact', text: 'Eksak: affine NRRD; registrasi kulit diverifikasi (SHA-256, probe HU, 24 jangkar).' },
      { pair: 'Kulit ↔ CT', status: 'approx', text: `Cangkang ILUSTRATIF: amplop otot/tulang atlas + ${an.build?.fatAndSkinMM ?? 8} mm lemak & kulit (asumsi). Kesesuaian dengan label tubuh CT: ${(D.reg?.qc?.skinLabelAgreement * 100 || 0).toFixed(1)}% verteks.` },
      { pair: 'Atlas ↔ phantom prosedural', status: 'none', text: comparison ? `TIDAK diregistrasi. Fit rigid terbaik berbasis ${comparison.residual.length} landmark organ menyisakan RMS ${comparison.rmsMM} mm (maks ${comparison.maxMM} mm): tubuh yang berbeda.` : 'TIDAK diregistrasi.' },
      { pair: 'Atlas ↔ CT pasien nyata', status: 'none', text: 'Tidak ada data yang memungkinkan registrasi tervalidasi; atlas tidak pernah ditumpangkan pada CT nyata.' },
    ];
  } else if (D?.source === 'local') {
    relations = [{ pair: 'Atlas ↔ CT lokal', status: 'none', text: 'Tidak diregistrasi. Lapisan atlas disembunyikan; CT/USG memakai data lokal saja.' }];
  } else {
    relations = [
      { pair: 'Phantom ↔ CT', status: 'exact', text: 'Eksak: mesh direkonstruksi dari CT phantom (registrasi terverifikasi).' },
      { pair: 'Atlas ↔ phantom prosedural', status: 'none', text: comparison ? `TIDAK diregistrasi: residual fit rigid RMS ${comparison.rmsMM} mm (maks ${comparison.maxMM} mm). Lapisan atlas tidak ditampilkan di dataset ini. Pilih dataset Atlas di tab Data.` : 'TIDAK diregistrasi; lapisan atlas tidak ditampilkan di dataset ini.' },
    ];
  }
  return { frames, relations };
}

export function buildAtlasPanel(box, ctx) {
  const { el, atlas, atlasState, S, D, DISPLAY_MODES, selected, actions } = ctx;
  const isAtlas = D?.anatomy?.dataset === 'atlas';
  const query = S.atlasQuery || '';
  box.innerHTML = '';
  // display modes (drawn content only)
  box.append(el('h3', {}, 'Mode tampilan tubuh'),
    el('div', { class: 'seg wrap', role: 'group', 'data-testid': 'display-modes' }, ...Object.entries(DISPLAY_MODES).map(([k, m]) => el('button', { type: 'button', 'data-testid': 'display-' + k, 'aria-pressed': String(S.appearance.mode === k), onclick: () => actions.setDisplayMode(k) }, m.label))),
    el('p', { class: 'hint' }, 'Mode hanya mengubah apa yang digambar di 3D. Citra CT/USG selalu berasal dari data pencitraan dan posisi probe.'));
  if (!isAtlas) {
    box.append(el('p', { class: 'hint warn', 'data-testid': 'atlas-not-registered' }, D?.source === 'local' ? 'CT lokal tidak diregistrasi ke atlas: lapisan Atlas MEDCOEL disembunyikan agar tidak menampilkan korespondensi palsu.' : 'Dataset phantom prosedural adalah tubuh lain yang tidak diregistrasi ke atlas. Lapisan Atlas MEDCOEL hanya tampil di dataset "Atlas MEDCOEL" (tab Data).'));
  } else {
    box.append(el('div', { id: 'atlasStatus', class: 'meta', 'data-testid': 'atlas-status' }, atlasState === 'ready' ? `Atlas MEDCOEL: ${atlas.structures.size} struktur dimuat dari model bersama (${atlas.stats.triangles.toLocaleString('id-ID')} segitiga) · ${[...atlas.loaded].join(', ')}` : atlasState === 'unavailable' ? 'Model Atlas MEDCOEL tidak tersedia di server ini.' : 'Memuat model Atlas MEDCOEL…'));
    // legend: atlas vs animated vs imaging-derived
    box.append(el('div', { class: 'legend', 'data-testid': 'atlas-legend' },
      el('div', {}, el('i', { class: 'sw atlas' }), 'Anatomi Atlas MEDCOEL (geometri umum, BodyParts3D/Z-Anatomy)'),
      el('div', {}, el('i', { class: 'sw anim' }), 'Atlas + gerak prosedural (jantung, paru, diafragma, hati, lambung, limpa, pembuluh besar)'),
      el('div', {}, el('i', { class: 'sw skin' }), 'Cangkang kulit ilustratif (diturunkan dari amplop atlas)'),
      el('div', {}, el('i', { class: 'sw img' }), 'Bidang citra: CT sintetis dari atlas / USG simulasi')),
    el('label', { class: 'check' }, el('input', { type: 'checkbox', 'data-testid': 'mark-animated', checked: atlas?.markAnimated || undefined, onchange: (e) => actions.markAnimated(e.target.checked) }), 'Tandai struktur yang digerakkan secara prosedural'));
    if (atlas && atlasState !== 'unavailable') {
      // systems
      box.append(el('h4', {}, 'Sistem anatomi'));
      const list = el('div', { class: 'group-list', 'data-testid': 'atlas-groups' });
      for (const [g, def] of Object.entries(ATLAS_GROUPS)) {
        const st = atlas.groups[g], loaded = atlas.loaded.has(def.system);
        const row = el('div', { class: 'group-row' + (loaded ? '' : ' unloaded') },
          el('label', { class: 'check' }, el('input', { type: 'checkbox', 'data-testid': 'group-' + g, checked: (st.visible && loaded) || undefined, onchange: async (e) => { if (!loaded) await actions.loadSystem(def.system); actions.setGroup(g, { visible: e.target.checked }); } }), `${def.label}`, el('span', { class: 'count' }, loaded ? ` ${st.count}` : def.onDemand ? ' · muat saat dicentang' : '')),
          loaded ? el('input', { type: 'range', min: 5, max: 100, value: Math.round(st.opacity * 100), 'aria-label': 'Transparansi ' + def.label, 'data-testid': 'opacity-' + g, oninput: (e) => actions.setGroup(g, { opacity: Number(e.target.value) / 100 }) }) : null);
        list.append(row);
      }
      for (const u of UNAVAILABLE_ANATOMY) list.append(el('div', { class: 'group-row unavailable', 'data-testid': 'unavailable-' + u.key, title: u.reason },
        el('span', { class: 'check' }, el('input', { type: 'checkbox', disabled: true, 'aria-label': u.label + ' tidak tersedia' }), u.label), el('span', { class: 'count' }, ' · tidak tersedia'), el('small', { class: 'muted' }, u.reason)));
      box.append(list);
      // Progressive disclosure: bronchi and pleura are present in the cleared visceral atlas
      // but initially hidden to avoid obscuring the major organs. No new mesh is generated.
      const airwayDetails = [...atlas.structures.values()].filter((st) => isRespiratoryDetail(st.name, st.group));
      if (atlas.loaded.has('visceral') && airwayDetails.length) {
        box.append(el('section', { class: 'learn-card', 'data-testid': 'respiratory-detail-card' },
          el('h4', {}, 'Detail saluran napas'),
          el('p', { class: 'hint' }, `${airwayDetails.length} struktur pleura/bronkus tersedia dalam Atlas MEDCOEL. Secara bawaan disembunyikan agar tidak menutupi paru. Mengaktifkan detail hanya mengubah visibilitas 3D, bukan citra CT/USG.`),
          el('button', { type: 'button', class: 'btn', 'data-testid': 'respiratory-detail-toggle', 'aria-pressed': String(atlas.respiratoryDetailsShown), onclick: () => actions.setRespiratoryDetail(!atlas.respiratoryDetailsShown) }, atlas.respiratoryDetailsShown ? 'Sembunyikan detail saluran napas' : 'Tampilkan pleura & cabang bronkus'),
          el('p', { class: 'meta' }, 'Jika pleura menutupi organ, gunakan slider transparansi Paru & saluran napas di atas. "Pulihkan tampilan" mengembalikan detail ke keadaan awal.')));
      }
      // structures
      const names = atlas.list().map((x) => x.name).sort();
      const dl = el('datalist', { id: 'atlasNames' }, ...names.map((n) => el('option', { value: n })));
      const input = el('input', { type: 'search', list: 'atlasNames', value: query, placeholder: 'Cari struktur (mis. Left ventricle, Liver)', 'data-testid': 'structure-search', 'aria-label': 'Cari struktur atlas', onchange: (e) => actions.select(e.target.value) });
      box.append(el('h4', {}, 'Struktur'), dl, input,
        el('div', { class: 'row' },
          el('button', { type: 'button', class: 'btn', 'data-testid': 'tool-inspect', 'aria-pressed': String(S.tool === 'inspect'), onclick: () => actions.setTool(S.tool === 'inspect' ? 'probe' : 'inspect') }, S.tool === 'inspect' ? '✓ Pilih di 3D (aktif)' : 'Pilih di 3D'),
          el('button', { type: 'button', class: 'btn', 'data-testid': 'btn-highlight', disabled: !selected || undefined, onclick: () => actions.highlight(selected) }, 'Sorot'),
          el('button', { type: 'button', class: 'btn', 'data-testid': 'btn-isolate', disabled: !selected || undefined, onclick: () => actions.isolate(atlas.isolated === selected ? null : selected) }, atlas.isolated && atlas.isolated === selected ? 'Kembali ke konteks' : 'Isolasi'),
          el('button', { type: 'button', class: 'btn', 'data-testid': 'btn-hide', disabled: !selected || undefined, onclick: () => actions.hide(selected, !atlas.structures.get(selected)?.hiddenByUser) }, atlas.structures.get(selected)?.hiddenByUser ? 'Tampilkan' : 'Sembunyikan'),
          el('button', { type: 'button', class: 'btn', 'data-testid': 'btn-showall', onclick: () => actions.showAll(), title: 'Kembalikan tampilan bawaan (selubung seperti omentum dan pleura tetap tersembunyi; centang sistem untuk menampilkannya)' }, 'Pulihkan tampilan')));
      const sel = selected && atlas.structures.get(selected);
      box.append(el('div', { class: 'readout', 'data-testid': 'structure-info', 'aria-live': 'polite' }, sel
        ? [el('div', { class: 'ro-strong' }, sel.name), el('div', {}, `Sistem: ${ATLAS_GROUPS[sel.group]?.label || sel.group} · file ${sel.system}.glb`), el('div', {}, sel.animated ? 'Bergerak secara prosedural (bukan gerak terukur pasien)' : 'Statis (geometri atlas)'), el('div', {}, sel.hiddenByUser ? 'Disembunyikan' : 'Terlihat')]
        : 'Pilih struktur dari daftar atau aktifkan "Pilih di 3D" lalu klik organ.'));
      box.append(el('details', { class: 'limits' }, el('summary', {}, 'Kinerja lapisan atlas'), el('div', { class: 'meta', 'data-testid': 'atlas-perf' },
        `Dimuat: ${[...atlas.loaded].map((s) => `${s} ${atlas.stats.loadMs[s] ?? '?'} ms`).join(' · ')} · ${atlas.stats.vertices.toLocaleString('id-ID')} verteks · ${atlas.stats.dropped} mesh di luar fokus dibuang setelah dekode · verteks bergerak ${atlas.animatedVertexCount().toLocaleString('id-ID')}`)));
    }
  }
  if (isAtlas) box.append(el('details', { class: 'limits', 'data-testid': 'atlas-attribution' }, el('summary', {}, 'Sumber & lisensi model atlas'),
    el('ul', {}, ...(D.anatomy.attribution || []).map((a) => el('li', {}, a))),
    el('p', { class: 'meta' }, `Model dimuat dari Atlas Anatomi MEDCOEL (tanpa salinan). CT/label/kulit di dataset ini adalah turunan: ${D.anatomy.licence}. Penggunaan nonkomersial untuk pendidikan.`)));
  // frames + registration
  const fs = frameSummary({ D, comparison: ctx.comparison });
  box.append(el('details', { class: 'limits frames', open: ctx.framesOpen || undefined, 'data-testid': 'frames-panel', ontoggle: (e) => actions.framesOpen(e.target.open) },
    el('summary', {}, 'Sistem koordinat & registrasi'),
    el('ol', { class: 'frames-list' }, ...fs.frames.map((f) => el('li', {}, el('strong', {}, f.name + ': '), f.text))),
    el('table', { class: 'compare reg' }, ...fs.relations.map((r) => el('tr', { 'data-status': r.status }, el('td', {}, r.pair), el('td', {}, el('span', { class: 'reg-badge ' + r.status }, r.status === 'exact' ? 'eksak' : r.status === 'approx' ? 'perkiraan' : 'tidak diregistrasi'), ' ', r.text)))),
    isAtlas ? el('pre', { class: 'matrix', 'data-testid': 'atlas-matrix' }, 'atlasToLPS (meter → mm)\n' + fmtM(D.anatomy.atlasFrame.atlasToLPS)) : null));
}
