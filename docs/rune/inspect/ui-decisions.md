# Rune Inspect Tab - UI Decisions & Research

## 1. Brand Foundation
- **Colors**:
  - `bg-background`: `#141414` (Deep matte black)
  - `text-foreground`: `#F0EEE9` (Off-white/Beige)
  - **Decision**: Adhere strictly to these tokens. Avoid pure black `#000` or pure white `#FFF`.
  - **Components**: Use `glass-card` utility for panels (`rgba(20, 20, 20, 0.8)` + blur).
- **Typography**:
  - **Font**: `Anonymous Pro` (Monospace).
  - **Hierarchy**:
    - `H1`: Bold, Tracking tight (-0.05em), used for page titles.
    - `H2/H3`: Semi-bold, used for card headers.
    - `Body`: Regular, 14px/16px for data.
    - **Decision**: Enforce `font-family: var(--font-anonymous)` on all new components.
- **Icons**:
  - Use `lucide-react` with thin stroke widths (1.5px or 2px max) to match the technical aesthetic.

## 2. Layout Strategy (Inspect Tab)
- **Structure**:
  - **Top Bar**: Period selector (Pills: 24h, 7d, 30d). Right-aligned.
  - **Section A (Overview)**: Grid of `Card` components.
    - KPI Cards: Token Usage (Prompt/Output), Cost Est, Calls, Tools, Jobs.
    - Visual: Minimalist cards, large numbers, sparklines if possible (or just trend indicators for now).
  - **Section B (Breakdown)**: Two side-by-side tables.
    - Left: Usage by Model.
    - Right: Usage by Tool.
  - **Section C (Drilldown)**: Tabbed list view (Recent Calls | Recent Tools | Recent Jobs).
    - Infinite scroll or simple pagination.

## 3. Animation & "Speed Feel" (AnimeJS)
- **Goal**: Perceived performance. "Fast, not flowery".
- **Implementation**:
  - **Entry**: Staggered fade-in + slight slide-up (`translateY: 10px -> 0`) for cards.
  - **Tab Switch**: Instant switch with crossfade opacity.
  - **Micro-interactions**:
    - Hover on cards: Subtle scale up (1.01) or border glow.
    - Progress bars: Smooth easing from 0 to value.
  - **Loaders**: Skeleton loaders matching the exact layout of the content (Rectangles for text lines).

## 4. Technical Constraints
- **Next.js**: Use `next/font/local` (Already implemented).
- **Backend**: Mock data first. Define strict Typescript interfaces derived from expected Supabase/AI responses.
- **Shadcn/UI**: Use existing `components/ui` primitives where possible, but customized to match the `#141414` theme.

## 5. Accessibility
- **Contrast**: `#F0EEE9` on `#141414` passes AAA.
- **Motion**: Check `prefers-reduced-motion` before firing AnimeJS timelines.
