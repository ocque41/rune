# Research: Autonomy Inspect Tab

## 1. Facts & Assumptions

### Gemini Usage Metadata
*   **Field Source**: `response.usageMetadata` (Google Gen AI SDK)
*   **Fields**:
    *   `promptTokenCount` (Input)
    *   `candidatesTokenCount` (Output)
    *   `totalTokenCount` (Total)
    *   `cachedContentTokenCount` (Cached Input)

### Pricing (Estimated)
*   **Gemini 1.5 Flash**:
    *   Input: $0.10 / 1M tokens
    *   Output: $0.40 / 1M tokens
    *   Cache Storage: ~$1.00 / 1M / hour (approx)
*   **Gemini 1.5 Pro**:
    *   Input: ~$1.25 / 1M tokens
    *   Output: ~$5.00 / 1M tokens
*   **Note**: Prices are estimates. We will store `estimated_cost_usd` in the DB but mark it as "Estimated" in UI.

### Supabase / Postgres
*   **RLS**: `rune_agent_usage_events` and `rune_agent_usage_daily_rollup` will refer to `auth.users` via `user_id`.
*   **Policies**: `SELECT` allowed for `auth.uid() = user_id`. `INSERT` restricted to service role (server-side logging).
*   **Indexes**:
    *   `idx_usage_user_created` (User timelines)
    *   `idx_usage_user_day_model` (Rollup sources)

## 2. Entitlements (Discovery)
*   **Source Table**: `public.profiles`
*   **Key Column**: `tier` ('free', 'pro', 'enterprise')
*   **Strategy**:
    *   We will define hardcoded limits in `lib/autonomy/policy.ts` or similar mapped to these tiers.
    *   Example: Free = 1M tokens/mo, Pro = 100M tokens/mo.

## 3. Field Mapping

| Gemini Field | DB Column (`rune_agent_usage_events`) |
| :--- | :--- |
| `promptTokenCount` | `input_tokens` |
| `candidatesTokenCount` | `output_tokens` |
| `totalTokenCount` | `total_tokens` |
| `cachedContentTokenCount` | `cached_tokens` |

## 4. Query Performance
*   **Dashboard Summary**: Query `rune_agent_usage_daily_rollup` for the current billing cycle.
*   **Recent Activity**: Query `rune_agent_usage_events` with `ORDER BY created_at DESC LIMIT 20`.
*   **Indexes**: Crucial for the `Recent Activity` tab to avoid sequential scans on the large ledger table.
