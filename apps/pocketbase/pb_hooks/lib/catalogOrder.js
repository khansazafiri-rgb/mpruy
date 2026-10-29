// Mata kuliah: pilihan pengguna di depan, lalu A-Z. BAB: urutan dari kolom `order` (lihat byOrder).
function byName(a, b) {
  return String(a.name || a.title || '').trim().toLowerCase().localeCompare(String(b.name || b.title || '').trim().toLowerCase());
}
function byPreference(a, b) {
  return Number(!!b.studying) - Number(!!a.studying) || byName(a, b);
}
// BAB mengikuti nomor urut yang diatur admin (kolom `order`); nama hanya pemutus bila nomornya sama.
function byOrder(a, b) {
  return (Number(a.order) || 0) - (Number(b.order) || 0) || byName(a, b);
}
module.exports = { byName, byPreference, byOrder };
