# Rune Autonomy Product Specification

> **Version**: 1.0 Draft  
> **Created**: 2026-01-27  
> **Author**: AI Agent  
> **Status**: Awaiting Review

---

## Purpose

Enable Rune agents to operate autonomously based on incoming events, scheduled checks, and workflow completions—even when the user is offline. All autonomous actions are **opt-in**, **policy-driven**, and **fully auditable**.

---

## Autonomy Modes

Each workflow (or user default) operates in one of three modes:

| Mode | Behavior | Use Case |
|------|----------|----------|
| **OFF** | No autonomous execution. Events are logged but agent does not act. | Development, testing, or workflows requiring manual triggers only |
| **CONFIRM** | Agent proposes actions but waits for explicit user approval before executing. | Production workflows with high-impact tools (payments, emails, data mutations) |
| **AUTONOMOUS** | Agent executes allowed actions immediately. High-impact tools still require approval unless in allowlist. | Low-risk automation, monitoring, data collection |

> [!IMPORTANT]  
> Default mode is **OFF**. Users must explicitly enable CONFIRM or AUTONOMOUS.

---

## Policy Scope

Policies can be set at multiple levels with inheritance:

```
System Defaults → User Defaults → Workflow-Specific → Node-Specific
```

| Level | Description | Override |
|-------|-------------|----------|
| **System** | Platform-wide defaults (OFF, conservative budgets) | No |
| **User Default** | User's global preferences for all workflows | Yes |
| **Workflow** | Per-workflow settings override user defaults | Yes |
| **Node** (future) | Per-node overrides for specific agent nodes | Yes |

### Policy Fields

```typescript
interface AutonomyPolicy {
  // Mode
  mode: 'OFF' | 'CONFIRM' | 'AUTONOMOUS';
  
  // Budgets
  maxActionsPerHour: number;       // Default: 10
  maxActionsPerDay: number;        // Default: 50
  maxTokensPerHour: number;        // Default: 100,000
  maxTokensPerDay: number;         // Default: 500,000
  maxParallelJobs: number;         // Default: 3
  
  // Tool Control
  toolAllowlist: string[];         // Tools allowed in AUTONOMOUS mode
  toolBlocklist: string[];         // Always require confirmation
  
  // Triggers
  triggersEnabled: {
    webhook: boolean;              // Default: true
    schedule: boolean;             // Default: true  
    runCompletion: boolean;        // Default: true
    manualOnly: boolean;           // Default: false
  };
  
  // Schedule (optional)
  cronSchedule?: string;           // e.g., "0 9 * * *" (daily at 9am)
  
  // Notification
  notifyOnSuccess: boolean;        // Default: false
  notifyOnFailure: boolean;        // Default: true
  notifyOnApprovalNeeded: boolean; // Default: true
}
```

---

## Budget Enforcement

### Action Budget
- Counts per successful tool execution
- Reset hourly and daily (UTC)
- When limit reached, agent enters CONFIRM mode for remaining period

### Token Budget
- Sum of input + output tokens across all Gemini calls
- Helps control costs
- Soft limit: warn at 80%, hard limit: stop at 100%

### Parallel Job Limit
- Max concurrent agent jobs per user
- Prevents runaway execution
- New events queue until slot available

### Enforcement Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Incoming Event                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  Check Mode      │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │ OFF              │ CONFIRM          │ AUTONOMOUS
          ▼                  ▼                  ▼
     Log & Exit        ┌─────────────┐    ┌─────────────┐
                       │ Check       │    │ Check       │
                       │ Budgets     │    │ Budgets     │
                       └──────┬──────┘    └──────┬──────┘
                              │                  │
                              ▼                  ▼
                       ┌─────────────┐    ┌─────────────┐
                       │ Run Triage  │    │ Run Triage  │
                       └──────┬──────┘    └──────┬──────┘
                              │                  │
                       ┌──────┴──────┐    ┌──────┴──────┐
                       │ Propose     │    │ Tool in     │
                       │ Actions     │    │ Allowlist?  │
                       └──────┬──────┘    └──────┬──────┘
                              │                  │
                              ▼            ┌─────┴─────┐
                       ┌─────────────┐     │ Yes       │ No
                       │ Wait for   │     ▼           ▼
                       │ Approval   │   Execute    Request
                       └─────────────┘              Approval
