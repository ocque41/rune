# Testing Agent Autonomy in Production: Step-by-Step Guide

This guide describes how to trigger an Autonomy event in the production environment and verify its execution and usage logging.

## Prerequisites

1.  **Authentication**: You need an active session (Cookie/Bearer) or an HMAC Signature for the endpoint.
    *   *Simplest method*: Log in to the app in your browser to get the cookie, then use the browser console or a tool like Postman that shares cookies.
2.  **Permissions**: Your user must have a valid Plan (Free/Pro) to execute agents.

## Step 1: Trigger an Autonomy Event

We will simulate an incoming event (like a webhook) using the `/api/rune/autonomy/trigger` endpoint.

### Option A: Via Browser Console (Easiest)
1.  Navigate to your deployed app (e.g., `rune.app/autonomy`).
2.  Open **Developer Tools** (F12) -> **Console**.
3.  Paste and run the following code:

```javascript
fetch('/api/rune/autonomy/trigger', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    source_type: 'webhook',
    dedupe_key: `test-event-${Date.now()}`, // Unique key
    payload: {
      message: "Please triage this test issue: The system is reporting high latency.",
      severity: "high"
    }
  })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
```

### Option B: Via Curl (Requires Auth Token)
If you have an `access_token` (JWT):

```bash
curl -X POST https://your-app-url.com/api/rune/autonomy/trigger \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "webhook",
    "dedupe_key": "test-CLI-001",
    "payload": {
        "message": "Analyze usage trends for the last 24 hours."
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "deduplicated": false,
  "event_id": "abc-123-...",
  "status": "pending"
}
```

## Step 2: Verify Execution (Logs)

Once the event is triggered, the Autonomy Engine (Service) picks it up.

1.  Go to **Autonomy Dashboard** > **Jobs**.
2.  You should see a new Job appear in the list with status `planning` or `running`.
3.  Click on the Job to view its logs. You should see:
    *   **Triage**: AI analyzing the payload.
    *   **Planning**: AI creating steps.
    *   **Execution**: Agent running tools.

## Step 3: Verify Usage Logging (Inspect Tab)

Now, verify that the usage was correctly instrumented and logged.

1.  Navigate to **Autonomy Dashboard** > **Inspect**.
2.  Check the **Overview Cards**:
    *   "Requests" should have incremented.
    *   "Total Tokens" should reflect the usage of the Triage/Plan/Execute calls.
    *   "Estimated Cost" should show a small value (e.g., $0.0002).
3.  Check **Recent Activity**:
    *   Refresh the table.
    *   You should see entries for `autonomy_triage`, `autonomy_plan`, and `autonomy_execute`.
    *   Verify the Status is `success`.

## Troubleshooting

-   **"Unauthorized"**: Ensure you are logged in or using a valid token/signature.
-   **No Job Created**: Check Supabase logs for Database errors (RLS or Constraint violations).
-   **No Usage Logged**: usage events are logged *asynchronously*. Wait 5-10 seconds and refresh the Inspect tab.
