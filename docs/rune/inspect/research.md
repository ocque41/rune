# Research: Rune Inspect Capability

## 1. Data Availability & Sources
We have robust telemetry exists in `lib/usage/log.ts`, writing to Supabase. This data is sufficient for the "Inspect" requirements.

### Existing Tables
| Table | Telemetry Data | UI Mapping |
| :--- | :--- | :--- |
| `rune_llm_calls` | `prompt_tokens`, `output_tokens`, `cached_tokens`, `model`, `latency_ms`, `cost`, `request_metadata` | **Usage**: Model calls, aggregated tokens, costs, latency. |
| `rune_tool_invocations` | `tool_name`, `duration_ms`, `status`, `high_impact` | **Usage**: Tool call counts, errors, duration. |
| `rune_chat_messages` | `usage_metadata`, `tool_calls` | **Drilldown**: Specific chat session inspection. |

### Pricing & Plan Data
- Pricing logic exists in `lib/billing/gemini-pricing.ts`.
- Plan data (Federated Plan) likely needs to be fetched from a `billing` or `accounts` table (verified via existing `lib/usage/pricing.ts`).

## 2. Recommended Data Model
We will use the existing tables but ensure they are optimized for the "Inspect" dashboard read patterns.

### Schema Updates
No new tables are strictly required for the *raw* data, but standardizing `rune_llm_calls` is critical.
We may need a **Materialized View** or efficient indexing for the "Overview" charts to avoid scanning millions of rows on every page load.

**Proposed Indexes:**
- `rune_llm_calls`: `(user_id, created_at DESC)` - For fast paginated lists.
- `rune_tool_invocations`: `(user_id, created_at DESC)` - For fast paginated lists.

### Aggregation Strategy
For "Show Usage" (aggregates):
- **Real-time**: `sum(total_tokens)` where `user_id = ?` AND `created_at > ?`.
- **Performance**: If this becomes slow (>1s), introduce `rune_daily_usage_snapshots` table populated via Supabase Cron (pg_cron).
- **Initial Implementation**: Direct counts/sums on indexed columns.

## 3. Constraints & Architecture
### Vercel / Next.js
- **Route Handlers**: Must reply within 15-60s (Standard) or 300s (Pro).
- **Constraint**: Aggregation queries must be efficient.
- **Solution**:
    1.  **Pagination**: APIs must accept `limit` and `offset` (or cursor). Default `limit=50`.
    2.  **Streaming**: The UI should stream data. First paint < 300ms (skeleton), then fetch data.

### Security (RLS)
- **Policy**: `auth.uid() = user_id` for all SELECTs.
- **Verification**: `explain analyze` on the filtered queries to ensure the `user_id` index is used.

## 4. Frontend UX (AnimeJS)
- **Transitions**: Smooth entry for lists (`stagger(50ms)`).
- **Loading**: Use "Skeleton" states that match the table layout.
- **Detail Pane**: Slide-over or expandable row for "Drilldown" into specific `request_id`.

## 5. Success Metrics (Refined)
- **API**: `/api/rune/inspect/usage` returns < 500ms (p95).
- **UI**: Inspect tab interacts < 100ms.
- **Data**: Accurate to within 1 min (near real-time).
