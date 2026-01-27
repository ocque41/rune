# Research: Reliable Background Scheduling

## Goal
Execute autonomous jobs (LLM planning, tool execution) deterministically, ensuring exactly-once execution semantics and resilience to timeouts.

## Comparison: Vercel Cron vs. Supabase Cron

### Vercel Cron
- **Pros**: Easy integration with Next.js App Router (`vercel.json`).
- **Cons**: 
  - Subject to Function Duration/Timeout limits (10s on specific plans, 60s max/pro). 
  - "Best effort" execution (rare misses possible).
  - Risk of duplicates if retry logic is aggressive.

### Supabase Cron (`pg_cron`)
- **Pros**: 
  - Database-native. Runs strictly on schedule.
  - No network latency for SQL-only jobs.
  - Can invoke HTTP endpoints via `pg_net` with built-in queuing/retries.
- **Limitations**:
  - Max concurrent jobs (soft limit ~8 recommended).
  - Resource usage shares strict CPU/RAM with the database.

## Recommended Strategy: "Database-Driven Worker Queue"

### 1. Job Leasing (The 'Worker' Pattern)
To handle concurrency safety, we do NOT run "one cron per job". We run **one cron that picks up N jobs**.

**Schema**:
- Add `leased_until` (timestamptz) and `worker_id` (text) to `rune_agent_jobs`.

**Query**:
```sql
UPDATE rune_agent_jobs
SET leased_until = now() + interval '5 minutes',
    worker_id = 'cron-worker-1'
WHERE id IN (
    SELECT id FROM rune_agent_jobs
    WHERE status IN ('pending', 'running')
    AND (leased_until IS NULL OR leased_until < now())
    ORDER BY priority DESC, created_at ASC
    LIMIT 5
    FOR UPDATE SKIP LOCKED
)
RETURNING id;
```
This guarantees that even if multiple crons overlap, they never process the same job.

### 2. The Scheduler
- **Mechanism**: Supabase Cron (`pg_cron`).
- **Schedule**: Every 1 minute (`* * * * *`).
- **Action**: 
    1. Call the `process_jobs` logic.
    2. This logic performs the LEASE query above.
    3. Then invokes the Execution Logic for the leased IDs.

### 3. Execution Environment
- **Option A (Current)**: Cron calls Vercel API `/api/cron/process`.
  - **Risk**: Vercel timeout if LLM is slow.
- **Option B (Robust)**: Cron calls Supabase Edge Function.
  - Edge Functions have higher timeout limits (customer configurable) and stickier connections.
  - **Decision**: Stick with Vercel API for MVP (Phase 7), but enforce **Step-Wise Execution**. 
  - The worker only runs ONE step per invocation per job. This keeps run duration < 10s.

## Implementation Plan
1. Add `leased_until` to `rune_agent_jobs`.
2. Configure `pg_cron` to HIT the Vercel endpoint via `pg_net` (or internal webhook).
3. The Vercel endpoint runs the "Lease -> Execute One Step -> Release/Update" loop.
