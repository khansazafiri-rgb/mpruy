// Mengambil waktu aksi dari stage/plan.js untuk menyelaraskan efek klik: node audio/sfx_times.mjs > audio/sfx_times.json
import { PLAN, CHIPS } from '../stage/plan.js';
const clicks = PLAN.steps.filter((s) => s.kind === 'click').map((s) => s.t0);
const switches = PLAN.steps.filter((s) => s.kind === 'still' && s.t0 > 3).map((s) => s.t0);
console.log(JSON.stringify({ clicks, switches, chips: CHIPS.map((c) => c.t0) }));
