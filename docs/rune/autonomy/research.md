# Rune Autonomy Research Document

> **Research Phase**: Completed 2026-01-27  
> **Sources**: Workflow DevKit, Gemini API, Supabase, Vercel Documentation  
> **Purpose**: Inform architecture decisions for background autonomous agents

---

## Executive Summary

This document synthesizes research from official documentation to inform the design of Rune's autonomous agent system. The key findings enable a durable, auditable, and policy-driven autonomy layer.

---

## A. Durable Agents: Pause/Resume, Scheduling, Human-in-the-Loop

### Source: Workflow DevKit Documentation

#### DurableAgent Class
> "The DurableAgent class enables you to create AI-powered agents that can maintain state across workflow steps, call tools, and gracefully handle interruptions and resumptions."
> 
> — [DurableAgent API Reference](https://useworkflow.dev/docs/api-reference/workflow-ai/durable-agent)

**Key Features:**
- **Durable Execution**: Agents can be interrupted and resumed without losing state
- **Flexible Tool Implementation**: Tools can be workflow steps (with retries) or workflow-level logic
- **Workflow Native**: Fully integrated with Workflow DevKit for production-grade reliability
- **maxSteps Control**: Default unlimited - set a value to limit LLM calls

#### Sleep and Scheduling
> "AI agents sometimes need to pause execution in order to schedule recurring or future actions, wait before retrying an operation (e.g. for rate limiting), or wait for external state to be available."
>
> "Workflow operation that suspend will survive restarts, new deploys, and infrastructure changes, independent of whether the suspense takes seconds or months."
>
> — [Sleep and Delays](https://useworkflow.dev/docs/ai/sleep-and-delays)

**Pattern: Sleep Tool**
```typescript
import { sleep } from "workflow";

async function executeSleep({ durationMs }: { durationMs: number }) {
  // Note: No "use step" here - sleep is a workflow-level function
  await sleep(durationMs);
  return { message: `Slept for ${durationMs}ms` };
}
```

> ⚠️ **Critical**: `sleep()` must be called from workflow context, NOT from within a step.

#### Human-in-the-Loop Pattern
> "Workflow DevKit's webhook and hook primitives enable 'human-in-the-loop' patterns where workflows pause until a human takes action, allowing smooth resumption of workflows even after days of inactivity, and provides stability across code deployments."
>
> — [Human-in-the-Loop](https://useworkflow.dev/docs/ai/human-in-the-loop)

**Implementation Pattern:**
```typescript
import { defineHook } from "workflow";
import { z } from "zod";

export const bookingApprovalHook = defineHook({
  schema: z.object({
    approved: z.boolean(),
    comment: z.string().optional(),
  }),
});

async function executeBookingApproval(
  { flightNumber, price }: { flightNumber: string; price: number },
  { toolCallId }: { toolCallId: string }
) {
  // Use the toolCallId as the hook token so UI can reference it
  const hook = bookingApprovalHook.create({ token: toolCallId });
  
  // Workflow pauses here - no compute resources consumed while waiting
  const { approved, comment } = await hook;
  
  if (!approved) {
    return `Booking rejected: ${comment || "No reason provided"}`;
  }
  return `Booking approved for flight ${flightNumber}`;
}
```

> 💡 **Key Insight**: Use `toolCallId` as the hook token to correlate UI approval buttons with waiting workflows.

#### Chat Session Modeling
For multi-turn agent conversations, Workflow DevKit supports persisting conversation state:
- `collectUIMessages: true` accumulates `UIMessage[]` during streaming
- Useful for persisting conversation state without re-reading the stream

---

## B. Idempotency and Retries Patterns

### Source: Workflow DevKit Documentation

#### Core Pattern: Step ID as Idempotency Key
> "Every step invocation has a stable `stepId` that stays the same across retries. Use it as the idempotency key when calling third-party APIs."
>
> — [Idempotency](https://useworkflow.dev/docs/foundations/idempotency)

**Implementation Pattern:**
```typescript
import { getStepMetadata } from "workflow";

async function chargeUser(userId: string, amount: number) {
  "use step";
  const { stepId } = getStepMetadata();
  
  // Stripe-style idempotency key
  // Guarantees only one charge even if step retries
  await stripe.charges.create(
    { amount, currency: "usd", customer: userId },
    { idempotencyKey: stepId }
  );
}
```

**Why This Works:**
- `stepId` is stable across retries
- Globally unique per step
- Fulfills uniqueness requirement for idempotency keys

**Best Practices:**
1. Always provide idempotency keys to external side effects (payments, emails, SMS)
2. Prefer `stepId` as your key
3. Keep keys deterministic - avoid timestamps or attempt counters
4. Handle 409/conflict responses gracefully - treat as success if prior attempt completed

#### Error Handling and Retries
> "By default, steps retry up to 3 times on arbitrary errors."
>
> — [Errors & Retrying](https://useworkflow.dev/docs/foundations/errors-and-retries)

**Configurable Retries:**
```typescript
async function callApi(endpoint: string) {
  "use step";
  const response = await fetch(endpoint);
  if (response.status >= 500) {
    throw new Error("Uncaught exceptions get retried!");
  }
  return response.json();
}
callApi.maxRetries = 5; // 6 total attempts
```

**Error Types:**
- `Error` → Retried (default: 3 times)
- `FatalError` → Skip retries (e.g., 404 not found)
- `RetryableError` → Custom delay (e.g., rate limiting)

**Rate Limiting Pattern:**
```typescript
import { RetryableError } from "workflow";

if (response.status === 429) {
  throw new RetryableError("Rate limited. Retrying...", {
    retryAfter: "1m", // Duration string
  });
}
```

---

## C. Gemini Function Calling Best Practices

### Source: Google AI for Developers

#### Best Practices Summary
> — [Function Calling Best Practices](https://ai.google.dev/gemini-api/docs/function-calling)

1. **Function and Parameter Descriptions**: Be extremely clear and specific. The model relies on these to choose the correct function.

2. **Naming**: Use descriptive function names (no spaces, periods, or dashes).

3. **Strong Typing**: Use specific types (integer, string, enum). If a parameter has limited valid values, use an enum.

4. **Tool Selection**: 
   > "While the model can use an arbitrary number of tools, providing too many can increase the risk of selecting an incorrect or suboptimal tool. For best results, aim to provide only the relevant tools for the context or task, ideally keeping the active set to a maximum of **10-20**."

5. **Temperature**:
   - Use low temperature (e.g., 0) for deterministic function calls
   > "When using Gemini 3 models, we strongly recommend keeping the temperature at its default value of 1.0. Changing the temperature (setting it below 1.0) may lead to unexpected behavior, such as looping or degraded performance."

6. **Validation**: If a function call has significant consequences (e.g., placing an order), validate with the user before executing.

7. **Check finishReason**: Always check `finishReason` to handle cases where the model failed to generate a valid function call.

8. **Error Handling**: Return informative error messages that the model can use to generate helpful responses.

9. **Security**: Be mindful of security when calling external APIs. Use appropriate authentication and authorization.

10. **Token Limits**: Function descriptions count toward input token limit. Consider limiting the number of functions or breaking down complex tasks.

#### Notes and Limitations
- For `ANY` mode, the API may reject very large or deeply nested schemas
- Consider dynamic tool selection based on conversation context for large tool sets

---

## D. Gemini Rate Limits, Caching, and Cost Controls

### Source: Google AI for Developers

#### Rate Limits
> "Rate limits are usually measured across three dimensions:
> - Requests per minute (RPM)
> - Tokens per minute (input) (TPM)
> - Requests per day (RPD)"
>
> "Rate limits are applied per project, not per API key."
>
> — [Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)

**Key Points:**
- Exceeding any limit triggers rate limit error
- RPD quotas reset at midnight Pacific time
- Limits vary by model
- Experimental/preview models have more restrictions

**Usage Tiers:**
| Tier | Qualification |
|------|---------------|
| Free | Default |
| Tier 1 | Based on cumulative Google Cloud spending |
| Tier 2+ | Higher spending + upgrade request |

#### Context Caching
> — [Context Caching](https://ai.google.dev/gemini-api/docs/caching)

**Implicit Caching (Default):**
- Enabled by default for most Gemini models
- Automatic cost savings when requests hit caches
- No action required to enable

**To Increase Cache Hits:**
1. Put large, common contents at the beginning of prompts
2. Send requests with similar prefix in a short amount of time

**Explicit Caching:**
- Cache tokens for subsequent requests
- Cost savings at certain volumes
- Configurable TTL (default: 1 hour)

**Cost Implications:**
- Cached input tokens are cheaper than non-cached
- Trade-off between cache storage cost and token savings
- Best for repeated context (e.g., system prompts, large documents)

---

## E. Scheduling Options

### Comparison Matrix

| Feature | Workflow DevKit<br>`sleep()` | Supabase Cron<br>(`pg_cron`) | Vercel Cron |
|---------|------------------------------|------------------------------|-------------|
| **Type** | Durable sleep | PostgreSQL jobs | HTTP triggers |
| **Min Interval** | Any duration | 1 second | 1 minute |
| **Max Duration** | Months | 10 minutes | Function limit |
| **Survives Deploys** | ✅ Yes | ✅ Yes | ⚠️ Config-based |
| **Trigger Type** | In-workflow | SQL/HTTP | HTTP GET |
| **Best For** | Agent pausing | DB maintenance | Periodic checks |

### Supabase Cron (pg_cron)
> "Supabase Cron is a Postgres Module that simplifies scheduling recurring Jobs with cron syntax and monitoring Job runs inside Postgres."
>
> "For best performance, we recommend no more than 8 Jobs run concurrently. Each Job should run no more than 10 minutes."
>
> — [Supabase Cron](https://supabase.com/docs/guides/cron)

**Capabilities:**
- Run SQL snippets or database functions
- Make HTTP requests (e.g., invoke Edge Functions)
- Job runs tracked in `cron.job_run_details`

### Vercel Cron
> "To trigger a cron job, Vercel makes an HTTP GET request to your project's production deployment URL."
>
> "Vercel Functions triggered by a cron job will always contain `vercel-cron/1.0` as the user agent."
>
> — [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

**Configuration:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/autonomy/check",
    "schedule": "*/15 * * * *"
  }]
}
```

### Recommended Approach

**Primary: Workflow DevKit Sleep**
- Already integrated in Rune (`workflow: ^4.0.1-beta.22`)
- Durable across deploys and restarts
- Natural fit for agent pause/resume
- Integrates with hook pattern for approvals

**Secondary: Supabase Cron for Event Checks**
- Periodic event queue processing
- DB-level scheduling (no cold starts)
- Runs even if no web traffic

---

## F. Event Ingestion Patterns

### Webhook Event Ingestion
**Pattern: Deduplicated Event Queue**

```sql
CREATE TABLE rune_agent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    workflow_id UUID REFERENCES rune_workflows(id),
    source_type TEXT NOT NULL, -- 'webhook' | 'schedule' | 'system'
    payload JSONB NOT NULL,
    dedupe_key TEXT NOT NULL, -- Unique per source
    status TEXT DEFAULT 'pending', -- 'pending' | 'processing' | 'processed' | 'failed'
    UNIQUE (dedupe_key)
);
```

**Webhook Handler Pattern:**
```typescript
export async function POST(request: Request) {
    const payload = await request.json();
    const dedupeKey = `webhook-${payload.id}-${payload.timestamp}`;
    
    // Insert with ON CONFLICT to ensure idempotency
    const { error } = await supabase
        .from('rune_agent_events')
        .insert({
            user_id: payload.userId,
            workflow_id: payload.workflowId,
            source_type: 'webhook',
            payload: payload.data,
            dedupe_key: dedupeKey,
        })
        .onConflict('dedupe_key')
        .ignore();
    
    if (error) throw error;
    
    return new Response('OK', { status: 200 });
}
```

### System Event Pattern
When a workflow run completes, emit a compact summary:

```typescript
// After run completion
await supabase.from('rune_agent_events').insert({
    user_id: run.userId,
    workflow_id: run.workflowId,
    source_type: 'system',
    payload: {
        type: 'run_completed',
        runId: run.id,
        status: run.status,
        duration: run.duration,
        nodeCount: run.nodes.length,
        // Compact summary, not full logs!
        errors: run.errors?.slice(0, 3),
    },
    dedupe_key: `run-complete-${run.id}`,
});
```

### Safe Auth for Background Jobs
> "Be mindful of security when calling external APIs. Use appropriate authentication and authorization mechanisms."
>
> — Gemini Function Calling Best Practices

**Service Role Pattern:**
```typescript
// For background worker endpoints
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Not anon key
);

// Validate internal requests
if (request.headers.get('Authorization') !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
}
```

---

## Key Architectural Decisions

Based on this research, the Rune Autonomy system should:

### 1. Use Workflow DevKit as Primary Orchestration
- Already integrated in the codebase
- Durable execution survives deploys
- Native sleep, hooks, and retry primitives
- DurableAgent class provides agent abstraction

### 2. Implement Two-Stage Decision Pipeline
- **Stage 1 (Triage)**: Gemini Flash for fast classification (NOOP/SUGGEST/ACT)
- **Stage 2 (Plan)**: Gemini Pro only when action needed
- Reduces cost and latency for most events

### 3. Use Step ID for All Idempotency
- Leverage `getStepMetadata().stepId` for all external calls
- Prevent duplicate actions on retries

### 4. Enforce Policy at Tool Call Time
- Check allowlist before execution
- Enforce budgets before each action
- Create approval hooks for high-impact tools

### 5. Compact Event Payloads
- Never store full logs in events
- Summarize run outcomes
- Link to full data via IDs

### 6. RLS-Scoped Everything
- All autonomy tables user-scoped
- Service role only for background workers
- Audit trail for every action

---

## References

1. [Workflow DevKit: DurableAgent](https://useworkflow.dev/docs/api-reference/workflow-ai/durable-agent)
2. [Workflow DevKit: Human-in-the-Loop](https://useworkflow.dev/docs/ai/human-in-the-loop)
3. [Workflow DevKit: Idempotency](https://useworkflow.dev/docs/foundations/idempotency)
4. [Workflow DevKit: Errors & Retrying](https://useworkflow.dev/docs/foundations/errors-and-retries)
5. [Workflow DevKit: Sleep and Delays](https://useworkflow.dev/docs/ai/sleep-and-delays)
6. [Gemini API: Function Calling](https://ai.google.dev/gemini-api/docs/function-calling)
7. [Gemini API: Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
8. [Gemini API: Context Caching](https://ai.google.dev/gemini-api/docs/caching)
9. [Supabase Cron](https://supabase.com/docs/guides/cron)
10. [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

---

*Research completed 2026-01-27*
