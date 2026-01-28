# ADR: Rune Inspect Capability

## Status
Proposed

## Context
We need to provide detailed usage and cost inspection for the Rune Autonomy platform. The data already exists in `rune_llm_calls` and `rune_tool_invocations`, but we need to ensure performant retrieval for the dashboard "Inspect" tab.

## Decision
We will build the Inspect capability directly on top of the existing tables with targeted indexing. We will NOT introduce a separate "analytics" database at this stage, but will reserve the right to introduce materialized views if performance degrades.

### 1. Database Schema
We will add the following indexes to support the primary query patterns:

```sql
-- Support: "Show me my recent calls" (Paginated)
CREATE INDEX IF NOT EXISTS idx_rune_llm_calls_user_created 
ON rune_llm_calls (user_id, created_at DESC);

-- Support: "Show me my recent tool usage" (Paginated)
CREATE INDEX IF NOT EXISTS idx_rune_tool_invocations_user_created 
ON rune_tool_invocations (user_id, created_at DESC);
```

### 2. API Design
All endpoints will be located under `/api/rune/inspect`.

#### `GET /api/rune/inspect/usage`
Returns aggregated usage metrics for a time range.
- **Params**: `from` (ISO date), `to` (ISO date)
- **Response**:
  ```json
  {
    "total_tokens": 15420,
    "total_cost_usd": 0.045,
    "total_calls": 12,
    "models": { "gemini-1.5-pro": 10, "gemini-1.5-flash": 2 }
  }
  ```

#### `GET /api/rune/inspect/activity`
Returns the paginated feed of detailed calls.
- **Params**: `limit` (max 50), `cursor` (timestamp or ID for keyset pagination)
- **Response**:
  ```json
  {
    "items": [
      {
        "id": "...",
        "type": "llm_call", // or 'tool_invocations'
        "model": "gemini-1.5-pro",
        "tokens": 1205,
        "cost": 0.004,
        "latency_ms": 450,
        "timestamp": "2026-01-29T10:00:00Z"
      }
    ],
    "next_cursor": "..."
  }
  ```

### 3. Security (RLS)
The existing tables must have RLS enabled. We will verify and enforce:
```sql
ALTER TABLE rune_llm_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON rune_llm_calls
FOR SELECT USING (auth.uid() = user_id);
```

## Consequences
- **Positive**: minimal architectural complexity; reuses existing data.
- **Negative**: Aggregation queries on large datasets might become slow over time without pre-aggregation.
- **Mitigation**: We will monitor latency. If p95 > 1s, we will introduce a `rune_daily_usage` rollup table.
