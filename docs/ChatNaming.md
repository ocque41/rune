# Chat Naming Strategy

## Auto-Naming
When a new chat is created (via `POST /api/rune/chats` or implicitly in `generate`), we automatically generate a title based on the user's initial prompt.

- **Logic**: We take the first 50 characters of the user's input.
- **Implementation**: See `app/api/agent/generate/route.ts` (creation logic).
- **Future Improvement**: We could use a small LLM call to generate a concise summary title (e.g. "React Component Refactor") instead of a truncated string.

## Inline Renaming
Users can manually rename chats to better organize their workspace.

- **UI**: The `ChatListModal` provides an inline edit interface (double-click to edit) for the chat title.
- **Persistence**: Renames are sent via `PATCH /api/rune/chats/[chatId]` with `{ title: string }`.
- **Latency**: We use optimistic UI updates in the React state to ensure the interface feels instant, reverting only if the API call fails.

## Active Chat Persistence
We track the active chat ID per workflow in the local agent store (`lastActiveChats`). This ensures that when a user switches between workflows (e.g., from "Backend" to "Frontend"), the relevant conversation context is restored automatically.
