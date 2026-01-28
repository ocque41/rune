# Rune Auto-Brand Implementation

## Overview
This document details the implementation of the "Auto-Brand" design system for the Rune Autonomy Engine. The goal was to unify the UI with a premium, monochrome, high-contrast aesthetic.

## Architecture

### 1. Global Tokens (`globals.css`)
We adopted a token-based system mapped to Tailwind utility classes.
- **Background**: `#141414` (Deep Black)
- **Foreground**: `#F0EEE9` (Off-White)
- **Primary**: `#F0EEE9` (High Contrast)
- **Muted**: `#2A2A2A` (Subtle Dark Gray)

### 2. Typography
- **Font**: `Anonymous Pro` (via `next/font/local` variable `--font-anonymous`)
- Applied globally to `body` and all headings.

### 3. Component Updates
All key autonomy components were refactored to use `bg-background`, `text-foreground`, and `border-border` instead of hardcoded hex values or generic slate colors.

- **Sidebar**: Branded navigation with active states using `bg-primary/10` and `text-primary`.
- **Job List**: Staggered entry animation, hover states (`hover:bg-muted/50`), and status icons.
- **Job Details**: Glassmorphism header, animated timeline, and refined typography.
- **Approvals**: Customized `shimmering-juno-config` and `approval-card`.

### 4. Micro-interactions
- **Animations**: `anime.js` integrated via `useEnterAnimation` hook.
  - Respects `prefers-reduced-motion`.
  - Staggered list entries (30ms-50ms delay).
- **Loading**: Custom `JobSkeleton` and `ListSkeleton` components.
- **Hover**: Consistent `transition-all` and `hover:border-foreground/20` effects.

## Accessibility
- **Contrast**: Checked against WCAG AA/AAA standards.
  - Normal Text: 17.5:1 (AAA)
  - Muted Text: ~5:1 (AA)
- **Focus**: `focus-visible` rings implemented on interactive elements.
- **Reduced Motion**: Animations explicitly disabled/instant when preferred.

## Verification
- **Build**: Validated via `pnpm build` (Next.js 16.1.5).
- **Types**: Fixed schema mismatches (`dedupe_key`, `rune_chats`) in `database.ts`.
