# Rune Inspect Research Findings

## 1. Gemini Token Counting & Usage Metadata
- **Field**: `usage_metadata` in response.
- **Sub-fields**:
  - `prompt_tokens`: Input tokens.
  - `output_tokens` (or `candidates_tokens`): Generated tokens.
  - `total_tokens`: Sum.
  - `input_token_details.cache_read`: Tokens read from cache (billed at lower rate).
- **Thinking Tokens**:
  - Gemini 2.0 Flash Thinking model includes "thinking" process.
  - These are currently returned as part of the output and billed as **output tokens**.
  - Rate: Same as standard output tokens (approx $0.40/1M for Flash 2.0).

## 2. Gemini Pricing (Jan 2026 Est.)
| Model | Input / 1M | Output / 1M | Cache Read / 1M |
|---|---|---|---|
| **Gemini 1.5 Flash** | $0.075 | $0.30 | $0.018 |
| **Gemini 1.5 Pro** | $1.25 | $5.00 | $0.31 |
| **Gemini 2.0 Flash** | $0.10 | $0.40 | $0.025 |

**Assumptions**:
- Prices are largely stable.
- Thinking tokens = Output tokens.
- Context Caching storage fee is separate (per hour), but for per-call inspection, we track the *read* cost benefit.

## 3. Supabase RLS Strategy
- **Users**: `auth.uid() = user_id` for all SELECTs.
- **Service/Admin**: Writes performed via Admin client (bypassing RLS) or `postgres` role functions.
- **Tables**:
  - `rune_llm_calls`: Detailed log.
  - `rune_tool_invocations`: Tool detail.
  - `rune_usage_rollups_daily`: Aggregate for dashboard speed.

## 4. Rollup Strategy (Cron)
- **Method**: Supabase RPC (`rollup_daily_usage`) called by Vercel Cron.
- **Frequency**: Daily (or hourly via scheduler).
- **Logic**: Aggregates `rune_llm_calls` and `rune_tool_invocations` into `rune_usage_rollups_daily` via UPSERT (ON CONFLICT).
- **Performance**: RPC runs in DB, maximizing speed and minimizing data transfer.
