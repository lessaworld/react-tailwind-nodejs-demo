# Tailwind: where it's used and how

**Docs:** [README](README.md) | [Architecture](ARCHITECTURE.md) | [Tech Primer](TECH_PRIMER.md) | [React](REACT.md) | [Node.js](NODEJS.md)

Tailwind shows up in three layers in this codebase: how it's installed, a
small custom theme on top of it, and then utility classes used directly in
every component's JSX.

## 1. Installed as a Vite plugin, no separate config file

Tailwind v4 ditches the old `tailwind.config.js` + PostCSS setup. Here it's
wired in as a Vite plugin in [client/vite.config.js](client/vite.config.js):

```js
import tailwindcss from '@tailwindcss/vite'
plugins: [react(), tailwindcss()]
```

and turned on with one line at the top of
[client/src/index.css](client/src/index.css#L1):

```css
@import "tailwindcss";
```

That's the entire setup. `index.css` is imported once, in
[main.jsx](client/src/main.jsx#L3), so it applies globally.

## 2. A small custom theme layered on top

Right below that import,
[index.css](client/src/index.css#L3-L12) defines a handful of design tokens
(`--color-surface`, `--color-ink`, `--color-accent`, etc.) via Tailwind's
`@theme` block, pointing at plain CSS custom properties. Those custom
properties are defined twice: once under `:root` for light mode, once under
`@media (prefers-color-scheme: dark)` with different hex values
([index.css:14-36](client/src/index.css#L14-L36)).

The payoff: because `@theme` registered them, Tailwind generates real
utility classes from them, so `bg-surface`, `text-ink`, `text-muted`,
`border-hairline`, `bg-accent` etc. are usable everywhere as if they were
built-in Tailwind colors, and they silently repaint for dark mode with zero
JS or theme-switching logic.

## 3. Utility classes doing the actual styling, everywhere

Every component's `className` is Tailwind utilities, no separate CSS files.
A few representative spots:

- [Nav.jsx](client/src/components/Nav.jsx): the tab bar uses `border-b-2`
  plus conditional `border-accent text-ink` vs `border-transparent
  text-muted` to show which tab is active.
- [Explorer.jsx](client/src/views/Explorer.jsx): the filter row
  (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) and the table
  (`overflow-x-auto`, `whitespace-nowrap`, `tabular-nums` on the amount
  column so digits align).
- [StatTile.jsx](client/src/components/StatTile.jsx) and
  [LandingModal.jsx](client/src/components/LandingModal.jsx): small
  cards/overlays built entirely from `rounded-lg border p-6 shadow-lg`
  style utility stacks, no custom CSS at all.
- [App.jsx](client/src/App.jsx): page-level layout (`min-h-screen`,
  `max-w-6xl mx-auto px-4`).

## The one place Tailwind isn't doing the styling

The Recharts bar charts
([MonthlyBarChart.jsx](client/src/components/MonthlyBarChart.jsx)) render
SVG, not HTML, so they can't take `className` utilities for things like bar
color. Instead they reference the same CSS variables Tailwind's theme is
built from directly, e.g. `fill="var(--accent-1)"`. So the charts aren't
technically using Tailwind, but they stay visually in sync with it
(including dark mode) because they pull from the identical token source.
