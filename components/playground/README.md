# Rune Playground Integration

This directory contains the standalone Rune Playground components.

## Theming

To correctly style the playground components when importing them into another application, you must include the base theme file.

### Usage

1. **Import the CSS**:
   Import `theme.css` in your application's global CSS file (e.g., `globals.css` or `styles.css`).

   ```css
   @import "./path/to/rune/components/playground/styles/theme.css";
   ```

2. **Tailwind Configuration (Optional)**:
   If your host application uses Tailwind CSS, ensure that the content paths include the playground components so that utility classes are generated.

   ```ts
   // tailwind.config.ts
   export default {
     content: [
       // ... other paths
       "./path/to/rune/components/playground/**/*.{ts,tsx}",
     ],
     // ...
   }
   ```
