export class TelegramClient {
  constructor(config) {
    this.token = config.telegramToken;
    this.api = `https://api.telegram.org/bot${this.token}`;
  }

  async call(method, body = {}) {
    const res = await fetch(`${this.api}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(`Telegram ${method} failed: ${data.description || res.statusText}`);
    return data.result;
  }

  getUpdates(offset, timeout) {
    return this.call('getUpdates', {
      offset,
      timeout,
      allowed_updates: ['message', 'callback_query'],
    });
  }

  sendMessage(chatId, text, extra = {}) {
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extra,
    });
  }

  answerCallbackQuery(id, text = '') {
    return this.call('answerCallbackQuery', { callback_query_id: id, text, show_alert: false });
  }

  async getFile(fileId) {
    return this.call('getFile', { file_id: fileId });
  }

  async downloadFile(fileId, maxBytes) {
    const meta = await this.getFile(fileId);
    if (meta.file_size && meta.file_size > maxBytes) throw new Error(`File terlalu besar (${meta.file_size} bytes)`);
    const res = await fetch(`https://api.telegram.org/file/bot${this.token}/${meta.file_path}`);
    if (!res.ok) throw new Error(`Telegram file download failed: HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error(`File terlalu besar (${bytes.byteLength} bytes)`);
    return bytes;
  }
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
