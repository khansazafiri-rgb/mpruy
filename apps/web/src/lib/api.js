// Pemanggil endpoint /api/medcoel/* dengan pesan galat berbahasa Indonesia.
import pb from './pb';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data || {};
  }

  // Pesan per field dari validasi server: { loginId: "..." }
  get fields() {
    const out = {};
    Object.entries(this.data || {}).forEach(([k, v]) => {
      if (v && typeof v === 'object' && v.message) out[k] = v.message;
    });
    return out;
  }
}

function friendly(status, message) {
  if (status === 0) return 'Tidak tersambung ke server. Periksa koneksi internetmu lalu coba lagi.';
  if (status === 429) return 'Terlalu banyak percobaan dalam waktu singkat. Tunggu beberapa menit lalu coba lagi.';
  if (status === 401 && (!message || /authorization|token/i.test(message))) return 'Sesi masuk sudah berakhir. Silakan masuk lagi.';
  if (status >= 500 && !message) return 'Server sedang bermasalah. Coba lagi beberapa saat lagi.';
  if (message && /^(Something went wrong|The requested resource)/.test(message)) {
    // PocketBase menjawab begini bila alamat API-nya tidak ada: biasanya server belum dijalankan ulang setelah pembaruan.
    return status === 404 ? 'Fitur ini belum ada di server (server belum diperbarui). Minta pengelola menjalankan ulang PocketBase dengan versi terbaru, lalu muat ulang halaman.' : 'Permintaan belum bisa diproses. Periksa isiannya lalu coba lagi.';
  }
  return message || 'Terjadi kesalahan. Coba lagi.';
}

export async function api(path, { method = 'GET', body, query } = {}) {
  let url = path.startsWith('/') ? path : `/api/medcoel/${path}`;
  if (query) {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    const s = qs.toString();
    if (s) url += (url.includes('?') ? '&' : '?') + s;
  }
  const headers = {};
  if (pb.authStore.token) headers.Authorization = pb.authStore.token;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(pb.buildURL(url), { method, headers, body: payload });
  } catch {
    throw new ApiError(friendly(0), 0);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    if (res.status === 401 && pb.authStore.isValid) pb.authStore.clear();
    const err = new ApiError(friendly(res.status, data?.message), res.status, data?.data);
    err.body = data;
    throw err;
  }
  return data;
}

// Galat dari SDK PocketBase (pb.collection(...)) -> pesan ramah.
export function errorText(err) {
  if (!err) return '';
  if (err instanceof ApiError) return err.message;
  const status = err.status ?? 0;
  const data = err.response?.data || err.data?.data || {};
  const firstField = Object.values(data).find((v) => v && v.message);
  if (status === 400 && firstField) return `${friendly(400, err.response?.message)} (${firstField.message})`;
  return friendly(status, err.response?.message || err.message);
}
