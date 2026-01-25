# Walkthrough: Gemini 3 Agent Refactor

## 🎯 Goal
Refactor the "Shimmering Juno" Agent Playground to support **Google Gemini 3.0** with advanced capabilities:
- **Thinking Models**: Support for `thinking_level` config.
- **Server-Side Tool Loop**: Full recursive tool execution (previously missing in Google implementation).
- **Thought Signatures**: Strict handling of Gemini 3 reasoning tokens to prevent validation errors.

## 🏗️ Architecture Changes

### 1. New Runtime Engine (`lib/agent/runtimes/gemini-runtime.ts`)
We replaced the inline `streamGoogle` function with a robust `GeminiAgentRuntime` class.
- **Micro-Loop**: Manages the request/response cycle for tools.
- **Thought Preservation**: Captures `thoughtSignature` from model candidates and reinjects them into history for strict validation.
- **Streaming**: Yields text chunks immediately to the client while keeping tool execution server-side.

### 2. API Route Update (`app/api/agent/generate/route.ts`)
- Integrated `GeminiAgentRuntime`.
- Updated `GenerateRequest` interface to support `thinking` configuration.
- Simplified the logical branch for Google models.

## 📝 Key Features Implemented

### ✅ Server-Side Tooling
The agent can now execute tools like `list_workflows`, `run_node`, etc., and **continue the conversation** autonomously.
```typescript
// From GeminiAgentRuntime
if (executionParts.length > 0) {
    // Execute tools...
    // Push results to history...
    // Continue loop (Round++)
}
```

### ✅ Thought Signature Compliance
Gemini 3 requires `thoughtSignature` to be returned in subsequent requests.
```typescript
// Injection Strategy
history.map(m => ({
    role: m.role,
    parts: m.parts,
    thoughtSignature: m.thoughtSignature // Injected via cast
}))
```

### ✅ Streaming Feedback
The runtime streams:
1.  **Content**: "Here is the list of workflows..."
2.  **Tool Activity**: "> Executing: list_workflows..." (Visible in UI)
3.  **Errors**: "[System Error: ...]"

## 🧪 How to Verify
1.  **Configure**: Go to Playground, select `gemini-3-pro-preview`.
2.  **Enable Tools**: Check "List Workflows" in the tools config.
3.  **Prompt**: "List my workflows and tell me which one was updated last."
4.  **Observe**:
    - Agent should stream "Executing list_workflows...".
    - Agent should output the final answer based on tool results.
    - No "400 Bad Request" (indicates Thought Signatures are working).

## ⚠️ Notes
- **Supabase**: Requires a valid Supabase session.
- **Google API Key**: Must be set in `.env.local` as `GOOGLE_API_KEY`.
