# Refactor Plan: Gemini 3 Agent Runtime

## Goals
- **Enable Gemini 3**: Upgrade `streamGoogle` to support Gemini 3.0 Pro/Flash with `thinking_level`.
- **Implement Tool Loop**: Add server-side tool execution with "Thought Signature" preservation.
- **Harden Runtime**: Robust error handling, strict schema validation, and streaming observability.

## 1. Core Runtime (`lib/agent/runtimes/gemini.ts`)
Create a new class `GeminiAgentRuntime` that manages the chat loop.

### Key Responsibilities:
- **Session Management**: maintain `history` and `thought_signatures`.
- **Streaming Parser**:
  - Parse chunks for `text`, `functionCall`, and `thoughtSignature`.
  - Buffer "Thinking" output (if we want to hide it or show it).
- **Tool Execution**:
  - Execute tools using `lib/agent-tools.ts`.
  - Construct `functionResponse` parts.
  - **CRITICAL**: Attach `thoughtSignature` from the request to the response (or history context) as required.
- **Recursion**:
  - If tool calls occur, execute and *continue* the generation (send history + new parts).
  - Limit max turns (e.g. 5-10) to prevent infinite loops.

## 2. API Route Update (`app/api/agent/generate/route.ts`)
- Remove the inline `streamGoogle` function.
- Instantiate `GeminiAgentRuntime`.
- Pass the `ReadableStream` from the runtime to the `NextResponse`.

## 3. Streaming Strategy
To keep `playground.tsx` compatible (it expects a text stream):
- Stream **Model Text** directly to client.
- Stream **Tool Status** as "System" formatted blocks?
  - *Current UI* just appends text.
  - We can append `\n> [Tool: list_workflows...]\n` to the stream so the user sees activity.
- Stream **Thinking Processes**?
  - Gemini 3 "Thoughts" are internal? Or text?
  - If `thinking_level` is used, thoughts might be in the model response. We should decide whether to stream them or not.
  - **Decision**: Stream everything for "Playground" visibility.

## 4. Implementation Steps
1.  **Create `lib/agent/runtimes/gemini.ts`**:
    - `run(messages, tools, config)` method.
    - Internal `executeStep` loop.
2.  **Update `route.ts`**:
    - Replace `streamGoogle`.
3.  **Verify**:
    - Run the "Soak Test" (manual at first, then automated script).

## 5. Verification
- **Test Case 1**: Simple chat ("Hello").
- **Test Case 2**: Tool usage ("List my workflows").
- **Test Case 3**: Multi-step ("Find failing nodes in my active workflow and run them").

