# Research Notes: Audit & Hardening

## 1. Gemini Structured Output (JSON Mode)
**Source**: https://ai.google.dev/gemini-api/docs/structured-output
- **Implementation**: Set `responseMimeType: "application/json"` in `generationConfig`.
- **Schema**: Provide `responseSchema` adhering to a subset of JSON Schema.
- **Constraints**: 
  - Supported types: object, array, string, number, integer, boolean, null.
  - `properties` and `required` are supported and recommended.
  - Enums are supported.
- **Why it matters**: Guarantees valid JSON without flaky prompt engineering ("Please output JSON..."). critical for reliable tool/node chaining.

## 2. Gemini Function Calling (Tooling)
**Source**: https://ai.google.dev/guide/function_calling
- **Best Practices**:
  - `function_declarations` must be clear.
  - `mode: "auto" | "any" | "none"` controls calling behavior.
  - **Thought Signatures**: For "Thinking" models (Gemini 2.0 Flash Thinking), specific headers or history preservation (`thoughtSignature`) enables reasoning traces.
- **Gap Identify**: Our current manual loop might be dropping `thoughtSignature` if not carefully preserved in `history` reconstruction.

## 3. Resumable Streams (Workflow DevKit Pattern)
**Source**: https://useworkflow.dev/docs/ai/resumable-streams
- **Concept**: A stream is stateful and durable. If connection drops, client reconnects to the *same* run.
- **Mechanism**:
  1. **Run ID**: Server returns `x-workflow-run-id` header on creation.
  2. **Offset**: Client requests reconnection with `?startIndex=123`.
  3. **Transport**: `WorkflowChatTransport` handles this client-side.
- **Gap**: Our current `/api/agent/generate` is stateless/ephemeral. If Vercel times out or wifi drops, the run is lost (though DB has history).
- **Fix Plan**: 
  - Return `sessionId` (or `runId`) in headers.
  - Implement a `GET /api/agent/stream/[id]` endpoint that resumes the event stream from an offset (requires storing chunks or regenerating). *Note: Without Workflow DevKit's engine, true token-level resumption is hard. Checkpoint resumption (loading history) is the achievable fallback for now.*

## 4. Vercel Limits
**Source**: https://vercel.com/docs/functions/configuring-functions/duration
- **Constraint**: Hobby = 10s (default) / 60s (max). Pro = 15s (default) / 300s (max).
- **Configuration**: `export const maxDuration = 60;` (App Router).
- **Impact**: Code execution (Tools) + Model Generation time. 60s is tight for "Autonomous" loops.
- **Mitigation**: Long-running autonomy MUST be offloaded to background jobs (Inngest/Temporal) or split into multiple client-driven steps.

## 5. Row Level Security (RLS)
**Source**: https://supabase.com/docs/guides/database/postgres/row-level-security
- **Requirement**: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- **Policy**: `USING (auth.uid() = user_id)` covers most tenant isolation cases.
- **Audit**: `rune_agent_configs` and `rune_chat_messages` must have this.

# Decisions (ADR)
1. **JSON Validation**: We will use Zod server-side to valid Gemini's JSON output before trusting it.
2. **Resumption Strategy**: We will implement "Checkpoint Resumption" (reload full history) rather than "Token Resumption" (too complex without specific infra). We will add `tool_calls` persistence to enable this.
3. **Approval Flow**: We will persist a "paused" state in `rune_agent_sessions` and require a specific "resume" API call, rather than keeping a hanging stream open (which hits Vercel limits).
