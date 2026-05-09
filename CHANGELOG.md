# Changelog

## [1.0.0] - 2026-05-09

Rune 1.0.0 is the first official open-source release. It keeps the hosted product functional while making the public repository safe to publish: model calls are per-user BYOK, secrets never come back through the UI or API, generated artifacts are removed from the tree, and the release gate now checks tests, build, lint, and secret exposure.

### Open Source
- **MIT license** — added the MIT license for Cumulus, cumulush.com, and hi@cumulush.com.
- **Public setup** — added clear README, SECURITY, and `.env.example` files for Supabase-backed local setup.
- **Local auth package** — moved `@cumulus/auth` into the repository so installs do not depend on a private package or token.
- **Generated artifact cleanup** — removed tracked build/runtime output and ignored generated caches going forward.

### BYOK
- **Hosted provider keys** — replaced shared `GOOGLE_API_KEY`, `OPENAI_API_KEY`, and `ANTHROPIC_API_KEY` model-call usage with per-user secret lookup.
- **Provider key references** — added `providerKeyRef` to agent and AI-node config so settings store only secret names.
- **Secrets API safety** — kept `/api/rune/secrets` as the only user-facing secret API and removed routes that returned secret values.
- **Secrets drawer safety** — removed reveal controls and made create/update flows clear entered values immediately.
- **Production encryption** — made Supabase-backed secrets fail closed without `RUNE_SECRETS_ENCRYPTION_KEY`.

### Security
- **Secret policy** — added shared inline-secret blocking and redaction for save, deploy, export, runtime logs, run storage, tool execution, and generated outputs.
- **Workflow generation** — fixed generated workflow secret placeholders so `{{SECRET_NAME}}` and `{{secrets.NAME}}` resolve server-side without compiling raw values.
- **Secret scanning** — added current-tree and full-history secret scans that report file paths and reasons without printing secret values.
- **CI gate** — added GitHub Actions for secret scanning, lint, tests, and build.

### Autonomy
- **Autonomy settings crash** — fixed the `/autonomy` settings page by providing Radix tooltips from the root layout.
- **Autonomy BYOK** — moved autonomy planning and triage to user-owned Google provider keys.

### Verification
- **Secret safety tests** — added coverage for secrets API responses, encryption failure, BYOK resolution, generated secret references, export blocking, and log redaction.
- **Release matrix** — verified secret scan, history scan, tests, lint, and production build before tagging.

## [Unreleased] - 2026-01-08

### Added
- **Playground Library Packaging**: Created `vite.config.lib.ts` and `components/playground/index.ts` entry point for building the playground as a standalone library.
- **UI Component Library**: Added shadcn-style UI components (`Button`, `Input`, `Select`, `Tabs`, `Slider`, `Switch`, `Dialog`, `Card`, `Alert`, etc.) to `components/ui/`.
- **Theme System**: Created `components/playground/styles/theme.css` with design tokens and integrated it into `app/globals.css`.
- **State Management**: Implemented Zustand store (`useAgentStore`) with localStorage persistence for agent configuration.
- **API Endpoints**: Added `/api/rune/chat`, `/api/rune/tools`, `/api/rune/snapshots` for playground functionality.

### Changed
- **AutoPilotContainer**: Refactored to use Zustand store instead of prop drilling for config state.
- **ShimmeringJunoConfig**: Updated `onChange` signature to accept `Partial<LLMConfig>` for simpler updates.
- **flow-builder.tsx**: Fixed syntax errors (malformed fetch call, duplicate object properties).
- **Playground Layout**: Updated import paths to use relative paths instead of `@/` aliases for portability.

### Removed
- Standalone Next.js configuration files from `components/playground/` (now using parent project config).
- Cached `.next` build artifacts and `node_modules` from playground subdirectory.
- Duplicate code blocks in `flow-builder.tsx`.

### Fixed
- TypeScript compilation errors in `flow-builder.tsx` (lines 475-525).
- Import path for `ThemeProvider` in playground layout.
- Missing UI component dependencies for library build.
