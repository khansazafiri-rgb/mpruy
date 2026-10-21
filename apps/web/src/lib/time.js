// Tanggal dan zona waktu Indonesia. Server menyimpan waktu absolut (UTC);
// tampilan memakai zona yang dipilih (WIB/WITA/WIT).

export const TZ = { WIB: 7, WITA: 8, WIT: 9 };
export const TZ_NAME = { WIB: 'Asia/Jakarta', WITA: 'Asia/Makassar', WIT: 'Asia/Jayapura' };
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function parse(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const str = String(s);
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

// Zona pengguna dari browser, untuk pilihan awal.
export function guessTz() {
  const off = -new Date().getTimezoneOffset() / 60;
  if (off === 8) return 'WITA';
  if (off === 9) return 'WIT';
  return 'WIB';
}

function shifted(d, tz) {
  return new Date(d.getTime() + (TZ[tz] ?? 7) * 3600000);
}

const pad = (n) => String(n).padStart(2, '0');

export function fmtDate(s, tz = 'WIB', { long = false, weekday = false } = {}) {
  const d = parse(s);
  if (!d) return '-';
  const t = shifted(d, tz);
  const base = `${t.getUTCDate()} ${(long ? BULAN_PANJANG : BULAN)[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
  return weekday ? `${HARI[t.getUTCDay()]}, ${base}` : base;
}

export function fmtTime(s, tz = 'WIB') {
  const d = parse(s);
  if (!d) return '';
  const t = shifted(d, tz);
  return `${pad(t.getUTCHours())}.${pad(t.getUTCMinutes())}`;
}

export function fmtDateTime(s, tz = 'WIB', opts) {
  const d = parse(s);
  if (!d) return '-';
  return `${fmtDate(d, tz, opts)}, ${fmtTime(d, tz)} ${tz}`;
}

// "2026-11-03" + "08:00" di zona tz -> Date (UTC)
export function fromLocal(dateStr, timeStr, tz) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - (TZ[tz] ?? 7) * 3600000);
}

// Date -> { date: "YYYY-MM-DD", time: "HH:MM" } di zona tz
export function toLocalParts(s, tz) {
  const d = parse(s);
  if (!d) return { date: '', time: '' };
  const t = shifted(d, tz);
  return {
    date: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`,
    time: `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`,
  };
}

export function localDay(s, tz = 'WIB') {
  return toLocalParts(s, tz).date;
}

// Selisih hari kalender (di zona tz) dari hari ini ke tanggal s.
export function daysUntil(s, tz = 'WIB') {
  const a = localDay(new Date(), tz);
  const b = localDay(s, tz);
  if (!a || !b) return null;
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

export function countdownParts(target) {
  const d = parse(target);
  if (!d) return null;
  let ms = Math.max(0, d.getTime() - Date.now());
  const days = Math.floor(ms / 86400000); ms -= days * 86400000;
  const hours = Math.floor(ms / 3600000); ms -= hours * 3600000;
  const minutes = Math.floor(ms / 60000); ms -= minutes * 60000;
  const seconds = Math.floor(ms / 1000);
  return { days, hours, minutes, seconds, done: d.getTime() <= Date.now() };
}

export function relative(s) {
  const d = parse(s);
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`;
  return fmtDate(d);
}

export function duration(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h} j ${m} m`;
  if (m) return `${m} m ${r} d`;
  return `${r} d`;
}

export function clock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}
