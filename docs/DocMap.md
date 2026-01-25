# DocMap: Agent Playground Refactor

## Status
- [x] Gemini 3 API in Node/TS
- [x] Agent Systems Patterns
- [ ] Repo & Refactor Implications

## A) Gemini 3 API in Node/TS

### [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
**Key Takeaways:**
- **Context Window**: 1M tokens input, 64k tokens output.
- **Knowledge Cutoff**: Jan 2025.
- **Pricing**: `gemini-3-pro-preview` is $2/$12 per 1M tokens.
- **Thinking Level**: Use `thinking_level` instead of `thinking_budget`. Legacy `thinking_budget` is supported but discouraged.
- **Tools**: Supports Google Search, File Search, Code Execution. Custom tools via Function Calling.

### [Function Calling](https://ai.google.dev/gemini-api/docs/function-calling)
**Key Takeaways:**
- **Modes**: `ANY`, `AUTO`, `NONE`.
- **Parallel Function Calling**: Supported and default behavior unless configured otherwise.
- **Strict Validation**: Gemini 3 enforces strict validation for function calls.
- **Lifecycle**:
  1. Define declaration (JSON Schema).
  2. Model returns `functionCall`.
  3. Execute tool.
  4. Return `functionResponse`.

### [Thought Signatures](https://ai.google.dev/gemini-api/docs/thought-signatures)
**Key Takeaways:**
- **Critical Requirement**: Gemini 3 uses Thought Signatures to maintain reasoning context.
- **Strict Validation**: Missing signatures result in **400 error** for Function Calling and Image Generation.
- **Handling Rules**:
  - **Single Function Call**: Return the signature included in the `functionCall` part.
  - **Parallel Function Calls**: Only the first part has the signature; return parts in exact order.
  - **Sequential (Multi-step)**: Accumulate ALL signatures in history.
  - **Streaming**: Signature may arrive in a final "empty text" chunk. **Must parse for it.**
  - **Migration/Legacy**: If injecting custom calls without signatures, use dummy: `"thoughtSignature": "context_engineering_is_the_way_to_go"`.

### [Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output)
**Key Takeaways:**
- **Configuration**: Use `responseMimeType: 'application/json'` and provide `responseSchema`.
- **Schema Support**: Supports standard JSON Schema subset. Avoid `oneOf` or deep nesting if possible.

## B) Agent Systems (Google ADK / Agent Engine)

### [Agent Development Kit](https://google.github.io/adk-docs/)
**Key Takeaways:**
- **Observability**: First-class support for Cloud Trace, BigQuery, AgentOps, Monocle.
- **Evaluation**: Recommend evaluating "Trajectory" (step-by-step) not just final output.
- **Context**: Mentions "Context compression" and "Rewind sessions".

## C) Implications for Refactor
- **Streaming Parser**: Must be updated to detect and buffer `thoughtSignature` even if text is empty.
- **Tool Execution**: Must preserve `thoughtSignature` and return it in `functionResponse`.
- **Context Management**: Need to clarify how we store history. If we drop parts, we break the signature chain.
- **Validation**: Enforce strict tool schemas in our codebase to match Gemini 3 expectations.
