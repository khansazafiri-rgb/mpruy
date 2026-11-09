// Anatomy assistance for the imaging monitor: contours, hover-to-identify, click-to-explain, structure list,
// 2D <-> 3D linking. Identification ALWAYS comes from the dataset's label map sampled on the image grid
// (core/labels.js) — never from pointer guesses or hand-drawn shapes.
import { groupRaster, contourSegments, groupAreas, OUTSIDE_FOV, OUTSIDE_VOLUME } from '../core/labels.js';
import { STRUCTURES, SYSTEMS, UNIDENTIFIED, buildGroups, provenance } from '../edu/structures.js';
import { EDU_REFERENCES } from '../edu/references.js';
import { REFERENCES } from '../sim/references.js';

export const ASSIST_LEVELS = { off: 'Mati', hover: 'Hanya hover', contours: 'Kontur', guided: 'Terpandu', challenge: 'Tantangan' };
const REF = { ...REFERENCES, ...EDU_REFERENCES };

export class Assist {
  /** ctx: {el, monitor, tip, panel, dataset(), labelsAvailable(), link3d(keys|null), isolate3d(key), onSelect(key)} */
  constructor(ctx) { this.ctx = ctx; this.level = 'off'; this.rasters = {}; this.selected = null; this.hover = 0; this.G = buildGroups([]); this.answered = new Set(); }
  setLabels(anatomyLabels) { this.G = buildGroups(anatomyLabels); }
  get enabled() { return this.level !== 'off' && this.ctx.labelsAvailable(); }
  setLevel(level) { this.level = level; this.ctx.panel.hidden = !(level === 'contours' || level === 'guided' || level === 'challenge') || !this.ctx.labelsAvailable(); this.push(); this.renderPanel(); }

  /** New label raster for a monitor panel key ('main' for US/CT, or 'ax'/'co'/'sa'). */
  ingest(key, labels, w, h) {
    const groups = groupRaster(labels, this.G.lut);
    const areas = groupAreas(groups, this.G.keys.length);
    let contours = null; // computed on first use (only when an overlay level draws them)
    const cache = new Map(), cents = new Map();
    const mask = (g) => {
      if (cache.has(g)) return cache.get(g);
      const c = document.createElement('canvas'); c.width = w; c.height = h; const id = c.getContext('2d').createImageData(w, h);
      const col = hex(this.G.byIndex(g)?.color || '#ffffff');
      for (let i = 0; i < groups.length; i++) if (groups[i] === g) { id.data[4 * i] = col[0]; id.data[4 * i + 1] = col[1]; id.data[4 * i + 2] = col[2]; id.data[4 * i + 3] = 255; }
      c.getContext('2d').putImageData(id, 0, 0); cache.set(g, c); return c;
    };
    const centroid = (g) => {
      if (cents.has(g)) return cents.get(g);
      let sx = 0, sy = 0, n = 0; for (let i = 0; i < groups.length; i++) if (groups[i] === g) { sx += i % w; sy += (i / w) | 0; n++; }
      const c = n ? [sx / n + 0.5, sy / n + 0.5] : null; cents.set(g, c); return c;
    };
    this.rasters[key] = { labels, groups, w, h, areas, mask, centroid, get contours() { return (contours ||= contourSegments(groups, w, h, { minArea: 6 })); } };
  }
  clear(keys) { for (const k of keys) delete this.rasters[k]; }

