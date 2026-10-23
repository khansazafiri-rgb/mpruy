// Data kasus Simulasi Dokter yang perlu diketahui server: judul dan diagnosis
// yang tepat. Harus sama dengan apps/web/src/features/simulasi/data/cases.js
// (diuji di test/api.test.mjs dan engine.test.mjs).
const CASES = {
  umum: { title: "Pak Slamet, 68 tahun · Poli umum", dxOk: "pneumonia" },
  bedah: { title: "Pak Dimas, 42 tahun · Poli bedah", dxOk: "apendisitis" },
  spog: { title: "Bu Sari, 29 tahun · Poli kandungan", dxOk: "peb" },
  anak: { title: "Raka, 8 tahun · Poli anak", dxOk: "tonsilofaringitis" },
  dalam: { title: "Bu Rukmini, 72 tahun · Poli penyakit dalam", dxOk: "gagaljantung" },
};

function clampInt(v, lo, hi) {
  const n = Math.round(Number(v));
  if (!isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function serialize(r) {
  return {
    id: r.id,
    caseKey: r.getString("caseKey"),
    caseTitle: r.getString("caseTitle"),
    dxKey: r.getString("dxKey"),
    dxOk: r.getBool("dxOk"),
    score: r.getInt("score"),
    durationSec: r.getInt("durationSec"),
    mode: r.getString("mode"),
    timeout: r.getBool("timeout"),
    actionsCount: r.getInt("actionsCount"),
    keyDone: r.getInt("keyDone"),
    keyTotal: r.getInt("keyTotal"),
    created: r.getString("created"),
  };
}

module.exports = { CASES, clampInt, serialize };
