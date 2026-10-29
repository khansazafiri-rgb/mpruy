function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Missing required env ${name}`);
  return value;
}

function integer(name, fallback, min = 1) {
  const raw = String(process.env[name] || '').trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min) throw new Error(`Invalid ${name}`);
  return value;
}

function optional(name) {
  return String(process.env[name] || '').trim();
}

export function loadConfig() {
  const baseUrl = required('MEDCOEL_API_BASE_URL').replace(/\/+$/, '');
  const admins = required('TELEGRAM_ADMIN_IDS')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  if (!admins.every((v) => /^\d+$/.test(v))) {
    throw new Error('TELEGRAM_ADMIN_IDS must contain numeric Telegram user IDs');
  }

  return {
    baseUrl,
    identity: required('MEDCOEL_AGENT_IDENTITY'),
    password: required('MEDCOEL_AGENT_PASSWORD'),
    telegramToken: required('TELEGRAM_BOT_TOKEN'),
    telegramApiBase: optional('TELEGRAM_API_BASE').replace(/\/+$/, ''),
    telegramAdmins: new Set(admins),
    queuePollMs: integer('HERMES_QUEUE_POLL_MS', 15000, 5000),
    telegramLongPollSeconds: integer('HERMES_TELEGRAM_LONG_POLL_SECONDS', 25, 1),
    stateDir: String(process.env.HERMES_STATE_DIR || './data').trim() || './data',
    maxJsonBytes: integer('HERMES_MAX_JSON_BYTES', 5 * 1024 * 1024, 1024),
    notifyWaiting: String(process.env.HERMES_NOTIFY_WAITING ?? 'true').trim().toLowerCase() !== 'false',
    waitingLookbackHours: integer('HERMES_WAITING_LOOKBACK_HOURS', 72, 1),
    pasteTtlMs: integer('HERMES_PASTE_TTL_MINUTES', 30, 1) * 60 * 1000,
    driveClientId: optional('GDRIVE_CLIENT_ID'),
    driveClientSecret: optional('GDRIVE_CLIENT_SECRET'),
    driveRefreshToken: optional('GDRIVE_REFRESH_TOKEN'),
  };
}
