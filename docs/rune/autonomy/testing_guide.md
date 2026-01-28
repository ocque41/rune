# Autonomy Production Testing Guide

This guide details how to verify the Autonomous Agent features in a production environment.

## 1. Prerequisites

- **Admin Access**: You must be logged in as a user with appropriate permissions.
- **Supabase Project**: Ensure your database migrations are applied.

## 2. Triggering an Autonomy Job

You can trigger a job manually using the API. This mimics an external webhook or internal system event.

### Option A: Using Browser Console (Easiest)
1. Log in to your application.
2. Open Chrome DevTools (Cmd+Option+I) -> **Console**.
3. Paste the following code to trigger a test event:

```javascript
await fetch('/api/rune/autonomy/trigger', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    source_type: 'system',
    dedupe_key: `test-trigger-${Date.now()}`,
    payload: {
      message: "Hello from Production Test",
      intent: "health_check"
    }
  })
}).then(r => r.json()).then(console.log);
```

### Option B: Using cURL
You need your Supabase Access Token (JWT). You can grab this from the Authorization header of any network request in DevTools.

```bash
curl -X POST https://your-domain.com/api/rune/autonomy/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_OAUTH_TOKEN" \
  -d '{
    "source_type": "webhook",
    "dedupe_key": "manual-curl-001",
    "payload": {
        "event": "user.signup",
        "email": "test@example.com"
    }
  }'
```

## 3. Verifying Execution

### Step 1: Check the Inspect Tab
1. Navigate to **Autonomy > Inspect** in the dashboard.
2. You should see a new entry in the **Recent Activity** table.
3. Status should move from `PENDING` -> `PROCESSING` -> `COMPLETED`.

### Step 2: Verify Usage Logs
1. In the Inspect tab, verify that the **Token Usage** and **Cost** counters have incremented.
2. If the agent performed tool calls (e.g. searching), these should appear in the expanded Trace view.

### Step 3: Verify Rollups (Optional)
The daily rollup runs on a schedule. You can manually check the `rune_agent_usage_daily_rollup` table in Supabase to see aggregated stats.
