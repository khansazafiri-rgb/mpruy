// Direction pad: direct, labelled controls for moving the probe / CT plane / tri-planar crosshair in PATIENT
// directions, without choosing a mode first. Buttons repeat while held. Hovering a direction shows its patient
// axis in 3D. The same pad drives three targets:
//   probe : clinical probe on the skin (anterior/posterior walk around the body surface)
//   plane : Free 3D CT plane (exact LPS translation, plane rotation)
//   tri   : tri-planar CT crosshair (one slider per plane)
const DIRS = {
  superior: { axis: 'vertical', sign: 1, label: 'Superior', icon: '↑', hint: 'ke arah kepala' },
  inferior: { axis: 'vertical', sign: -1, label: 'Inferior', icon: '↓', hint: 'ke arah kaki' },
  right: { axis: 'horizontal', sign: -1, label: 'Kanan', icon: '←', hint: 'ke sisi KANAN pasien' },
  left: { axis: 'horizontal', sign: 1, label: 'Kiri', icon: '→', hint: 'ke sisi KIRI pasien' },
  anterior: { axis: 'depth', sign: 1, label: 'Anterior', icon: '⤒', hint: 'ke depan tubuh' },
  posterior: { axis: 'depth', sign: -1, label: 'Posterior', icon: '⤓', hint: 'ke belakang tubuh' },
};
export const PAD_DIRS = DIRS;
export const ROTATIONS = {
  probe: [
    ['rotate', 'Putar probe', 'Memutar probe pada sumbunya (penanda probe ikut berputar). Titik kontak tetap.'],
    ['heelToe', 'Miring depan–belakang', 'Heel–toe: memiringkan probe searah bidang citra. Titik kontak tetap.'],
    ['rock', 'Miring ke samping', 'Rock/fan: memiringkan probe keluar dari bidang citra. Titik kontak tetap.'],
  ],
  plane: [
    ['pitch', 'Angguk', 'Pitch: memutar bidang pada sumbu kiri–kanan pasien.'],
    ['yaw', 'Geleng', 'Yaw: memutar bidang pada sumbu kepala–kaki pasien.'],
    ['roll', 'Guling', 'Roll: memutar bidang pada sumbu depan–belakang pasien.'],
  ],
};
const PRESETS = {
  probe: { main: [['transverse', 'Transversal'], ['longitudinal', 'Longitudinal']], more: [['obliqueR', 'Oblik 45°'], ['obliqueL', 'Oblik −45°'], ['perpendicular', 'Tegak lurus kulit']] },
  plane: { main: [['axial', 'Aksial'], ['coronal', 'Koronal'], ['sagittal', 'Sagital']], more: [['oblique', 'Oblik']] },
};
const TITLES = { probe: 'Gerakkan probe', plane: 'Gerakkan bidang CT', tri: 'Pindahkan titik silang CT' };

/** Press-and-hold repeat (first step immediately, then every 110 ms after a short delay). */
function holdRepeat(btn, fn) {
  let t1 = 0, t2 = 0;
  const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = 0; };
  btn.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; e.preventDefault(); fn(); t1 = setTimeout(() => { t2 = setInterval(fn, 110); }, 380); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) btn.addEventListener(ev, stop);
  btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
}

/**
 * Build the pad for a target kind. ctx: {el, kind, steps:{mm,deg}, actions:{move(dir), rotate(key, sign), preset(k),
 * setStep(kind, v), hover(dir|null), slice(key, mm), sliceRange(key) -> {min,max,value}, readout()}, values()}
 */
