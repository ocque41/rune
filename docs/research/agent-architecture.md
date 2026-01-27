# Agent Architecture & Research

## Overview
This document outlines the architecture for Rune's Agent System, specifically focusing on the integration with Google Gemini, configuration management, and reliability patterns.

## 1. Gemini Integration
We use the Google Generative AI SDK (`@google/generative-ai`) for the `GeminiAgentRuntime`.

### Structured Output (JSON Mode)
- **Problem**: Previous implementations relied on prompt engineering ("Please output JSON").
- **Solution**: We utilize Gemini's native `responseMimeType: 'application/json'` and `responseSchema`.
- **Reference**: [Gemini Docs - JSON implementation](https://ai.google.dev/gemini-api/docs/structured-output)
- **Implementation**: In `GeminiAgentRuntime`, `generationConfig` is dynamically updated based on `config.outputMode`.

### Function Calling (Tools)
- **Context**: Gemini 3 and 2.0 Flash models have strict validation for tool calls.
- **Thought Signatures**: To support "Thinking" models (like `gemini-2.0-flash-thinking`), we must preserve and pass back `thoughtSignature` (if exposed) or ensure history is managed by `model.startChat`.
- **Persistence**: Tool calls are now stored in `rune_chat_messages.tool_calls` (JSONB) to allow hydration of history that includes function calls, which is critical for multi-turn reliability.

## 2. Configuration Management
### Hierarchy
Configuration is resolved in the following order (Server Action `getEffectiveAgentConfig`):
1.  **Node Scope**: Specific settings for a node in a workflow.
2.  **Workflow Scope**: Settings for the entire workflow.
3.  **User Default**: The user's preferred default settings.
4.  **Global Default**: Hardcoded system defaults.

### Storage
- **Table**: `rune_agent_configs`
- **Security**: RLS Policy `auth.uid() = user_id` for all operations.

## 3. Reliability & Safety
### Tool Gating
- **Problem**: Agents could execute destructive actions (like `run_workflow`) without user oversight.
- **Solution**: `isHighImpactTool` check in the runtime loop.
- **Policy**:
  - `always_confirm`: Always pause.
  - `confirm_high_impact`: Pause only for sensitive tools.
  - `auto`: Never pause (Autonomous mode).
- **Mechanism**: The runtime currently halts (stream end) when approval is needed. Future work involves a "Resume" UI.

### Vercel Constraints
- **Timeout**: `maxDuration` is set to 60s (Hobby Plan limit) in `route.ts`.
- **Recommendation**: For longer autonomous runs, move to background jobs or a dedicated runner (e.g. Inngest).

## 4. Resumability
- **Current State**: We persist the full chat history including tool calls.
- **Gap**: While we can reload the chat, the *stream* itself is not durable. If the connection drops mid-token, we restart the generation.
- **Future**: Implement `last_event_id` or similar offset tracking for robust stream resumption.
