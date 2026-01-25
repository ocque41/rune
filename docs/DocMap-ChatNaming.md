# DocMap: Chat Naming & Persistence

## 1. Documentation Sources

### Supabase Row Level Security (RLS)
- **Source**: `https://supabase.com/docs/guides/database/postgres/row-level-security`
- **Key Takeaways**:
  - **Policy Structure**: `CREATE POLICY "name" ON table FOR [SELECT|INSERT|UPDATE|DELETE] TO [role] USING (condition) WITH CHECK (condition)`.
  - **Auth Helper**: `auth.uid()` returns the current user's UUID.
  - **Security**: Always enable RLS on tables (`ALTER TABLE x ENABLE ROW LEVEL SECURITY`).
  - **Best Practice**: Use `(select auth.uid()) = user_id` for strict ownership.
  - **Indexes**: Critical for RLS performance, especially on `user_id`.

### Gemini Token & Billing
- **Source**: `https://ai.google.dev/api/tokens` & `https://ai.google.dev/pricing`
- **Key Takeaways**:
  - **Usage Metadata**: `usageMetadata` field in response contains `promptTokenCount`, `candidatesTokenCount`, and `totalTokenCount`.
  - **Pricing**: Dynamic; captured in `lib/pricing-config.ts` (Configurable Map).
  - **Counting**: `models.countTokens` API available if precise pre-calculation is needed, but for "Spending Intelligence" we rely on the `usageMetadata` returned in the *response* of generation requests.

## 2. Implementation Strategy

### A. Database Schema
Refining the existing `rune_chats` and `rune_chat_messages` tables to meet requirements.

#### `rune_chats`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `user_id` | uuid | `references auth.users` (Indexed) |
| `workflow_id` | uuid | `references workflows` (Indexed) |
| `title` | text | Defaults to "New Chat" |
| `last_message_at` | timestamptz | Indexed (for sorting) - **New** |
| `created_at` | timestamptz | Default now() |
| `archived_at` | timestamptz | Nullable (Soft delete support) - **New** |

#### `rune_chat_messages`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `chat_id` | uuid | `references rune_chats` (Indexed) |
| `user_id` | uuid | **New** (Denormalized for RLS efficiency) |
| `role` | text | system, user, assistant, tool |
| `content` | text | Message text |
| `tool_calls` | jsonb | Array of tool calls (OpenAI/Gemini format) |
| `tool_results` | jsonb | Array of tool outputs |
| `usage_metadata` | jsonb | **New** `{ prompt_tokens, candidate_tokens, total_tokens }` |
| `created_at` | timestamptz | Default now() |

### B. Security Policies (RLS)
- **Chats**: Users can only Select/Insert/Update/Delete their own rows (`user_id = auth.uid()`).
- **Messages**: Users can only Select/Insert/Update/Delete their own rows (`user_id = auth.uid()`).
  - *Note*: We add `user_id` to `messages` to avoid a JOIN on every RLS check (Performance Best Practice).

### C. Backend Logic
- **`createChat(workflowId)`**: Inserts new row.
- **`renameChat(chatId, title)`**: Updates title.
- **`appendMessage(chatId, message)`**:
  - If `usageMetadata` is present, saves it.
  - Updates `rune_chats.last_message_at`.
- **Streaming persistence**:
  - User message saved *before* generation.
  - Assistant message buffered and saved *after* generation complete (simple V1 strategy). If streams are very long (autonomous loops), we persist intermediate steps `onToolCall`.

### D. Frontend (UI)
- **Chat List**: Sidebar component fetching `rune_chats` by `workflow_id`.
- **Naming**: Double-click to rename or "Edit" context menu.
- **Persistence**: `useAgentStore` needs to handle "Switching Chat ID" which triggers a message fetch.

## 3. Unknowns & Risks
- **Existing Data**: If `rune_chat_messages` already has data, adding `user_id` (NOT NULL) will require a backfill migration.
- **Solution**:
  1. Add `user_id` as Nullable.
  2. Update existing rows joining `rune_chats`. (Wait, existing messages might not have this link easily? Yes, they have `chat_id`).
  3. Alter column to NOT NULL.