export function buildPad(root, ctx) {
  const { el, kind, actions } = ctx;
  root.dataset.kind = kind;
  const dirBtn = (k, extra = '') => {
    const d = DIRS[k];
    const b = el('button', { type: 'button', class: 'pad-btn ' + extra, 'data-testid': 'pad-' + k, title: `${d.label}: ${d.hint}`, 'aria-label': `${d.label} (${d.hint})` },
      el('span', { class: 'pad-ico', 'aria-hidden': 'true' }, d.icon), el('span', { class: 'pad-lbl' }, d.label));
    holdRepeat(b, () => actions.move(k));
    b.addEventListener('pointerenter', () => actions.hover(k)); b.addEventListener('pointerleave', () => actions.hover(null));
    b.addEventListener('focus', () => actions.hover(k)); b.addEventListener('blur', () => actions.hover(null));
    return b;
  };
  const stepSel = el('select', { class: 'pad-step', 'data-testid': 'pad-step', 'aria-label': 'Besar langkah', title: 'Besar langkah tiap klik', onchange: (e) => actions.setStep('mm', Number(e.target.value)) },
    ...[1, 2, 5, 10, 25].map((v) => el('option', { value: v, selected: v === ctx.steps.mm || undefined }, `${v} mm`)));
  const readout = el('output', { class: 'pad-readout', 'data-testid': 'pad-readout', 'aria-live': 'polite' });
  const kids = [
    el('div', { class: 'pad-head' }, el('b', { class: 'pad-title', 'data-testid': 'pad-title' }, TITLES[kind]),
      el('button', { type: 'button', class: 'pad-min', 'data-testid': 'pad-min', 'aria-label': 'Kecilkan/tampilkan pad', title: 'Kecilkan / tampilkan', onclick: () => root.classList.toggle('collapsed') }, '–')),
    el('div', { class: 'pad-body' },
      ...(ctx.extras ? [el('div', { class: 'pad-extras' }, ...ctx.extras())] : []),
      el('div', { class: 'pad-grid' },
        el('span'), dirBtn('superior'), el('span'),
        dirBtn('right'), stepSel, dirBtn('left'),
        el('span'), dirBtn('inferior'), el('span')),
      el('div', { class: 'pad-row' }, dirBtn('anterior', 'wide'), dirBtn('posterior', 'wide')),
      ...(kind === 'probe' && actions.side ? [el('div', { class: 'side-row', role: 'group', 'aria-label': 'Lompat ke sisi tubuh' }, el('span', {}, 'Lompat ke sisi:'),
        ...[['anterior', 'Depan'], ['right', 'Kanan'], ['left', 'Kiri'], ['posterior', 'Belakang']].map(([k, t]) => el('button', { type: 'button', class: 'side-btn', 'data-testid': 'side-' + k, title: 'Pindahkan probe ke permukaan ' + t.toLowerCase() + ' pada ketinggian yang sama', onclick: () => actions.side(k) }, t)))] : []),
      readout,
      ...(kind === 'tri' ? triSliders(ctx) : rotationRows(ctx)),
      ...(kind === 'tri' ? [] : presetRow(ctx))),
  ];
  root.replaceChildren(...kids);
  const update = () => {
    readout.textContent = actions.readout();
    for (const r of root.querySelectorAll('[data-rot]')) r.querySelector('output').textContent = actions.angle(r.dataset.rot);
    for (const s of root.querySelectorAll('[data-slice]')) {
      const g = actions.sliceRange(s.dataset.slice); const inp = s.querySelector('input'), out = s.querySelector('output');
      inp.min = g.min; inp.max = g.max; if (document.activeElement !== inp) inp.value = g.value; out.textContent = `${g.value.toFixed(1)} mm`;
    }
  };
  update();
  return { update, kind };
}

function rotationRows({ el, kind, actions, steps }) {
  const rows = ROTATIONS[kind].map(([k, label, tip]) => {
    const minus = el('button', { type: 'button', class: 'rot-btn', 'data-testid': `rot-${k}-minus`, 'aria-label': `${label} −`, title: tip }, '−');
    const plus = el('button', { type: 'button', class: 'rot-btn', 'data-testid': `rot-${k}-plus`, 'aria-label': `${label} +`, title: tip }, '+');
    holdRepeat(minus, () => actions.rotate(k, -1)); holdRepeat(plus, () => actions.rotate(k, 1));
    return el('div', { class: 'rot-row', 'data-rot': k }, el('span', { class: 'rot-lbl', title: tip }, label, el('i', { class: 'tip', 'aria-hidden': 'true' }, ' ⓘ')), minus, el('output', { class: 'rot-val' }), plus);
  });
  const sel = el('select', { class: 'pad-step', 'data-testid': 'rot-step', 'aria-label': 'Besar langkah sudut', onchange: (e) => actions.setStep('deg', Number(e.target.value)) },
    ...[1, 5, 15].map((v) => el('option', { value: v, selected: v === steps.deg || undefined }, `${v}°`)));
  return [el('div', { class: 'rot-box' }, el('div', { class: 'rot-head' }, el('span', {}, 'Sudut'), sel), ...rows)];
}

function presetRow({ el, kind, actions }) {
  const P = PRESETS[kind];
  return [el('div', { class: 'pad-presets' },
    ...P.main.map(([k, t]) => el('button', { type: 'button', class: 'chipbtn preset', 'data-testid': 'preset-' + k, onclick: () => actions.preset(k) }, t)),
    el('details', { class: 'more' }, el('summary', { 'data-testid': 'preset-more' }, 'Lainnya ▾'),
      el('div', { class: 'more-list' }, ...P.more.map(([k, t]) => el('button', { type: 'button', class: 'chipbtn preset', 'data-testid': 'preset-' + k, onclick: (e) => { actions.preset(k); e.target.closest('details').open = false; } }, t)))))];
}

function triSliders({ el, actions }) {
  return [el('div', { class: 'rot-box' }, el('div', { class: 'rot-head' }, el('span', {}, 'Irisan (geser atau scroll di panel)')),
    ...[['ax', 'Aksial (atas–bawah)'], ['co', 'Koronal (depan–belakang)'], ['sa', 'Sagital (kanan–kiri)']].map(([k, label]) => {
      const inp = el('input', { type: 'range', step: 0.5, 'data-testid': 'slice-' + k, 'aria-label': 'Posisi irisan ' + label });
      inp.addEventListener('input', () => actions.slice(k, Number(inp.value)));
      return el('label', { class: 'slice-row', 'data-slice': k }, el('span', {}, label), inp, el('output'));
    }))];
}
