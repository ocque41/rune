# Current Architecture: Agent Playground

## Overview
The Agent Playground ("Shimmering Juno") is a Next.js application designed to interact with LLMs to control the "Rune" automation platform. It features a chat interface (`Playground`) and a backend API (`/api/agent/generate`) that orchestrates context injection and tool execution.

## Components

### 1. Frontend (UI)
- **Location**: `components/playground/components/playground.tsx`
- **Key Features**:
  - Chat interface with streaming support.
  - Configuration panel (Model, System Prompt, Tools).
  - "Autonomous Mode" toggle (Recursive loop client-side).
  - MCP Tool Management (`MCPModal`).
- **Integration**:
  - POSTs to `/api/agent/generate`.
  - Reads `ReadableStream` from response.
  - Handles `X-Session-Status` headers for autonomous loops.

### 2. Backend API
- **Location**: `app/api/agent/generate/route.ts`
- **Responsibility**:
  - Authentication (Supabase).
  - Context Building (`buildAgentContext` -> `formatContextToString`).
  - Provider Dispatch (`getProvider` -> `streamOpenAI` / `streamGoogle`).
- **Context Injection**:
  - Fetches User Profile, Active Workflow, Recent Runs.
  - Formats context into a massive System Prompt block.
  - Injects "Available Tools" definitions.

### 3. Agent Runtimes

#### Google (Gemini) Runtime
- **Location**: `streamGoogle` function in `route.ts`.
- **Status**: **Incomplete / Prototype**.
- **Issues**:
  - Uses `sendMessageStream` but **fails to handle Tool Calls**.
  - **No Tool Loop**: If the model wants to call a tool, the stream simply ends or outputs raw JSON.
  - **No Thought Signatures**: Does not handle Gemini 3.0's strict validation requirements.
  - **Single Turn**: Returns a stream and disconnects; does not recurse server-side for tools (unlike the OpenAI implementation).

#### OpenAI Runtime
- **Location**: `streamOpenAI` & `handleOpenAIToolLoop`.
- **Status**: Functional.
- **Features**:
  - Implements a recursive tool loop (`handleOpenAIToolLoop`).
  - Executes tools server-side.
  - Manages session state for "Autonomous Mode".

### 4. Tool Execution
- **Location**: `lib/agent-tools.ts`
- **Features**:
  - `TOOLS_DEFINITION`: JSON Schemas for tools.
  - `executeToolCall`: Dispatcher for `run_workflow`, `run_node`, etc.
  - `executeMcpTool`: Placeholder for MCP integration (currently mocks success).

## Critical Gaps for Gemini 3 Refactor
1.  **Missing Tool Loop**: `streamGoogle` must be rewritten to handle `functionCall` events, execute them, and feed results back to the model.
2.  **Thought Signatures**: The new loop must capture and replay `thoughtSignature` fields as per Gemini 3 docs.
3.  **Streaming & Formatting**: The stream needs to handle "Thought" blocks vs "Content" blocks cleanly.