  /** Structures visible in a raster, largest first: [{key, g, area}] */
  visible(key = 'main', minArea = 30) {
    const R = this.rasters[key]; if (!R) return [];
    const out = []; for (let g = 1; g < R.areas.length; g++) if (R.areas[g] >= minArea) out.push({ key: this.G.keyOf(g), g, area: R.areas[g] });
    return out.sort((a, b) => b.area - a.area);
  }
  /** Identify a monitor hit {key, px, py}: {kind: 'structure'|'unidentified'|'outside', ...} */
  identify(hit) {
    if (!hit || hit.outside || hit.key === 'info') return null;
    const R = this.rasters[hit.key === 'us' || hit.key === 'ct' ? 'main' : hit.key]; if (!R) return null;
    const c = Math.floor(hit.px), r = Math.floor(hit.py); if (c < 0 || r < 0 || c >= R.w || r >= R.h) return null;
    const lab = R.labels[r * R.w + c], g = R.groups[r * R.w + c];
    if (lab === OUTSIDE_FOV) return null;
    if (lab === OUTSIDE_VOLUME) return { kind: 'outside', text: 'Di luar cakupan CT/label' };
    if (g > 0) return { kind: 'structure', g, key: this.G.keyOf(g), s: this.G.byIndex(g), labelId: lab };
    return { kind: 'unidentified', labelId: lab, text: UNIDENTIFIED[lab] || 'Tidak teridentifikasi' };
  }
  onHover(hit, ev) {
    const tip = this.ctx.tip;
    if (!this.enabled || !hit) { tip.hidden = true; if (this.hover) { this.hover = 0; this.push(); } return; }
    const id = this.identify(hit);
    if (!id) { tip.hidden = true; if (this.hover) { this.hover = 0; this.push(); } return; }
    const prov = provenance(this.ctx.dataset());
    if (id.kind === 'structure') {
      const hidden = this.level === 'challenge' && !this.answered.has(id.key);
      tip.replaceChildren(...(hidden ? [line('b', '? Struktur tersembunyi'), line('span', 'Mode tantangan: klik untuk menjawab di panel.')] : [
        line('b', `${id.s.nameId} — ${id.s.nameEn}`), line('i', id.s.ta), line('span', `${SYSTEMS[id.s.system] || id.s.system} · ${prov.short}`), line('small', 'Klik untuk penjelasan'),
      ]));
    } else tip.replaceChildren(line('b', id.text), line('span', id.kind === 'unidentified' ? `${prov.short}: tidak ada label organ di sini` : ''));
    const box = tip.parentElement.getBoundingClientRect();
    tip.style.left = Math.min(box.width - 240, ev.clientX - box.left + 14) + 'px'; tip.style.top = Math.max(4, ev.clientY - box.top + 12) + 'px';
    tip.hidden = false;
    const g = id.kind === 'structure' ? id.g : 0; if (g !== this.hover) { this.hover = g; this.push(); }
  }
  onPick(hit) {
    if (!this.enabled) return false;
    const id = this.identify(hit); if (!id) return false;
    if (this.ctx.onAnswer?.(id)) return true; // a learning task consumed the click
    this.select(id.kind === 'structure' ? id.key : null);
    return true;
  }
  select(key) {
    this.selected = key && STRUCTURES[key] ? key : null;
    if (this.level === 'challenge' && key) this.answered.add(key);
    this.ctx.link3d(this.selected ? STRUCTURES[this.selected] : null);
    this.ctx.onSelect?.(this.selected);
    this.push(); this.renderPanel();
  }
  /** 3D -> image: select the structure whose atlas names include `atlasName`, if it is in the current image. */
  selectByAtlasName(atlasName) {
    const key = Object.keys(STRUCTURES).find((k) => STRUCTURES[k].atlas.includes(atlasName));
    if (!key) return { ok: false, reason: 'Struktur ini tidak punya label pada CT sintetis (mis. otot individual, saraf).' };
    const g = this.G.indexOf(key), inImage = Object.values(this.rasters).some((R) => R.areas[g] > 0);
    this.select(key);
    return { ok: true, inImage, key };
  }
  push() {
    const G = this.G, sel = this.selected ? G.indexOf(this.selected) : 0;
    this.ctx.monitor.setOverlay({
      level: this.ctx.labelsAvailable() ? this.level : 'off', rasters: this.rasters, selected: sel, hover: this.hover,
      color: (g) => G.byIndex(g)?.color || '#fff', label: (g) => G.byIndex(g)?.nameId || '',
    });
  }
  renderPanel() {
    const { el, panel } = this.ctx; if (panel.hidden) return;
    if (!this.ctx.labelsAvailable()) { panel.replaceChildren(el('p', { class: 'meta' }, 'Identifikasi dinonaktifkan: data ini tidak memiliki label map yang tervalidasi.')); return; }
    const vis = this.visible(Object.keys(this.rasters).includes('main') ? 'main' : 'ax'), challenge = this.level === 'challenge';
    const kids = [el('h4', {}, challenge ? 'Struktur pada bidang (tersembunyi)' : 'Struktur pada bidang ini'),
      el('ul', { class: 'struct-list', 'data-testid': 'struct-list' }, ...vis.map((v) => {
        const s = STRUCTURES[v.key], shown = !challenge || this.answered.has(v.key);
        return el('li', {}, el('button', { type: 'button', class: 'struct-btn' + (v.key === this.selected ? ' on' : ''), 'data-testid': 'struct-' + v.key, onclick: () => this.select(v.key) },
          el('i', { class: 'swatch', style: `background:${s.color}` }), shown ? s.nameId : '???'));
      }))];
    if (!vis.length) kids.push(el('p', { class: 'meta' }, 'Tidak ada struktur berlabel pada bidang ini.'));
    const off = this.ctx.unavailable?.() || [];
    if (off.length) kids.push(el('p', { class: 'meta unavailable-note', 'data-testid': 'assist-unavailable' }, 'Tidak tersedia di dataset ini (tinjauan lisensi, tidak diganti model lain): ' + off.map((u) => u.nameId).join(', ') + '.'));
    const s = this.selected && STRUCTURES[this.selected];
    if (s) {
      const c = s.card, prov = provenance(this.ctx.dataset());
      const row = (k, t) => (c[k] ? el('div', { class: 'card-row' }, el('b', {}, t), el('span', {}, c[k])) : null);
      kids.push(el('section', { class: 'struct-card', 'data-testid': 'struct-card' },
        el('h5', {}, `${s.nameId}`), el('div', { class: 'meta' }, `${s.nameEn} · ${s.ta}`), el('div', { class: 'meta' }, `${SYSTEMS[s.system] || s.system} · ${prov.short}`),
        s.kind === 'group' ? el('p', { class: 'hint warn' }, 'Label ini adalah kelompok jaringan, bukan satu struktur bernama.') : null,
        row('lokasi', 'Lokasi'), row('hubungan', 'Hubungan'), row('ct', 'Pada CT'), row('usg', 'Pada USG'), row('fisiologi', 'Fisiologi/gerak'), row('klinis', 'Klinis'), row('jebakan', 'Jebakan'),
        el('div', { class: 'row' },
          this.ctx.dataset() === 'atlas' && s.atlas.length ? el('button', { type: 'button', class: 'btn', 'data-testid': 'isolate-3d', onclick: () => this.ctx.isolate3d(this.selected) }, 'Isolasi di 3D') : null,
          this.ctx.dataset() === 'atlas' && s.atlas.length ? el('button', { type: 'button', class: 'btn', 'data-testid': 'restore-3d', onclick: () => this.ctx.restore3d?.() }, 'Kembali ke tampilan semula') : null,
          el('button', { type: 'button', class: 'btn', onclick: () => this.select(null) }, 'Tutup')),
        el('details', { class: 'limits' }, el('summary', {}, 'Sumber & status'), el('ol', { class: 'refs' }, ...(c.refs || []).map((r) => el('li', {}, `[${r}] ${REF[r] || r}`))),
          el('p', { class: 'meta' }, 'Status: draf — perlu tinjauan pendidik klinis. ' + prov.long))));
    }
    panel.replaceChildren(...kids);
  }
}
function line(tag, text) { const e = document.createElement(tag); e.textContent = text; return e; }
function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
