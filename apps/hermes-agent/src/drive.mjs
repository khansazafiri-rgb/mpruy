import { DeliveryError, apiFailure } from './delivery-errors.mjs';
export class DriveClient {
  constructor(config, fetcher = fetch) {
    this.clientId = config.driveClientId; this.clientSecret = config.driveClientSecret; this.refreshToken = config.driveRefreshToken;
    this.fetcher = fetcher; this.cachedToken = null; this.cachedUntil = 0; this.refreshing = null;
    this.maxBytes = config.pdfMaxBytes || 50 * 1024 * 1024; this.timeoutMs = config.pdfUploadTimeoutMs || 300_000;
  }
  get configured() { return Boolean(this.clientId && this.clientSecret && this.refreshToken); }
  async accessToken(force = false) {
    if (!this.configured) throw new DeliveryError('Google Drive Hermes belum dikonfigurasi.', { stage: 'Drive', retryAfterMs: 60_000 });
    if (!force && this.cachedToken && this.cachedUntil > Date.now() + 60_000) return this.cachedToken;
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      const body = new URLSearchParams({ client_id: this.clientId, client_secret: this.clientSecret, refresh_token: this.refreshToken, grant_type: 'refresh_token' });
      const res = await this.fetcher('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(20_000) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.access_token) throw apiFailure('Drive token', res.status, data);
      this.cachedToken = data.access_token; this.cachedUntil = Date.now() + Number(data.expires_in || 3000) * 1000; return this.cachedToken;
    })().finally(() => { this.refreshing = null; });
    return this.refreshing;
  }
  async request(url, retry = true) {
    const token = await this.accessToken();
    const res = await this.fetcher(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(this.timeoutMs) });
    if (res.status === 401 && retry) { await res.body?.cancel(); await this.accessToken(true); return this.request(url, false); }
    if (!res.ok) throw apiFailure('Drive', res.status, await res.json().catch(() => ({})));
    return res;
  }
  async openFile(fileId) {
    const base = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`;
    const meta = await (await this.request(base + '?supportsAllDrives=true&fields=id,name,mimeType,size,trashed,capabilities(canDownload)')).json();
    if (meta.trashed || meta.capabilities?.canDownload === false) throw new DeliveryError('PDF Drive tidak dapat diunduh; periksa izin berbagi.', { stage: 'Drive', retryable: false });
    if (meta.mimeType !== 'application/pdf') throw new DeliveryError('File Drive bukan PDF.', { stage: 'Drive', retryable: false });
    if (Number(meta.size) > this.maxBytes) throw new DeliveryError('PDF melebihi batas unggahan Telegram.', { stage: 'Drive', retryable: false });
    const res = await this.request(base + '?alt=media&supportsAllDrives=true');
    if (!res.body) throw new DeliveryError('Google Drive tidak mengembalikan stream.', { stage: 'Drive' });
    return res;
  }
}