```

---

## Triggers

### 1. Webhook Triggers
External systems can trigger agent analysis via webhook:

```
POST /api/rune/autonomy/trigger/{workflow_id}
Authorization: Bearer {webhook_secret}

{
  "source": "github",
  "event_type": "push",
  "payload": { ... }
}
```

**Deduplication**: Events include a `dedupe_key` to prevent duplicate processing.

### 2. Schedule Triggers
Periodic checks via cron:

```sql
-- Supabase Cron job (runs every 15 minutes)
SELECT cron.schedule(
  'rune-autonomy-check',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      'https://app.rune.ai/api/autonomy/scheduled-check',
      '{}',
      headers := '{"Authorization": "Bearer {internal_secret}"}'
    );
  $$
);
```

### 3. Run Completion Triggers
When a workflow run completes, optionally emit event for agent analysis:

```typescript
// Post-run hook
if (policy.triggersEnabled.runCompletion) {
  await emitAutonomyEvent({
    userId: run.userId,
    workflowId: run.workflowId,
    sourceType: 'system',
    payload: {
      type: 'run_completed',
      runId: run.id,
      status: run.status,
      summary: generateRunSummary(run),
    },
    dedupeKey: `run-complete-${run.id}`,
  });
}
```

---

## Offline Approval Routing

When user is offline and action requires approval:

### In-App Approval Queue

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Pending Approvals                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⏳ Email Campaign Draft                                       │
│     Workflow: Marketing Automation                             │
│     Proposed: "Send follow-up to 150 subscribers"              │
│     Requested: 2 hours ago                                     │
│                                                                 │
│     [ Approve ]  [ Reject ]  [ View Details ]                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ⏳ Database Backup                                            │
│     Workflow: Nightly Operations                               │
│     Proposed: "Execute backup to S3"                           │
│     Requested: 45 minutes ago                                  │
│                                                                 │
│     [ Approve ]  [ Reject ]  [ View Details ]                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Email Notification

When approval is needed, send notification with one-click action links:

```
Subject: [Rune] Action requires your approval

Workflow: Marketing Automation
Proposed Action: Send follow-up email to 150 subscribers

The agent wants to execute the following:
- Tool: send_email_campaign
- Recipients: 150 subscribers
- Subject: "Quick follow-up on your demo"

[Approve] [Reject] [View in Rune]

---
This approval request expires in 24 hours.
If you don't respond, no action will be taken.
```

**Email Link Security:**
- Signed URLs with HMAC
- Short expiration (24h)
- Single-use tokens
- Audit logged

### Magic Link Pattern

```typescript
// Generate approval link
const token = signApprovalToken(jobId, userId, 'approve', { expiresIn: '24h' });
const approveUrl = `https://app.rune.ai/api/autonomy/approve/${token}`;

