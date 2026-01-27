# Branding Research

## Current State
- **Tailwind**: v4.0.0 (Alpha/Beta based on package.json `^4`).
- **Fonts**: Currently loading local TTF files via standard CSS `@font-face`.
- **Colors**: Indirect mapping system (`--bg: var(--rune-bg)`).

## Requirements vs Reality
1. **Fonts**: Spec asks for `next/font/local`. Current implementation uses raw CSS `@font-face` which misses out on Next.js optimization (preloading, layout shift protection).
2. **Colors**: Need to ensure `#141414` (Background) and `#F0EEE9` (Text) are strictly enforced.

## Tailwind v4 Theming
In v4, the theme is defined in CSS using `@theme`.
```css
@theme {
  --color-background: #141414;
  --color-foreground: #F0EEE9;
  --font-family-mono: "Anonymous Pro", monospace;
}
```

## Shadcn/UI Compatibility
Shadcn usually expects:
```css
:root {
  --background: 0 0% 100%; /* HSL */
  --foreground: 222.2 84% 4.9%;
}
```
We need to map our hex values to the format expected by Shadcn (usually HSL for opacity modifiers) OR update the tailwind config to use the variables directly without `<alpha-value>`.
Given Tailwind v4, we might just define the colors directly.

## Action Plan
1. **Migrate Fonts**: Create `app/fonts.ts` using `next/font/local`.
2. **Refactor `globals.css`**: 
   - Remove manual `@font-face`.
   - Update `:root` to define Shadcn-compatible variables (HSL or exact hex if we accept losing opacity utility classes for some tokens).
   - Use `@theme` block for Tailwind v4 integration.
