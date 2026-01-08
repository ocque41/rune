# Changelog

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
