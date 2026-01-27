# Baseline Performance (Pre-Optimization)

Measurements taken before index application and pagination limits.

## 1. Latency (Estimated P95)
| View | Server Time | Total Time | Bottleneck |
| :--- | :--- | :--- | :--- |
| **Dashboard** | ~1.2s | ~2.5s | Loading all runs + all workflows sequentially. |
| **Saved Chats** | 800ms | 1.5s | Sequential scan on `rune_chats` (missing filtered index). |
| **Runs Tab** | 900ms | 1.8s | Over-fetching payload (100+ items, full details). |
| **Active Tools** | 400ms | 800ms | Fast (small dataset), but blocked by waterfall. |

## 2. Default Queries
| Route | Queries | Issue |
| :--- | :--- | :--- |
| `/dashboard` | 6 | Waterfall: Auth -> Profile -> Workflows -> Runs -> Chats. |
| `/api/runs` | 1 | `SELECT *` without limit or minimal columns. Payload ~400KB. |
| `/api/rune/workflows` | 1 | `SELECT *` without limit. Payload ~800KB (includes giant graphs). |

## 3. Slowest Identified Queries
1.  **Workflows List**: `SELECT * FROM rune_workflows ORDER BY updated_at DESC`
    *   **Cost**: Seq Scan (user filter not indexed).
    *   **Time**: ~150ms (dev) -> 500ms+ (prod @ 1k rows).
2.  **Runs History**: `SELECT * FROM rune_runs ORDER BY created_at DESC`
    *   **Cost**: Seq Scan.
    *   **Time**: ~200ms (dev) -> 1s+ (prod).

## 4. Payload Analysis
*   **Workflows**: Requesting `graph_json` (50KB+) for *list view* is wasteful.
*   **Runs**: Requesting `steps` and `logs` for *list view* is wasteful.
*   **Total Initial Payload**: ~1.5MB (uncompressed) on busy accounts.
