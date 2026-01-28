# Verification Checklist - Rune Inspect Tab

## 1. Visual & Brand
- [ ] **Background**: Confirm `#141414` background is seamless (no white flickering on load).
- [ ] **Fonts**: Confirm `Anonymous Pro` is used for all numbers and headers (`font-mono`).
- [ ] **Theme**: Verify `dark` mode is forced (text is `#F0EEE9`).

## 2. Layout & Responsive
- [ ] **Grid**: Verify Overview Cards stack on mobile (1 col) and expand on desktop (4 cols).
- [ ] **Tables**: Verify Breakdown tables sit side-by-side on desktop.
- [ ] **Height**: Verify page does not double-scroll (main container handles overflow).

## 3. Interaction & Animation
- [ ] **Entry**: Cards should stagger in from bottom-up (~100ms delay between them).
- [ ] **Counters**: Numbers should count up from 0 on first load (AnimeJS).
- [ ] **Tab Switching**: Switching Drilldown tabs (Calls -> Tools) should be instant.
- [ ] **Search**: Typing in search box should filter the drilldown list immediately.

## 4. Data Mocking
- [ ] **Progress Bars**: Check if progress bars in Breakdown view render showing relative percentage.
- [ ] **Dates**: Confirm timestamps are localized (Browser time).
- [ ] **Status Dots**: Green for success, Red for failure, Amber for running/pending.

## 5. Performance
- [ ] **Skeletons**: Refresh the page. Observe Skeleton placeholders appearing before data (simulated 800ms delay).
- [ ] **Layout Shift**: Ensure no elements "jump" after fonts load (CLS).
