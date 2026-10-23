export class DriveClient {
  constructor(config) {
    this.clientId = config.driveClientId;
    this.clientSecret = config.driveClientSecret;
    this.refreshToken = config.driveRefreshToken;
    this.cachedToken = null;
    this.cachedUntil = 0;
  }

  get configured() {
    return Boolean(this.clientId && this.clientSecret && this.refreshToken);
  }

  async accessToken(force = false) {
    if (!this.configured) throw new Error('Google Drive Hermes belum dikonfigurasi.');
    if (!force && this.cachedToken && this.cachedUntil > Date.now() + 60_000) return this.cachedToken;

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: 'refresh_token',
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      throw new Error(`Google Drive token gagal: ${data.error_description || data.error || res.status}`);
    }
    this.cachedToken = data.access_token;
    this.cachedUntil = Date.now() + Number(data.expires_in || 3000) * 1000;
    return this.cachedToken;
  }

  async openFile(fileId, retry = true) {
    const token = await this.accessToken();
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401 && retry) {
      await this.accessToken(true);
      return this.openFile(fileId, false);
    }
    if (!res.ok || !res.body) throw new Error(`Google Drive download gagal: HTTP ${res.status}`);
    return res;
  }
}
