# agents.md — Rune Project Map for AI Agents

## Purpose
Give AI agents a fast, accurate map of the Rune codebase, key data flows, and contribution rules.

## Product Summary
Rune is a **Workflow Command Deck**: a visual, node-based workflow builder with code generation, simulation, and cloud persistence. The app includes a command center dashboard (3D workflow wheel + modules), a drag-and-drop editor, workflow templates, run history, and an autonomy/jobs console.

## Tech Stack
- **Next.js 16** (App Router, React Server Actions)
- **React** (client-heavy UI)
- **Tailwind CSS** (no custom CSS modules)
- **@xyflow/react** (React Flow graph engine)
- **Supabase** (data storage for cloud workflows)
- **Sonner** (toasts)
- **animejs** (UI animation)
- **Lucide** (icons)

## High‑Level UX Modules
- **WorkflowDashboard** (command deck shell, module switching)
- **Editor** (Flow Builder, node editor)
- **Workflows** (cloud workflow list)
- **Runs** (run list + run details)
- **Autonomy** (jobs, inspect, policy settings)

## Codebase Map (Critical Paths)
### App Router
- `app/page.tsx` → boots the **WorkflowDashboard**
- `app/api/rune/workflows` → cloud save/list workflows (Supabase)
- `app/api/rune/workflows/[id]` → load/delete workflow
- `app/api/rune/workflows/deploy` → deploy version
- `app/api/rune/templates` → list/create/delete templates
- `app/actions/autonomy` → server actions for autonomy jobs

### Components
- `components/workflow-dashboard/` → top-level shell + module routing
- `components/flow-builder.tsx` → **core editor**: React Flow state, save/deploy/simulate/export/import
- `components/sidebar.tsx` → node palette + Agent drawer trigger
- `components/nodes/*` → custom node UIs
- `components/autonomy/*` → jobs, inspect, policy settings
- `components/workflow-wheel/*` → 3D workflow selector

### Lib
- `lib/workflow-generator.ts` → **compiler**: graph → TypeScript
- `lib/workflow-validator.ts` → static graph validation
- `lib/workflow-simulator.ts` → client-side mock execution
- `lib/templates.ts` → system templates
- `lib/types/*` → shared types

### Hooks
- `hooks/useLocalWorkflowSession` → local persistence for editor session

## Core Data Flow
1. **Editor State** (Flow Builder)
   - Nodes/edges managed by React Flow hooks.
   - Validation via `validateGraph`.
   - Simulation via `simulateWorkflow` (mock execution).
   - Code generation via `generateWorkflowCode`.

2. **Persistence**
   - **Local**: `/api/workflows/save` (drafts)
   - **Cloud**: `/api/rune/workflows` (Supabase)
   - Templates: `/api/rune/templates`

3. **Deploy**
   - Save → deploy via `/api/rune/workflows/deploy`.
   - Deployment modal shows integration + source + JSON.

## Supported Node Types (core)
- `step`, `if`, `loop`, `parallel`, `subWorkflow`, `schedule`, `approval`, `ai`, `transform`, `webhook`, `error`

## Compiler Pattern (workflow-generator)
- **Input**: React Flow nodes/edges
- **Process**: graph traversal + TypeScript template assembly
- **Output**: executable TS with helpers + step impls
- **Secrets**: UI uses `{{SECRET_NAME}}` → compiler converts to server-side secret resolution.
- **Never** hardcode secrets in generated code.

## Adding a Node Type (required steps)
1. **Sidebar**: add to `components/sidebar.tsx`
2. **UI**: create/update node UI in `components/nodes/*`
3. **Compiler**: add codegen logic in `lib/workflow-generator.ts`
4. **Validation**: update `lib/workflow-validator.ts` (required fields)
5. **Simulation**: update `lib/workflow-simulator.ts` (mock behavior)

## Conventions & Rules
- **Styling**: Tailwind only (no CSS modules unless explicitly requested)
- **Icons**: `lucide-react`
- **State**: keep local; context only when needed
- **Determinism**: codegen must be deterministic and valid TS
- **Filesystem**: add files only under `app/`, `components/`, `lib/`, `hooks/`, or `workflows/` unless justified
- **Tests**: prefer Vitest for logic-heavy modules

## Common Tasks (Fast Path)
- **Add node** → sidebar → node UI → generator → validator → simulator
- **Fix execution bug** → inspect `lib/workflow-generator.ts` first
- **UI updates** → `flow-builder.tsx` or module components
- **Autonomy fixes** → `components/autonomy/*` + `app/actions/autonomy`
