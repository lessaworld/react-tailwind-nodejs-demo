# React: where it's used and how

**Docs:** [README](README.md) | [Architecture](ARCHITECTURE.md) | [Tech Primer](TECH_PRIMER.md) | [Tailwind](TAILWIND.md) | [Node.js](NODEJS.md)

## Why React here

The app is three fixed views over one dataset, each with its own filters,
fetches, and local state. That's a natural fit for React's component model:
one component per view, small state hooks instead of a global store, and no
need for anything heavier. Scaffolding with Vite (rather than
Create React App) is what gives the fast dev-server reload and the
production build that gets baked into the Docker image.

## 1. Entry point and mounting

Vite's template wiring: [main.jsx](client/src/main.jsx) calls
`createRoot(...).render(<App />)` into the single `<div id="root">` in
[index.html](client/index.html). Everything the app renders comes from
that one call.

## 2. No router, no global state library

[App.jsx](client/src/App.jsx) holds exactly one piece of state, the active
tab, in a plain `useState`:

```js
const [tab, setTab] = useState('dashboard')
```

(Dashboard is the default landing tab, on purpose: a chart makes a better
first impression than an empty-looking table.) It then conditionally
renders `<Explorer />`, `<Dashboard />`, or `<VendorLookup />` based on
that value. With only three views, pulling in
`react-router` would be solving a problem the app doesn't have. Likewise
there's no Redux or Context API: every view fetches and owns its own data,
so there's nothing that actually needs to be shared globally.

## 3. Function components + hooks, that's the whole toolkit

Every component in `client/src/` is a function component. The only hooks
used anywhere are `useState` and `useEffect`:

- `useState` holds local UI state: filter values, the current page, which
  country/vendor is selected, whether a modal is open.
- `useEffect` triggers data fetching whenever that state changes, and
  cleans up after itself where it matters (the debounce timer below).

Two effects are worth calling out specifically:

- **Debounced search**, in [Explorer.jsx](client/src/views/Explorer.jsx):
  typing updates a local `qInput` state on every keystroke, but a second
  effect only copies that into the state that actually triggers a fetch
  after 300ms of no typing, so searching ~124k rows doesn't fire a request
  per character.
- **Cascading selects**, in
  [VendorLookup.jsx](client/src/views/VendorLookup.jsx): picking a country
  fetches that country's vendor list *and* resets whatever vendor/profile
  was previously selected, so switching countries can't leave a stale
  profile on screen from the last one.

## 4. Composition: small, reusable pieces

A few components are shared across views rather than duplicated:

- [Nav.jsx](client/src/components/Nav.jsx): the top tab bar, used once in
  `App.jsx`.
- [StatTile.jsx](client/src/components/StatTile.jsx): the small
  label/value cards, reused across Vendor Lookup's profile panel.
- [MonthlyBarChart.jsx](client/src/components/MonthlyBarChart.jsx): the
  FY2025 monthly bar chart, used by both the Dashboard (overall spend) and
  Vendor Lookup (one vendor's spend) with different data passed in as
  props.
- [LandingModal.jsx](client/src/components/LandingModal.jsx): the welcome
  overlay, mounted once at the top of `App.jsx`.

## 5. Data fetching pattern

There's no data-fetching library (no React Query, no SWR). Each view calls
a small wrapper function from [lib/api.js](client/src/lib/api.js) inside a
`useEffect`, and stores the result in `useState`:

```js
useEffect(() => {
  fetchAwards({ ...filters, sort, order, page, pageSize }).then(setResult)
}, [filters, sort, order, page])
```

The dependency array is what makes this declarative: any time a filter,
the sort, or the page changes, React re-runs the effect and re-fetches.
Nothing manually wires up event handlers to trigger fetches.

## 6. Charts as React components

Recharts (`<BarChart>`, `<Bar>`, `<XAxis>`, `<Tooltip>`, etc.) is used the
same way as any other React library: composed as JSX inside
[MonthlyBarChart.jsx](client/src/components/MonthlyBarChart.jsx) and the
breakdown chart in [Dashboard.jsx](client/src/views/Dashboard.jsx), with
data passed in as a plain array prop. Recharts handles the SVG rendering;
the app just feeds it the already-aggregated data from the API.

Vendor Lookup's country-level view uses the same package's `<PieChart>` /
`<Pie>` / `<Cell>` components for a top-10-vendors-plus-"Others" breakdown,
shown while a country is selected but no vendor is yet. Since it's the same
`recharts` dependency already installed for the bar charts, this didn't add
a new package.
