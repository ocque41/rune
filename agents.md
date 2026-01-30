# agents.md — Side Project Ideas

## Purpose
Provide AI agents a fast, accurate map of the codebase and the rules for contributing.

## Product Summary
A visual **Workflow Builder** that lets users assemble node-based workflows and execute them.

## Tech Stack
- Next.js 15 (App Router)
- React
- Tailwind CSS
- @xyflow/react (React Flow)

## Codebase Map
**Critical paths**
- `app/`
  - `page.tsx` — main editor UI
  - `api/` — save/run workflow endpoints
  - `docs/` — user docs
- `components/`
  - `flow-builder.tsx` — **core canvas state + React Flow instance**
  - `sidebar.tsx` — node palette (available nodes)
  - `nodes/` — custom node UIs (e.g., `step-node.tsx`)
- `lib/`
  - `workflow-generator.ts` — **compiler**: graph → executable TS

## Architecture & Rules
### Compiler Pattern
- **Input**: nodes/edges JSON from React Flow
- **Process**: topological sort + code string generation
- **Output**: valid TypeScript that imports workflow runtime helpers

### Secrets
- UI syntax: `{{SECRET_NAME}}`
- Generated code: `${getSecret("SECRET_NAME")}`
- **Never hardcode secrets.**

### Adding a Node Type (required steps)
1. **Sidebar**: add definition in `components/sidebar.tsx` (type, label, defaults)
2. **UI**: ensure `components/nodes/step-node.tsx` renders inputs
3. **Codegen**: handle new `type` in `lib/workflow-generator.ts`

## Conventions
- **Styling**: Tailwind only (no CSS modules / styled-components unless asked)
- **Icons**: `lucide-react`
- **State**: local state or React Context (avoid Redux/Zustand unless necessary)
- **Codegen**: deterministic, pure, valid TypeScript; use template literals
- **Filesystem**: create files only in `app/`, `components/`, `lib/`, or `workflows/` unless justified

## Common Tasks (quick path)
- **Add node type** → `sidebar.tsx` → `step-node.tsx` → `workflow-generator.ts`
- **Fix execution bug** → inspect `lib/workflow-generator.ts` first
- **Update UI** → `flow-builder.tsx` or `sidebar.tsx` (Tailwind, responsive)
