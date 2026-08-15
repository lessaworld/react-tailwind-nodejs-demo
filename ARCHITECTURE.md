# How this app is built

I wanted to write up how the pieces of this thing fit together, partly so I
remember it myself in six months, partly because walking through your own
code is the best way to find out if you actually understand it. So here's a
tour of the client and the server, what each library is doing, and why I
made the calls I made.

The short version: it's a Node/Express API, a Vite/React/Tailwind frontend,
and Recharts for the two charts. One Docker image, one port, no database.
Here's the long version.

## Why one server, not two

The whole app is one Express process. It serves the JSON API under `/api/*`
and, in production, the built React app for everything else. No separate
frontend server, no nginx, no `docker-compose.yml`.

The payoff shows up immediately: same origin means zero CORS configuration,
anywhere. Not "CORS configured to allow the frontend": no CORS code at all,
because the browser only ever talks to the server it was served from. For a
project this size, that's one whole category of bugs I never had to think
about.

## The server: one JSON file, one module, a handful of routes

There's no database. The entire dataset (~124,000 FY2025 contract
transactions to foreign vendors) lives in a single JSON file,
`server/data/fy2025-awards.json`, baked straight into the Docker image. On
boot, `server/data.js` reads it once with `JSON.parse` and keeps it as a
plain array in memory:

```js
export const awards = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
```

That felt almost too simple when I wrote it, but it holds up: ~124k small
objects is nothing for Node to hold in memory, and looping over the whole
array to filter or aggregate takes single-digit milliseconds. So instead of
a database, `data.js` is just a set of plain functions that `Array.filter`,
`Array.reduce`, and build up `Map`s over that array on the fly, one per
question the UI needs answered: `queryAwards()` for the searchable table,
`getMonthlyRollup()` for the dashboard's bar chart, `getVendorProfile()` for
a single vendor's stats, and so on. A couple of rollups (the country list,
the vendors-per-country lists) get computed once at startup since almost
every page load touches them; everything else is computed per request,
because "per request" is still fast enough not to matter.

The one gotcha worth mentioning: USASpending's export has *two* dollar
fields that both look like "the amount." `total_dollars_obligated` is
tempting because it sounds like a grand total, but it turned out to be a
cumulative figure repeated across every row of a given award; summing it
would triple-count anything with a few modifications. The field that's
actually safe to sum is `federal_action_obligation`, the per-transaction
delta. That's the kind of thing you only catch by actually checking the
data instead of assuming, and it's now a comment directly on the line in
`data.js` that does the summing, so future-me doesn't "simplify" it back
into a bug.

`server/routes/api.js` sits on top of `data.js` as a thin translation layer:
one Express route per UI need, each one just pulling query params off
`req.query` and handing them to a `data.js` function. Nothing in there
manipulates the data directly; that split kept the routes readable and
kept the aggregation logic in one testable place.

## The client: Vite, React, and not much else

The frontend is scaffolded with Vite, which does two jobs: a dev server
with fast hot-module-reload while I'm working, and the production build
that spits out the static `client/dist` the Dockerfile copies into the
final image. In dev, Vite also proxies any `/api/*` request straight to
Express on `:3000`; that's the other half of the "no CORS" story, since it
means the browser talks to one origin (Vite's dev port) even before the
production build exists.

React itself is used about as plainly as it gets: function components,
`useState` and `useEffect`, no Redux, no React Query, no router. With
exactly three views (Explorer, Dashboard, Vendor Lookup), a router felt like
solving a problem I didn't have: `App.jsx` just keeps the active tab in a
`useState` and renders one of three components. Each view owns its own
fetching: an effect calls one of the small wrapper functions in
`lib/api.js`, the result lands in state, the JSX renders it. Nothing fancier
than that anywhere in the app.

A couple of the `useEffect`s are doing more interesting work than "fetch on
mount," though:

- The Explorer's search box is debounced: typing updates a local
  `qInput` state on every keystroke, but the state that actually triggers a
  fetch only updates 300ms after you stop typing. Otherwise every character
  would fire its own request against 124k rows.
- Vendor Lookup is a genuine cascade: picking a country fetches that
  country's vendor list *and* clears whatever vendor/profile was selected
  before, so switching countries can't leave a stale profile on screen from
  the last one.

## Tailwind, and making charts match the page

Styling is Tailwind CSS v4, wired in through `@tailwindcss/vite`: no
separate PostCSS config file needed, just a plugin in `vite.config.js` and
one `@import "tailwindcss"` at the top of `index.css`. On top of that I
defined a small set of design tokens as CSS custom properties (`--surface`,
`--ink`, `--accent`, and so on), redefined under a
`prefers-color-scheme: dark` block, and pointed Tailwind's `@theme` at them.
That's what makes `bg-surface` or `text-ink` work as utility classes while
the actual colors flip automatically in dark mode: one definition, no
theme-switching logic anywhere in the components.

The charts (Recharts, in `MonthlyBarChart.jsx` and the breakdown chart in
the Dashboard) read from those exact same CSS variables for their bars,
gridlines, and tooltips, using `fill="var(--accent-1)"` instead of a hardcoded
hex. So the charts pick up dark mode for free too, without a single
chart-specific theming line. Both charts also stick to one hue for their
bars deliberately: it's one series of data (dollars, by month or by
category), so color isn't doing any identity work: the axis labels already
say what each bar is, and adding more hues would just be decoration.

## Packages, the short list

That's most of the stack, but naming names: **Express** for the server,
**Vite** + **React** for the client, **Tailwind CSS v4** for styling,
**Recharts** for the two charts, and on the data-prep side (not shipped in
this repo) a bit of Python using nothing but the standard library's `csv`
and `json` modules (no pandas, because the shaping step is a straight
column-trim, not real data analysis). That's it. No state management library,
no UI kit, no ORM. For three views over one static JSON file, that list
covers everything the app actually needed, and not much else.

## Shipping it

The Dockerfile is two stages. Stage one is a Node image that runs
`npm run build` on the client and produces `client/dist`. Stage two starts
over from a *fresh* Node image, installs only the server's production
dependencies, and copies in that `dist` folder from stage one. Vite, the
client's `node_modules`, and every dev dependency never make it into the
final image: the thing that actually ships is small, and it doesn't carry
around a build toolchain it'll never use again after `docker build` finishes.

`docker build -t spend-explorer .`, then `docker run -p 3000:3000
spend-explorer`. One image, one port, one command.