// Verify on click
const { jobId, action, userId, exp } = verifyApprovalToken(token);
if (Date.now() > exp * 1000) {
  return new Response('Link expired', { status: 410 });
}
```

---

## Data Model Overview

### rune_agent_events
Incoming events queue with deduplication.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| created_at | TIMESTAMPTZ | Event received time |
| user_id | UUID | Owner (FK to auth.users) |
| workflow_id | UUID | Target workflow (optional) |
| source_type | TEXT | 'webhook' | 'schedule' | 'system' |
| payload | JSONB | Event data (compact) |
| dedupe_key | TEXT (UNIQUE) | Idempotency key |
| status | TEXT | 'pending' | 'processing' | 'processed' | 'failed' |
| processed_at | TIMESTAMPTZ | When processing completed |

### rune_autonomy_policies
User and workflow autonomy settings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner |
| workflow_id | UUID | NULL for user default |
| policy | JSONB | Full policy object |
| created_at | TIMESTAMPTZ | Created time |
| updated_at | TIMESTAMPTZ | Last modified |

**Constraint**: UNIQUE(user_id, workflow_id)

### rune_agent_jobs
Active and historical job tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| created_at | TIMESTAMPTZ | Job created |
| user_id | UUID | Owner |
| workflow_id | UUID | Target workflow |
| event_id | UUID | Source event (FK) |
| status | TEXT | 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled' |
| triage_result | JSONB | First-stage classification |
| plan | JSONB | Proposed actions |
| actions_taken | JSONB[] | Executed steps |
| tokens_used | INTEGER | Total tokens consumed |
| error | TEXT | Failure reason if any |
| completed_at | TIMESTAMPTZ | When job finished |

### rune_agent_decisions (Audit)
Detailed audit trail for every decision.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| created_at | TIMESTAMPTZ | Decision time |
| job_id | UUID | Parent job |
| decision_type | TEXT | 'triage' | 'tool_call' | 'approval_request' | 'approval_response' |
| input_summary | JSONB | What was considered |
| output_summary | JSONB | What was decided |
| model_used | TEXT | Model ID |
| tokens_in | INTEGER | Input tokens |
| tokens_out | INTEGER | Output tokens |
| duration_ms | INTEGER | Processing time |

---

## Decision Engine

### Two-Stage Pipeline

**Stage 1: Triage (Fast, Cheap)**
- Model: Gemini Flash
- Purpose: Classify event into NOOP / SUGGEST / ACT
- No tool calls, just analysis
- Response time target: < 2s

```typescript
const triageResult = await gemini.generate({
  model: 'gemini-2.0-flash',
  temperature: 0,
  systemPrompt: TRIAGE_SYSTEM_PROMPT,
  userMessage: formatEventForTriage(event),
  responseSchema: {
    classification: 'NOOP' | 'SUGGEST' | 'ACT',
    confidence: number,
    reasoning: string,
    suggestedActions?: string[],
  },
});
```

**Stage 2: Planning (If ACT or SUGGEST)**
- Model: Gemini Pro
- Purpose: Generate detailed action plan
- May include tool calls
- Subject to budget checks

### Safety Checks Before Execution

1. **Mode Check**: Is autonomy enabled?
2. **Budget Check**: Within action/token limits?
3. **Tool Allowlist**: Is tool permitted?
4. **Idempotency Check**: Already executed this action?
5. **Rate Limit Check**: Respecting external API limits?
6. **Approval Required?**: Does tool policy require confirmation?

---

## User Review Required

> [!WARNING]
> **Breaking Change**: Users must explicitly enable autonomy for any workflow. Existing workflows default to OFF.

> [!IMPORTANT]
> **Email Configuration**: Transactional email (Resend) required for offline approval notifications.

### Open Questions

1. **Approval Expiration**: 24 hours reasonable default? Should it be configurable?

2. **Budget Reset Timing**: UTC midnight reset vs. rolling 24-hour window?

3. **Email Frequency**: Batch notifications or immediate? Hourly digest option?

4. **Parallel Limit Scope**: Per-user or per-workflow?

---

## Verification Plan

### Automated Tests

1. **Policy Enforcement**
   - OFF mode blocks all autonomous execution
   - CONFIRM mode creates approval requests
   - AUTONOMOUS mode executes allowed tools

2. **Budget Limits**
   - Action budget stops at limit
   - Token budget prevents expensive operations
   - Parallel limit queues excess jobs

3. **Idempotency**
   - Duplicate events deduplicated
   - Retry-safe tool execution
   - No double-execution on webhook replay

4. **Approval Flow**
   - Approval tokens are single-use
   - Expired tokens rejected
   - Audit trail complete

### Manual Verification

1. **End-to-end webhook trigger**
   - Send test webhook → verify event logged → verify triage → verify action proposed

2. **Scheduled check**
   - Wait for cron tick → verify check executed → verify job created if applicable

3. **Offline approval**
   - Trigger action while logged out → receive email → approve via link → verify execution

4. **Budget exhaustion**
   - Execute many actions → hit limit → verify mode switches to CONFIRM

---

## Proposed Changes Summary

### New Files
- `app/api/rune/autonomy/trigger/[workflowId]/route.ts` - Webhook endpoint
- `app/api/rune/autonomy/scheduled-check/route.ts` - Cron handler
- `app/api/rune/autonomy/approve/[token]/route.ts` - Magic link handler
- `app/actions/autonomy-policy.ts` - Policy CRUD
- `lib/autonomy/decision-engine.ts` - Triage + planning
- `lib/autonomy/execution-engine.ts` - Durable execution
- `components/autonomy/policy-editor.tsx` - UI controls
- `components/autonomy/approval-queue.tsx` - Pending approvals

### Database Migrations
- `rune_agent_events` table
- `rune_autonomy_policies` table
- `rune_agent_jobs` table
- `rune_agent_decisions` table
- RLS policies for all above
- Indexes for query performance

---

*Specification draft v1.0 - Ready for review*
