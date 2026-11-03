export class DeliveryError extends Error {
  constructor(message, { stage = 'delivery', retryable = true, retryAfterMs = 0, uncertain = false, status = 0 } = {}) {
    super(message); Object.assign(this, { stage, retryable, retryAfterMs, uncertain, status });
  }
}
export function safeError(error, config = {}) {
  let text = String(error?.message || error || 'Unknown error');
  for (const key of ['telegramToken', 'driveClientSecret', 'driveRefreshToken', 'password']) {
    const secret = config[key]; if (secret) text = text.split(secret).join('[REDACTED]');
  }
  return text.replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot[REDACTED]').replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]').slice(0, 600);
}
export function apiFailure(stage, status, body = {}) {
  const description = body.description || body.error?.message || (typeof body.error === 'string' ? body.error : '') || `HTTP ${status}`;
  const reasons = (body.error?.errors || []).map(e => e.reason);
  return new DeliveryError(`${stage}: ${description}`, { stage, status,
    retryable: status === 408 || status === 429 || status >= 500 || reasons.some(r => /[Rr]ateLimit|quota/.test(r)),
    retryAfterMs: Math.max(0, Number(body.parameters?.retry_after || 0) * 1000) });
}
