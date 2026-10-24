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
    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
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
    return this.request('/api/medcoel/agent/submissions?status=antre');
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

  importAdmin(payload) {
    return this.request('/api/medcoel/agent/import', {
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
