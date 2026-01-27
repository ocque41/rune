# Rune Performance Budgets

**Goal**: Instant feel for Dashboard and Tabs interactions.

## 1. Latency Targets (P95)
| View | Server Time (P95) | Total Time (P95) | Notes |
| :--- | :--- | :--- | :--- |
| **Initial Dashboard Load** | < 1.5s | < 2.5s | Includes auth + user profile + summary data. |
| **Tab Switch (Runs, Chats)** | < 600ms | < 1.0s | Should utilize optimistic UI or fast fetch. |
| **Server Action (Mutation)** | < 800ms | < 1.5s | Save, Approve, Deploy. |

## 2. Database Budgets
| Metric | Limit | Critical Rule |
| :--- | :--- | :--- |
| **Queries per Route** | <= 4 | Dashboard limit. Does not count lazy-loaded components. |
| **Rows per Fetch** | <= 50 | Initial page size. Infinite scroll for more. |
| **Exact Counts** | **FORBIDDEN** | `COUNT(*)` without `LIMIT` is banned in the critical path (Dashboard). |
| **Waterfalls** | **0** | No dependent serial fetches in the parent Server Component. |

## 3. Payload Budgets
| Metric | Limit |
| :--- | :--- |
| **Initial JSON Payload** | < 150KB | Compressed. |
| **List Item Size** | < 2KB | Average per item (e.g., Run summary). |

## 4. Stability Rules
*   **No Auth Regressions**: All queries must respect RLS.
*   **No Empty Flashes**: Use `useTransition` or optimistic state to prevent "white flashing" on tab switches.
*   **Failed Queries**: Must gracefully degrade (e.g., "Could not load runs" instead of 500 Page).
