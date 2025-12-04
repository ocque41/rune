# Side Project Ideas - Workflow Builder

A powerful, visual workflow automation tool built with Next.js and React Flow. This application allows users to create, configure, and execute automated workflows using a drag-and-drop interface.

---

## 📑 Table of Contents

1.  [Project Overview](#-project-overview)
2.  [Tech Stack](#-tech-stack)
3.  [Getting Started](#-getting-started)
4.  [Project Structure](#-project-structure)
5.  [Architecture Deep Dive](#-architecture-deep-dive)
6.  [Development Rules](#-development-rules)
7.  [Contributing Guide](#-contributing-guide)

---

## 🚀 Project Overview

This project is a "Side Project Ideas" generator and manager, but under the hood, it's a sophisticated workflow engine. It enables users to:
-   **Visually build workflows**: Drag and drop nodes to create logic.
-   **Configure steps**: Set up HTTP requests, database queries, emails, and more.
-   **Generate code**: The visual graph is compiled into executable TypeScript code.
-   **Manage Secrets**: Securely handle API keys and credentials.

---

## 🛠️ Tech Stack

| Category | Technology | Notes |
| :--- | :--- | :--- |
| **Framework** | [Next.js 15+](https://nextjs.org/) | App Router used exclusively. |
| **UI Library** | [React](https://react.dev/) | Functional components & Hooks. |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | No custom CSS files allowed. |
| **Flow Engine** | [@xyflow/react](https://reactflow.dev/) | Handles the graph visualization. |
| **Icons** | [Lucide React](https://lucide.dev/) | Standard icon set. |
| **Runtime** | Custom `workflow` package | Internal package for execution. |

---

## 🏁 Getting Started

### Prerequisites

-   Node.js 18+
-   npm, yarn, pnpm, or bun

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd side-project-ideas
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Open the app**:
    Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```
├── app/                  # Next.js App Router pages and layouts
│   ├── api/              # API routes (Backend logic)
│   ├── docs/             # User documentation
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main application page (Workflow Builder)
├── components/           # React components
│   ├── nodes/            # Custom React Flow nodes (StepNode, etc.)
│   ├── flow-builder.tsx  # Main Flow Builder component
│   ├── sidebar.tsx       # Sidebar with node palette and secrets
│   └── ...
├── lib/                  # Utility functions and core logic
│   └── workflow-generator.ts # Logic to compile graph to code
├── workflows/            # Generated workflow files
├── public/               # Static assets
└── agents.md             # AI Agent Context & Documentation
```

---

## 🏗️ Architecture Deep Dive

### Flow Builder (`components/flow-builder.tsx`)
The core component that integrates `@xyflow/react`. It handles:
-   Rendering the node graph.
-   Managing node state and connections.
-   Handling drag-and-drop interactions.

### Workflow Generator (`lib/workflow-generator.ts`)
This is the "compiler" of the application. It takes the visual graph (nodes and edges) and transforms it into executable TypeScript code.
-   **Process**: Topological Sort -> Code Generation -> String Output.
-   **Key Function**: `generateWorkflowCode(nodes, edges)`

### Custom Nodes (`components/nodes/`)
We use custom node types to provide a rich UI for workflow steps.
-   **StepNode**: A generic node wrapper that renders different content based on the step type (e.g., inputs for URL, headers, SQL query).

---

## 📏 Development Rules

All developers (human and AI) must adhere to these rules:

### 1. Styling
-   **DO** use Tailwind CSS for all styling.
-   **DO NOT** use inline styles or external CSS files (except `globals.css`).
-   **DO** ensure responsiveness for mobile and desktop.

### 2. State Management
-   **DO** use React Context for global UI state if needed.
-   **DO NOT** introduce Redux or MobX.
-   **DO** keep state as local as possible.

### 3. Workflow Logic
-   **DO** update `workflow-generator.ts` whenever a new node type is added.
-   **DO NOT** hardcode secrets in the generator code. Always use `getSecret()`.
-   **DO** ensure generated code is valid TypeScript.

### 4. Code Quality
-   **DO** use TypeScript for everything.
-   **DO NOT** use `any` unless absolutely necessary.
-   **DO** run `npm run lint` before committing.

---

## 🤝 Contributing Guide

1.  **Fork the repository**.
2.  **Create a feature branch**:
    ```bash
    git checkout -b feature/amazing-feature
    ```
3.  **Implement your changes** following the [Development Rules](#-development-rules).
4.  **Commit your changes**:
    ```bash
    git commit -m 'feat: Add some amazing feature'
    ```
5.  **Push to the branch**:
    ```bash
    git push origin feature/amazing-feature
    ```
6.  **Open a Pull Request**.

---

*Documentation last updated: December 2025*
