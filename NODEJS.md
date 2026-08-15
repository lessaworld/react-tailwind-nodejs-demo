# Node.js: where it's used and how

**Docs:** [README](README.md) | [Architecture](ARCHITECTURE.md) | [Tech Primer](TECH_PRIMER.md) | [Tailwind](TAILWIND.md) | [React](REACT.md)

## Why Node here

The whole point of the architecture is one server, one process, one
language on both ends: the frontend is JavaScript, so the backend being
JavaScript too means no context-switching, and Express is small enough that
the entire API fits in a handful of readable files. Given there's no
database and the data fits comfortably in memory, a full framework
(NestJS, Fastify with plugins, etc.) would be more machinery than this app
needs. Plain Express is enough.

## 1. Entry point: one Express app, two jobs

[server/index.js](server/index.js) does exactly two things: mount the API
router under `/api`, and serve the built React app for everything else.

```js
app.use('/api', apiRouter)
app.use(express.static(clientDist))
app.get('*', (req, res) => res.sendFile(...))
```

That last catch-all route is what makes client-side navigation work: any
URL that isn't `/api/*` gets the same `index.html`, and React takes it from
there. This is also *why* there's no CORS setup anywhere in the project:
whether in dev (via Vite's proxy) or production (this same server), the
browser only ever talks to one origin.

## 2. ES modules throughout, no build step for the server

[server/package.json](server/package.json#L5) sets `"type": "module"`, so
every server file uses `import`/`export` directly, no `require()`, and no
transpilation step (no Babel, no TypeScript compiler) between the source
and what Node runs. `node --watch index.js`
([server/package.json:8](server/package.json#L8)) is the entire dev loop:
Node's own built-in file-watcher restarts the process on save, so there's
no `nodemon` dependency either.

## 3. Data handling with nothing but Node's standard library

[server/data.js](server/data.js) loads the dataset with Node's built-in
`fs` module, once, at process startup:

```js
import { readFileSync } from 'node:fs'
export const awards = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
```

From there, everything is plain JavaScript: `Array.prototype.filter`,
`.reduce`, and native `Map`/`Set` build the rollups (by country, by vendor,
by month) that the API returns. No ORM, no query builder, no database
driver, because there's no database, just an array in memory that a
few-hundred-line module knows how to slice.

## 4. Routes as a thin Express Router

[server/routes/api.js](server/routes/api.js) uses Express's `Router()` to
group the API endpoints, one handler per route, each just reading
`req.query` and calling into `data.js`:

```js
router.get('/awards', (req, res) => {
  res.json(queryAwards({ ...req.query }))
})
```

The routes file has no logic of its own beyond parsing query params (e.g.
turning `"25"` into the number `25`) and shaping the HTTP response;
`data.js` owns all the actual filtering/aggregation.

## 5. Two independent Node projects, one runtime

`client/` and `server/` each have their own `package.json` and
`package-lock.json`, they're never installed together. In development
that means two terminals, two `npm install`s, two `npm run dev`s (see the
[README](README.md#running-in-development)). In production, only
`server/`'s dependencies (just `express`) get installed, because the
[Dockerfile](Dockerfile) builds the client in one Node image and copies
only the compiled static output into the runtime image, never
`client/node_modules` or Vite itself.
