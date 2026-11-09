// Mode bar + context strip over the 3D view: choose WHAT to change, then one gesture changes only that.
import { CONTROL_MODES, ANGLES, ORIENTATION_PRESETS, SIDES, STEPS_MM, STEPS_DEG } from './axisControl.js';

const ICON = { place: '⌖', vertical: '↕', horizontal: '↔', depth: '⇅', rotate: '⟳', camera: '🎥' };
const AXIS_COLOR = { vertical: '#2563eb', horizontal: '#dc2626', depth: '#059669' };
export const axisColor = (mode) => AXIS_COLOR[mode];

/** Build the static mode bar once. */
export function buildModeBar(root, { el, onMode }) {
  root.replaceChildren(...Object.entries(CONTROL_MODES).map(([k, m]) => el('button', {
    type: 'button', class: 'mode-btn mode-' + k, 'data-ctl': k, 'data-testid': 'ctl-' + k, 'aria-pressed': 'false',
    title: `${m.label} — ${m.hint} (tombol ${m.key})`, onclick: () => onMode(k),
  }, el('span', { class: 'mode-ico', 'aria-hidden': 'true' }, ICON[k]), el('span', {}, m.label))));
}

/** Re-render the context strip for the active mode. ctx: {S, el, actions, readout} */
export function renderContext(root, ctx) {
  const { S, el, actions } = ctx, m = S.ctl.mode, def = CONTROL_MODES[m], free = S.mode === 'free';
  for (const b of document.querySelectorAll('[data-ctl]')) b.setAttribute('aria-pressed', String(b.dataset.ctl === m));
  const kids = [];
  const stepSel = (deg) => el('select', { class: 'step-sel', 'aria-label': 'Besar langkah', 'data-testid': 'ctl-step', onchange: (e) => actions.setStep(deg, Number(e.target.value)) },
    ...(deg ? STEPS_DEG : STEPS_MM).map((v) => el('option', { value: v, selected: v === (deg ? S.ctl.stepDeg : S.ctl.stepMM) || undefined }, `${v} ${deg ? '°' : 'mm'}`)));
  const nudge = (sign, text) => el('button', { type: 'button', class: 'nudge', 'data-testid': sign > 0 ? 'ctl-plus' : 'ctl-minus', onclick: () => actions.nudge(sign) }, text);
  const readout = el('output', { class: 'ctl-readout', 'data-testid': 'ctl-readout', 'aria-live': 'polite' }, ctx.readout());
  if (m === 'vertical' || m === 'horizontal' || (m === 'depth' && free)) {
    kids.push(el('span', { class: 'ctl-dot', style: `background:${AXIS_COLOR[m]}` }), nudge(-1, '− ' + def.minus), readout, nudge(1, '+ ' + def.plus), stepSel(false),
      el('span', { class: 'ctl-hint' }, free ? 'Bidang CT bergerak bebas pada sumbu pasien.' : 'Probe meluncur di kulit; sudut tidak berubah.'));
  } else if (m === 'depth') {
    kids.push(el('span', { class: 'ctl-hint strong' }, 'Pilih sisi tubuh:'), ...Object.entries(SIDES).map(([k, sd]) => el('button', { type: 'button', class: 'chipbtn', 'data-testid': 'side-' + k, onclick: () => actions.selectSide(k) }, sd.label)),
      el('span', { class: 'ctl-hint' }, 'Probe klinis tidak menembus tubuh: depan/belakang adalah pilihan permukaan.'));
  } else if (m === 'rotate') {
    const presets = ORIENTATION_PRESETS[free ? 'free' : 'clinical'], params = ANGLES[free ? 'free' : 'clinical'], cur = free ? S.ctl.angleFree : S.ctl.angleClinical;
    kids.push(...Object.entries(presets).map(([k, p]) => el('button', { type: 'button', class: 'chipbtn preset', 'data-testid': 'preset-' + k, onclick: () => actions.preset(k) }, p.label)),
      el('span', { class: 'sep' }),
      el('div', { class: 'seg small', role: 'group', 'aria-label': 'Sudut yang diubah' }, ...Object.entries(params).map(([k, t]) => el('button', { type: 'button', 'data-testid': 'angle-' + k, 'aria-pressed': String(k === cur), title: t, onclick: () => actions.setAngle(k) }, t.split(' (')[0]))),
      nudge(-1, '−'), readout, nudge(1, '+'), stepSel(true));
  } else if (m === 'camera') {
    kids.push(el('span', { class: 'ctl-hint strong' }, 'Seret: putar · Shift+seret: geser · scroll: zoom. Arah pandang cepat ada di bilah bawah kanan.'));
  } else {
    kids.push(el('span', { class: 'ctl-hint strong' }, S.tool === 'stethoscope' ? 'Klik kulit atau titik berwarna untuk meletakkan stetoskop.' : free ? 'Free 3D: pilih ↕ ↔ ⇅ atau ⟳ untuk menggerakkan bidang.' : 'Klik kulit untuk meletakkan probe · seret probe untuk menggeser.'));
  }
  kids.push(el('span', { class: 'ctl-mode-hint' }, def.hint));
  root.replaceChildren(...kids);
}
