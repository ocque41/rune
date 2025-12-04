# AI Agent Documentation (`agents.md`)

This document is designed to provide AI agents with a high-level understanding of the "Side Project Ideas" codebase, its architecture, and the rules for contributing to it.

## 🧠 Context & Purpose

This application is a **Workflow Builder** for side project ideas. It allows users to visually construct workflows using nodes (steps) and execute them.
-   **Core Tech**: Next.js 15 (App Router), React, Tailwind CSS, `@xyflow/react` (React Flow).
-   **Primary Goal**: Enable users to build and run automation workflows visually.

## 🗺️ Codebase Map

### Critical Directories

-   **`app/`**: Next.js App Router pages.
    -   `page.tsx`: The main editor interface.
    -   `api/`: Backend API routes for saving/running workflows.
    -   `docs/`: User-facing documentation.
-   **`components/`**: React components.
    -   `flow-builder.tsx`: **CRITICAL**. The main canvas component that renders the flow.
    -   `sidebar.tsx`: The drag-and-drop palette for adding nodes.
    -   `nodes/`: Custom node definitions (e.g., `step-node.tsx`).
-   **`lib/`**: Core logic.
    -   `workflow-generator.ts`: **CRITICAL**. The "compiler" that turns the visual graph into executable TypeScript code.

### Key Files & Their Roles

| File | Role | AI Note |
| :--- | :--- | :--- |
| `lib/workflow-generator.ts` | Code Generator | **READ THIS FIRST** when modifying workflow logic. It defines how nodes are translated to code. |
| `components/flow-builder.tsx` | UI State Manager | Handles node state, connections, and the React Flow instance. |
| `components/sidebar.tsx` | Node Palette | Defines the list of available nodes users can drag onto the canvas. |
| `components/nodes/step-node.tsx` | Node UI | The visual representation of a node on the canvas (inputs, outputs). |

## 📐 Architecture & Patterns

### 1. The "Compiler" Pattern
The app works by compiling the visual graph into a standalone TypeScript file.
-   **Input**: A JSON object representing nodes and edges (from React Flow).
-   **Process**: `lib/workflow-generator.ts` sorts nodes topologically and generates code strings for each.
-   **Output**: A string of valid TypeScript code that imports `workflow` runtime helpers.

### 2. Secrets Management
-   **Syntax**: `{{SECRET_NAME}}` in the UI.
-   **Transformation**: Becomes `${getSecret("SECRET_NAME")}` in generated code.
-   **Rule**: NEVER hardcode secrets. ALWAYS use this pattern.

### 3. Node Registration Flow
To add a new node type (e.g., "Slack Message"):
1.  **UI**: Add the node definition to `components/sidebar.tsx` (type, label, default data).
2.  **Visuals**: Ensure `components/nodes/step-node.tsx` can render the inputs for this new type.
3.  **Logic**: Update `lib/workflow-generator.ts` to handle the new `type` case and generate the appropriate code.

## 📜 Coding Rules & Conventions

1.  **Styling**:
    -   **ALWAYS** use Tailwind CSS.
    -   **NEVER** use CSS modules or styled-components unless explicitly asked.
    -   Use `lucide-react` for icons.

2.  **State Management**:
    -   Use React Context or local state for UI.
    -   Avoid complex global state libraries (Redux, Zustand) unless the complexity demands it.

3.  **Code Generation (`workflow-generator.ts`)**:
    -   Keep this file **pure** and **deterministic**.
    -   Generated code must be valid TypeScript.
    -   Use template literals for code string generation.

4.  **Filesystem**:
    -   **DO NOT** create files outside of `app/`, `components/`, `lib/`, or `workflows/` without good reason.
    -   Keep components small and focused.

## 🤖 Common Tasks for Agents

-   **"Add a new node type"**:
    -   Check `sidebar.tsx` to add the item.
    -   Check `step-node.tsx` to add input fields.
    -   Check `workflow-generator.ts` to generate the code.

-   **"Fix a bug in execution"**:
    -   Look at `lib/workflow-generator.ts` first. The bug is likely in how the code is being generated.

-   **"Update the UI"**:
    -   Modify `components/flow-builder.tsx` or `components/sidebar.tsx`.
    -   Ensure responsiveness and Tailwind usage.
