export class MedcoelClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.identity = config.identity;
    this.password = config.password;
    this.token = '';
  }

  async login() {
    const res = await fetch(`${this.baseUrl}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identity: this.identity, password: this.password }),
      signal: AbortSignal.timeout(45000),
    });
    const body = await readJson(res);
    if (!res.ok || !body?.token) throw apiError('MEDCOEL login failed', res, body);
    this.token = body.token;
    return body.record;
  }

  async request(path, options = {}, retry = true) {
    if (!this.token) await this.login();
    const headers = new Headers(options.headers || {});
    headers.set('authorization', this.token);
    if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    // Bound queue reads; preserve existing import mutation/confirmation semantics.
    const signal = options.signal || (!options.method || options.method === 'GET' ? AbortSignal.timeout(45000) : undefined);
    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers, signal });
    if (res.status === 401 && retry) {
      this.token = '';
      await this.login();
      return this.request(path, options, false);
    }
    const body = await readJson(res);
    if (!res.ok) throw apiError(`MEDCOEL ${options.method || 'GET'} ${path} failed`, res, body);
    return body;
  }

  listQueued() {
    return this.listSubmissions('antre');
  }

  // status: antre | menunggu_konfirmasi | diproses | perlu_perbaikan. since (ISO) hanya yang berubah sejak itu.
  listSubmissions(status, since = '') {
    const q = new URLSearchParams({ status });
    if (since) q.set('since', since);
    return this.request(`/api/medcoel/agent/submissions?${q.toString()}`);
  }

  getSubmission(id) {
    return this.request(`/api/medcoel/agent/submissions/${encodeURIComponent(id)}`);
  }

  setStatus(id, status, note = '') {
    return this.request(`/api/medcoel/agent/submissions/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    });
  }

  // Ubah jenis isi ("soal" | "materi") dan/atau mata kuliah (nama, slug, atau id) pengajuan yang belum diimpor.
  // Yang tidak disebut tidak berubah. Balasan: kontrak pengajuan + { retarget: { changed, contentKind, subject } }.
  retargetSubmission(id, { contentKind, subject } = {}) {
    const body = {};
    if (contentKind) body.contentKind = contentKind;
    if (subject) body.subject = subject;
    return this.request(`/api/medcoel/agent/submissions/${encodeURIComponent(id)}/retarget`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Daftar mata kuliah yang tampil di web (tanpa yang disembunyikan): [{ id, name, slug }].
  async listSubjects() {
    const body = await this.request('/api/medcoel/public-subjects');
    return Array.isArray(body?.items) ? body.items : [];
  }

  importSubmission(id, payload) {
    return this.request(`/api/medcoel/agent/submissions/${encodeURIComponent(id)}/import`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  importDrillingSubmission(id, payload) {
    return this.request(`/api/medcoel/agent/submissions/${encodeURIComponent(id)}/drilling-import`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Pengajuan PPT materi: slide + penjelasan masuk sebagai berkas materi di Drilling.
  importDeckSubmission(id, payload) {
    return this.request(`/api/medcoel/agent/submissions/${encodeURIComponent(id)}/materi-import`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

}

async function readJson(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { message: text }; }
}

function apiError(prefix, res, body) {
  const err = new Error(`${prefix}: HTTP ${res.status} ${body?.message || res.statusText}`);
  err.status = res.status;
  err.body = body;
  return err;
}
