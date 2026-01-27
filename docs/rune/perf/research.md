# Rune Performance Research Notes

## 1. Next.js Caching & Revalidation (App Router)
**Source**: [Next.js Caching Deep Dive](https://nextjs.org/docs/app/deep-dive/caching)

### Strategies
1.  **Request Memoization (`React Cache`)**:
    *   **What**: Memoizes functions within a single request.
    *   **Use**: Wrap direct DB calls (e.g., Supabase SDK calls not using `fetch`) with `cache()` to prevent duplicate queries in the same render pass (e.g., fetching User in layout + page).
    *   **Rule**: `import { cache } from 'react'; export const getUser = cache(async () => ...)`

2.  **Data Cache (Persistent)**:
    *   **What**: Persists `fetch` results across requests and deployments.
    *   **Use**: For slowly changing public data (e.g., Templates, Tools).
    *   **Config**: `fetch(url, { next: { tags: ['templates'] } })`.
    *   **Invalidation**: `revalidateTag('templates')` in Server Actions after updates.

3.  **Dynamic Rendering (Opt-out)**:
    *   **What**: Disables caching for real-time private data (e.g., Dashboard, Runs).
    *   **Config**: `export const dynamic = 'force-dynamic'` or `cookies()` usage.
    *   **Note**: For Rune's dashboard, we likely want **Dynamic** rendering but with optimised queries, OR short-term caching (stale-while-revalidate) if 1-2s delay is acceptable (unlikely for lively "active run" states).

## 2. Vercel OpenTelemetry Instrumentation
**Source**: [Vercel OTel Docs](https://vercel.com/docs/tracing/instrumentation)

### Setup
1.  **Packages**: `@vercel/otel`, `@opentelemetry/api`.
2.  **File**: `instrumentation.ts` in project root.
    ```typescript
    import { registerOTel } from '@vercel/otel';
    export function register() {
      registerOTel({ serviceName: 'rune-dashboard' });
    }
    ```
3.  **Custom Spans**:
    ```typescript
    import { trace } from '@opentelemetry/api';
    return trace.getTracer('rune').startActiveSpan('db.fetchWorkflows', async (span) => {
      try {
        return await dbOp();
      } finally {
        span.end();
      }
    });
    ```
    *   **Constraint**: Use this wrapper for ALL non-fetch interaction (Supabase Client calls).

## 3. Supabase Performance
**Sources**: [Inspect](https://supabase.com/docs/guides/database/inspect), [RLS Perf](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Identification
*   **pg_stat_statements**: The source of truth for "cumulative time".
    *   `select query, calls, total_exec_time from pg_stat_statements order by total_exec_time desc limit 10;`
*   **Running Queries**: `select * from pg_stat_activity where state = 'active';`

### RLS Optimization (Critical)
1.  **Avoid Joins in Policies**:
    *   BAD: `USING ( auth.uid() IN (SELECT user_id FROM teams WHERE ...) )` - runs for EVERY row.
    *   GOOD: Use `security definer` functions that cache permissions, or JWT claims.
    *   BEST (for Rune): **Simple ownership** `USING ( auth.uid() = user_id )` is fast as long as `user_id` is indexed.

2.  **"Planner-Friendly" Pattern**:
    *   If using helpers, wrap them: `(select auth.uid()) = user_id`. This creates an `InitPlan` (run once) instead of running for every row.

3.  **Indexing**:
    *   Indexes MUST match the RLS policy columns + Query filter columns (Composite).
    *   Example: RLS on `user_id`, Query on `created_at desc`.
    *   Index needed: `CREATE INDEX ON table (user_id, created_at DESC)`.

## 4. Pagination & Counts
**Source**: [PostgREST Pagination](https://docs.postgrest.org/en/v12/references/api/pagination_count.html)

*   **Limit/Offset**: Good for shallow pages (`limit 50 offset 0`). Bad for deep pages (`offset 10000`).
*   **Cursor**: Better for infinite scroll (`where created_at < last_seen_date order by created_at desc limit 50`).
*   **Exact Counts**:
    *   `count=exact` is SLOW (scans all matching rows).
    *   **Fix**: Use `count=estimated` (Postgres stats) OR maintain a separate counter table if exact numbers (like "Total Runs: 5,432") are needed on a high-traffic dashboard.
    *   **Rune Strategy**: Dashboard should NOT show "Total Runs" if it requires a count scan. Show "Recent Runs" instead.
