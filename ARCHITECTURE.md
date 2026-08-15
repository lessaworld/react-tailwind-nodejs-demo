# How this app is built

**Docs:** [README](README.md) | [Tech Primer](TECH_PRIMER.md) | [Tailwind](TAILWIND.md) | [React](REACT.md) | [Node.js](NODEJS.md)

A quick tour of how the pieces fit together: a Node/Express API, a
Vite/React/Tailwind frontend, and Recharts for the two charts. One Docker
image, one port, no database.

## Why one server, not two

Express serves the JSON API under `/api/*` and, in production, the built
React app for everything else. No separate frontend server, no nginx, no
`docker-compose.yml`. Same origin means zero CORS configuration, anywhere,
because the browser only ever talks to the server it was served from.

```
repo-root/
  client/              Vite + React + Tailwind
    src/
      components/       Nav, StatTile, MonthlyBarChart (shared)
      views/             Explorer, Dashboard, VendorLookup
      lib/               api.js (fetch helpers), format.js
  server/              Express
    data/               fy2025-awards.json (baked into the image)
    routes/api.js
    data.js              loads the JSON + computes rollups at startup
    index.js             entrypoint; serves client/dist in production
  Dockerfile           multi-stage build
  .dockerignore
```

## The server: one JSON file, one module, a handful of routes

There's no database. The dataset (~124,000 FY2025 contract transactions to
foreign vendors) lives in a single JSON file, `server/data/fy2025-awards.json`,
baked into the Docker image. On boot, `server/data.js` reads it once with
`JSON.parse` and keeps it as a plain array in memory:

```js
export const awards = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
```

~124k small objects is nothing for Node to hold in memory, and looping over
the array to filter or aggregate takes single-digit milliseconds. So instead
of a database, `data.js` is a set of plain functions that `filter`, `reduce`,
and build `Map`s over that array on demand: `queryAwards()` for the
searchable table, `getMonthlyRollup()` for the dashboard, `getVendorProfile()`
for a vendor's stats, and so on. A couple of rollups used on nearly every
page load (the country list, vendors-per-country) are computed once at
startup; everything else is computed per request.

Worth knowing: USASpending's export has two dollar fields that both look
like "the amount." `total_dollars_obligated` looks like a grand total, but
it's a cumulative figure repeated across every row of a given award; summing
it would multiply-count anything with modifications. The field that's safe
to sum is `federal_action_obligation`, the per-transaction delta.

`server/routes/api.js` is a thin layer on top: one Express route per UI
need, each pulling query params off `req.query` and handing them to a
`data.js` function. No data manipulation happens in the routes themselves.

## API

| Route | Purpose |
|---|---|
| `GET /api/awards` | Filtered/sorted/paginated award transactions. Query: `q`, `agency`, `category`, `country`, `minAmount`, `maxAmount`, `sort` (`actionDate`\|`amount`), `order` (`asc`\|`desc`), `page`, `pageSize` |
| `GET /api/awards/monthly` | FY2025 Oct–Sep totals. Optional `recipient`, `agency`, `country` |
| `GET /api/awards/breakdown` | Top-N totals by `agency` or `country` (`by=`), respecting the other filter |
| `GET /api/filters` | Distinct agencies/categories/countries, for filter dropdowns |
| `GET /api/countries` | Countries sorted by total spend (Vendor Lookup step 1) |
| `GET /api/countries/:country/vendors` | Vendors in a country, sorted by total spend (step 2) |
| `GET /api/vendors/:recipient` | Full vendor profile: totals, agencies, categories, monthly trend |

## The client: Vite, React, and not much else

Vite runs the dev server (with hot-module-reload) and produces the
production build (`client/dist`) that the Dockerfile copies into the final
image. In dev, it also proxies `/api/*` requests to Express on `:3000`.

React is used plainly: function components, `useState` and `useEffect`, no
Redux, no router. Three fixed views means `App.jsx` just keeps the active
tab in state and renders one of three components; each view fetches its own
data with a `useEffect` and a small wrapper function from `lib/api.js`.

Two effects do more than "fetch on mount": the Explorer's search box is
debounced (a local keystroke-tracking state updates a separate, fetch-
triggering state only after 300ms of no typing, so searching 124k rows
doesn't fire a request per character), and Vendor Lookup is a real cascade
(picking a country clears whatever vendor/profile was selected for the
previous one before loading the new country's vendor list).

## Tailwind, and making charts match the page

Tailwind CSS v4 is wired in via the `@tailwindcss/vite` plugin, no separate
PostCSS config needed. A small set of design tokens (`--surface`, `--ink`,
`--accent`, etc.) are defined as CSS custom properties, redefined under
`prefers-color-scheme: dark`, and exposed to Tailwind's `@theme`: that's
what makes `bg-surface` or `text-ink` work as utilities while the colors
flip automatically in dark mode.

The Recharts bar charts read the same CSS variables for their fills and
gridlines (`fill="var(--accent-1)"` instead of a hardcoded hex), so they
follow dark mode too without any chart-specific theming logic. Both charts
stick to a single hue on purpose: it's one measure (dollars) per bar, so
color isn't carrying any identity, and the axis labels already say what
each bar is.

## Packages, the short list

**Express** for the server, **Vite** + **React** for the client, **Tailwind
CSS v4** for styling, **Recharts** for the charts. The one-time CSV-to-JSON
shaping step (not shipped in this repo) uses nothing beyond Python's
standard library. No state management library, no UI kit, no ORM.

## Shipping it

The Dockerfile has two stages. Stage one is a Node image that runs
`npm run build` on the client. Stage two starts fresh, installs only the
server's production dependencies, and copies in the built `client/dist`
from stage one. Vite and the client's `node_modules` never reach the final
image, so what ships is small and carries no build tooling.

`docker build -t spend-explorer .`, then `docker run -p 3000:3000
spend-explorer`. One image, one port, one command.
