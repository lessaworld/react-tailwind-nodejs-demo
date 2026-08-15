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
renders `<AwardExplorer />`, `<Dashboard />`, or `<CountryExplorer />` based on
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

- **Debounced search**, in [AwardExplorer.jsx](client/src/views/AwardExplorer.jsx):
  typing updates a local `qInput` state on every keystroke, but a second
  effect only copies that into the state that actually triggers a fetch
  after 300ms of no typing, so searching ~124k rows doesn't fire a request
  per character.
- **Cascading selects**, in
  [CountryExplorer.jsx](client/src/views/CountryExplorer.jsx): picking a country
  fetches that country's vendor list *and* resets whatever vendor/profile
  was previously selected, so switching countries can't leave a stale
  profile on screen from the last one. This cascade doesn't care *how*
  `country`/`recipient` got set: the `<select>`'s `onChange` and a click on
  a pie slice or ranked-list row both just call the same `setCountry` /
  `setRecipient`, so both paths trigger the identical fetch-and-reset
  behavior with no extra code.

## 4. Composition: small, reusable pieces

A few components are shared across views rather than duplicated:

- [Nav.jsx](client/src/components/Nav.jsx): the top tab bar, used once in
  `App.jsx`.
- [StatTile.jsx](client/src/components/StatTile.jsx): the small
  label/value cards, reused across Country Explorer's vendor profile panel.
- [MonthlyBarChart.jsx](client/src/components/MonthlyBarChart.jsx): the
  FY2025 monthly bar chart, used by both the Dashboard (overall spend) and
  Country Explorer (one vendor's spend) with different data passed in as
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

Country Explorer uses the same package's `<PieChart>` / `<Pie>` / `<Cell>`
components for a top-10-plus-"Others" breakdown, by country before any
dropdown is touched, then by vendor once a country is picked. Since it's
the same `recharts` dependency already installed for the bar charts, this
didn't add a new package. Both cases share one `BreakdownOverview`
component in [CountryExplorer.jsx](client/src/views/CountryExplorer.jsx), fed
either the `countries` or `vendors` list; a `colorForSlice()` helper picks
each slice's color by rank and gets handed to `RankedList` too (as a
`colorFor` prop it renders as a small swatch), so the chart and its legend
list always agree on which color means which entity without either one
hardcoding the other's colors. An `onSelect` prop rides along the same
path, so clicking a slice or a list row calls the exact `setCountry` /
`setRecipient` the dropdown above would have.
