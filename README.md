# FY2025 Foreign Contractor Spend Explorer

**[Live demo](http://spend-demo.lessaworld.online/)**

A web app for exploring U.S. federal contract awards to foreign vendors in
fiscal year 2025: who the U.S. government bought from overseas, what for,
and how much. Node.js/Express on the backend, React (Vite) + Tailwind on the
frontend, Recharts for the charts, and a single-container Docker build.

Three views over one dataset:

1. **Purchase Order Explorer**: a searchable, filterable, sortable table of
   individual award transactions (free-text search, agency/category/country
   filters, amount range, pagination).
2. **Monthly Spend Dashboard**: FY2025 spend by month, plus a top-10
   breakdown by agency or by country, both filterable.
3. **Vendor Lookup**: pick a country, then a vendor within it, and see that
   vendor's full FY2025 profile: total spend, distinct award count, agencies
   sold to, top categories, and its own monthly trend.

## About the dataset

Rather than a handful of household-name contractors, this app is built
around every FY2025 federal prime contract awarded to a vendor located
outside the United States, a broader and more realistic dataset to search:
**~124,000 transaction rows across 6,871 vendors in 181 countries, worth
$16.7B**. Most of it is Department of Defense logistics (fuel, food
service, ship chandlery, base support) for installations overseas, plus
contracts with foreign defense manufacturers like Kongsberg, BAE Systems,
and Leonardo.

That scope is also why Vendor Lookup drills down **country first, then
vendor**: with thousands of vendors, browsing by country and then by vendor
within it is a far more usable way to explore than one flat list.

## Data source

All award data comes from [USASpending.gov](https://www.usaspending.gov)'s
Custom Award Data (Advanced Search) tool, the U.S. Treasury's public, free
source for federal spending records; no API key required. The export used
here is scoped to: award type = contracts, action date within FY2025
(Oct 1, 2024 – Sep 30, 2025), recipient location = outside the United
States.

This is a one-time offline export, not a live integration. The raw export
was cleaned up, trimmed down to the handful of fields the app actually
needs, and reshaped into the compact JSON file it ships with
(`server/data/fy2025-awards.json`) using a short Python script that isn't
part of this repo. Express loads that JSON once at startup and computes
every rollup (by country, vendor, month, agency) in memory; the dataset
is small enough that this takes well under a second, so there's no database.

## Architecture

**One container. Express serves both the API and the built React app**: no
second container, no nginx, no docker-compose, no CORS configuration
anywhere in the project, because in production it's all one origin.

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

The multi-stage Dockerfile builds the frontend in a Node image (stage 1),
then copies only the built `client/dist` static files into a fresh runtime
image (stage 2) that installs just the server's production dependencies.
Vite and the client's `node_modules` never end up in the runtime image:
smaller image, no build tooling shipped to production.

## Running in development

Two terminals, no Docker involved during development:

```bash
# terminal 1
cd server && npm install && npm run dev      # Express on :3000

# terminal 2
cd client && npm install && npm run dev      # Vite dev server, usually :5173
```

Vite's dev server proxies `/api/*` requests to `http://localhost:3000` (see
`client/vite.config.js`), so the browser only ever talks to one origin and
there's no CORS setup to maintain. Open whatever URL Vite prints.

## Running the packaged app (Docker)

```bash
docker build -t spend-explorer .
docker run -p 3000:3000 spend-explorer
```

Open `http://localhost:3000`. One image, one port, one command: Express
serves the API under `/api/*` and the built React app for everything else.

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
