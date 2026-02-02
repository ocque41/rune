#!/usr/bin/env node

const cronUrl = process.env.RUNE_CRON_URL;
const cronSecret = process.env.RUNE_CRON_SECRET;
const intervalMs = Number(process.env.RUNE_CRON_INTERVAL_MS || 60000);

if (!cronUrl) {
  console.error('Missing RUNE_CRON_URL. Example: https://your-app.com/api/cron');
  process.exit(1);
}

async function tick() {
  try {
    const headers = {};
    if (cronSecret) headers['x-rune-cron-secret'] = cronSecret;

    const res = await fetch(cronUrl, { headers, method: 'GET' });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[autonomy-worker] Cron failed: ${res.status} ${text}`);
      return;
    }
    console.log(`[autonomy-worker] Cron ok: ${text}`);
  } catch (err) {
    console.error('[autonomy-worker] Cron error', err);
  }
}

(async () => {
  await tick();
  setInterval(tick, intervalMs);
})();
