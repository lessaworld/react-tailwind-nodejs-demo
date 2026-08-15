# Tech primer: React, Tailwind, and Node.js, plain-language

**Docs:** [README](README.md) | [Architecture](ARCHITECTURE.md) | [Tailwind](TAILWIND.md) | [React](REACT.md) | [Node.js](NODEJS.md)

This document assumes no familiarity with any of the tools in this
project, not React's syntax, not Node's conventions, not Tailwind's
utility classes. It's about the *mechanics*: how a file on disk turns into
a running server or a page in a browser, and why the project is organized
the way it is. For what each tool is used for and where, see
[TAILWIND.md](TAILWIND.md), [REACT.md](REACT.md), and [NODEJS.md](NODEJS.md).
For how it all gets packaged and shipped, see [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Two projects, two `package.json` files

This repo is really two small JavaScript projects living side by side:
`client/` (the browser app) and `server/` (the API). Each has its own
[`package.json`](client/package.json), which is a JSON file that answers
three questions for a tool called `npm` (Node's package manager):

- **What's this project called, and what version is it?** (`"name"`,
  `"version"`)
- **What other people's code does it depend on?** (`"dependencies"`,
  `"devDependencies"`)
- **What shell commands can I run against it?** (`"scripts"`)

When you run `npm install` inside `client/` or `server/`, npm reads the
dependency lists in that folder's `package.json`, downloads each package
(from the public npm registry) into a `node_modules/` folder, and writes
down the *exact* versions it picked into `package-lock.json` so a second
`npm install` later reproduces the same versions bit for bit. Every
`import express from 'express'` or `import { useState } from 'react'` in
the code is really just: "look in `node_modules/` for a folder named
`express` (or `react`) and pull in what it exports." Nothing magic, no
network call at runtime, just a folder lookup.

### Dependencies vs. devDependencies

`package.json` splits packages into two buckets, and the split matters a
lot for how this app ships:

- **`dependencies`**: code the app needs *while it's running*.
  `server/package.json` lists exactly one: `express`. When the server
  actually executes (`node index.js`), it calls into Express's code on
  every request, so Express has to be present.
- **`devDependencies`**: tools used only *while building or developing*
  the app, never executed by the running app itself.
  [`client/package.json`](client/package.json) puts `vite`, `tailwindcss`,
  and `@tailwindcss/vite` here. Vite's job is to turn the source files
  into a folder of plain HTML/CSS/JS (see §11); Tailwind's job is to scan
  the code and generate a `.css` file. Once that's done, the *output* is
  plain HTML/CSS/JS, no trace of Vite or Tailwind's own code is in it. A
  browser never runs Vite or Tailwind, it just receives their output. So
  when the Docker image is built for production, only the `dependencies`
  get installed into the final image (see the `npm ci --omit=dev` step in
  the [Dockerfile](Dockerfile)); the devDependencies did their job earlier
  and are thrown away.

### The `"scripts"` section, and what each command actually does

`"scripts"` maps a short name to a real shell command. `npm run <name>`
looks it up and runs it. This project's commands:

| Command | Where | What it actually runs | What that means |
|---|---|---|---|
| `npm install` | both | (npm's own logic) | downloads every package listed in `dependencies`/`devDependencies` into `node_modules/` |
| `npm run dev` | `server/` | `node --watch index.js` | starts the API, and Node's built-in `--watch` flag restarts it automatically whenever a file changes |
| `npm run dev` | `client/` | `vite` | starts Vite's dev server: serves the app in the browser, with instant reload on save |
| `npm run build` | `client/` | `vite build` | produces the optimized, static `dist/` folder (§11) |
| `npm run preview` | `client/` | `vite preview` | serves that already-built `dist/` folder locally, to sanity-check the production build without Docker |
| `npm run lint` | `client/` | `oxlint` | scans the code for likely bugs/style issues (§5) without running any of it |
| `npm start` | `server/` | `node index.js` | starts the API without the auto-restart-on-change behavior; this is what the Docker image runs |

Two different `npm run dev`s, in two different folders, doing two
completely different things, is exactly why the [README](README.md#running-in-development)
has you open two terminals for local development.

## 2. Entry points: what file runs first

"Entry point" just means: the one file a tool is told to start executing,
which then pulls in everything else via `import`.

**Server side:** [`server/package.json`](server/package.json#L6) has
`"main": "index.js"`, and both the `dev` and `start` scripts literally
name [`index.js`](server/index.js) on the command line. Node runs that
file top to bottom: it creates an Express app, registers the API routes,
registers static-file serving, and finally calls `app.listen(PORT)`, which
is what makes the process actually sit there and respond to network
requests instead of exiting immediately.

**Client side (in the browser):** [`client/index.html`](client/index.html)
is the actual entry point, it's the one file a browser is given directly.
Near the bottom, it has:

```html
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
```

The browser loads that empty `<div>`, then executes
[`main.jsx`](client/src/main.jsx), which does two things: imports
[`App.jsx`](client/src/App.jsx), and calls
`createRoot(document.getElementById('root')).render(<App />)`. That line
hands control of everything *inside* that one `<div>` to React. From that
point on, `App.jsx` (and everything it renders) is what decides what's on
screen, and it does so by re-running its own function whenever its state
changes, not by the browser reloading the page (§9 gets into why).

## 3. What's not "plain" JavaScript, CSS, or HTML here

A few things in this codebase would not run in a browser or Node as-is;
they need a build tool to translate them first. Worth knowing which is
which:

- **JSX** (the HTML-looking syntax inside `.jsx` files, like
  `<div className="...">`) is not valid JavaScript. It's a syntax
  extension that Vite compiles into plain `React.createElement(...)` calls
  on the fly, both in dev and at build time. You never see that
  translated form; Vite handles it transparently.
- **ES modules** (`import`/`export`) are the modern, standard way to split
  JavaScript across files, replacing the older pattern of loading several
  `<script>` tags and relying on global variables. Node needs to be told
  a project uses this style, which is what `"type": "module"` in
  [`server/package.json`](server/package.json#L5) does; without it, Node
  defaults to the older `require()`/`module.exports` style instead.
- **Tailwind's `@import` and `@theme`** in [`index.css`](client/src/index.css)
  look like CSS but aren't things a browser understands natively (`@import
  "tailwindcss"` isn't importing a real file the browser fetches; `@theme`
  isn't a browser CSS feature at all). They're instructions to the
  Tailwind build tool, which reads them and *generates* the plain CSS that
  actually ships to the browser. See §10.
- **CSS custom properties** (`--surface-1`, `--accent-1`, etc. in
  `index.css`) are real, standard, browser-native CSS, not a build-tool
  trick. They're what makes the dark-mode color swap work with zero
  JavaScript: the browser itself re-resolves `var(--accent-1)` whenever
  the value changes under a `@media (prefers-color-scheme: dark)` rule.
- **Node running JavaScript at all** is itself the historical departure:
  JavaScript was originally a browser-only language. Node is a separate
  program that runs the same language outside a browser, with access to
  things a browser deliberately blocks scripts from doing, like reading
  files off disk (`server/data.js` calling `readFileSync`) or opening a
  network port (`app.listen`).

## 4. Express, refreshed

Express's whole job is: take incoming HTTP requests and decide what to
send back. Three ideas cover basically all of it:

- **A route** is a pairing of an HTTP method and a URL path to a function.
  `router.get('/awards', (req, res) => { ... })` in
  [`server/routes/api.js`](server/routes/api.js) means "when a GET request
  arrives for `/api/awards`, run this function." `req` carries everything
  about the incoming request (here, mainly `req.query`, the `?key=value`
  part of the URL); `res` is how you send a response back, either
  `res.json(...)` (send data) or `res.sendFile(...)` (send a whole file).
- **Middleware** is just a function that runs on the way to a route, and
  can either handle the request itself or pass it along. `app.use('/api',
  apiRouter)` in [`server/index.js`](server/index.js#L10) means "any
  request starting with `/api` gets handed to this whole group of
  routes." `app.use(express.static(clientDist))` a few lines later means
  "for any request, first check if it matches a real file in this folder,
  and serve it directly if so."
- **Matching order matters.** Express checks these in the order they're
  registered. That's why the API routes are registered before the
  catch-all `app.get('*', ...)` at the bottom: a request for `/api/awards`
  needs to hit the API handler, not fall through to "just send
  `index.html`."

## 5. What a Vite config file does

[`client/vite.config.js`](client/vite.config.js) is a plain JavaScript
file that exports a settings object, and Vite reads it before doing
anything else, in both dev and build mode. In this project it does two
things:

```js
plugins: [react(), tailwindcss()]
```
tells Vite "understand JSX files, and run Tailwind's CSS processing,"
neither of which Vite does by default on its own.

```js
server: { proxy: { '/api': 'http://localhost:3000' } }
```
is dev-only: it tells Vite's *development* server, "any request the
browser makes to `/api/...` should actually be forwarded to the real
Express server running on port 3000." That's the entire reason there's no
CORS configuration anywhere in this project, in dev, the browser only
ever talks to Vite's own address; Vite quietly relays the `/api` calls
to Express behind the scenes.

## 6. oxlint and `.oxlintrc.json`

A **linter** doesn't run your code, it reads it and flags patterns that
are likely bugs or inconsistent style, things a syntax checker wouldn't
catch (like calling a React Hook conditionally, which technically parses
fine but silently breaks React). `oxlint` is one such tool; it's used here
instead of the more common ESLint mainly because it's much faster, being
written in Rust rather than JavaScript.

[`client/.oxlintrc.json`](client/.oxlintrc.json) is oxlint's settings
file: it turns on a `react` plugin (rules specific to React code, like
`react/rules-of-hooks`, catching the exact Hook-ordering mistake just
mentioned) and marks that particular rule as an `"error"` rather than just
a warning. Running `npm run lint` reads this file and reports anything it
finds; it doesn't run automatically on every save or every build in this
project; someone has to invoke it deliberately.

## 7. How React re-renders: `useState` and `useEffect`

A React component is a plain JavaScript function that returns a
description of what should be on screen (JSX), not commands like "create
this DOM element, then that one." React's job is to compare what a
component *returns* against what's currently on screen and update only
what actually changed. That's the whole model. Three consequences follow
directly from it:

- **A component function has no memory of its own between renders**,
  ordinary local variables reset every time the function runs again.
  `useState` is how a component gets memory anyway: `const [tab, setTab] =
  useState('explorer')` in [`App.jsx`](client/src/App.jsx) stores a value
  (`'explorer'`) that survives across renders, and calling `setTab(...)`
  is what tells React "re-run this component's function, something it
  depends on changed."
- **Fetching data isn't "rendering"**, it's a side effect: something that
  reaches outside the component (to the network) and doesn't have a
  result to return synchronously. `useEffect` is where that kind of code
  belongs. In [`Explorer.jsx`](client/src/views/Explorer.jsx):
  ```js
  useEffect(() => {
    fetchAwards({ ...filters, sort, order, page }).then(setResult)
  }, [filters, sort, order, page])
  ```
  The array at the end is the dependency list: React only re-runs this
  effect when one of those values actually changed since the last render,
  not on every render. That's what makes the whole app "reactive": change
  a filter, `useState` updates, the component re-renders, `useEffect`
  notices a dependency changed, and fetches fresh data, no manual wiring
  of "when the dropdown changes, go fetch."
- **Only the parts of the JSX that are actually conditional get swapped.**
  [`App.jsx`](client/src/App.jsx) renders `<DisclaimerBanner />` and
  `<Nav />` as plain, unconditional children, then
  `{tab === 'explorer' && <Explorer />}` (and two more lines just like it)
  underneath. Clicking a nav tab only changes the `tab` value, so on the
  next render, those three conditional lines are the only ones that can
  produce something different; the banner's and nav's JSX comes out
  identical every time, so React's comparison step (the first paragraph
  above) leaves those DOM nodes untouched. That's also why switching tabs
  never causes a page reload or a flash. There's no "make the banner
  persist across pages" logic anywhere, because it was never being torn
  down between tabs in the first place, only the conditional part of the
  tree ever swaps.

## 8. `index.css` in a Tailwind world

Ordinarily, a `.css` file is a list of selectors and the styles they
apply, written by hand: `.my-button { padding: 8px; }`. Tailwind flips
that: instead of writing new CSS rules per component, you apply small,
pre-made utility classes (`px-3`, `rounded-md`, `text-sm`) directly in the
JSX, and Tailwind's build step scans every source file for which of its
thousands of possible utility classes are actually used, and generates a
single CSS file containing only those.

[`client/src/index.css`](client/src/index.css) is almost entirely setup
for that process, not hand-written page styles: one line turns Tailwind on
(`@import "tailwindcss"`), a `@theme` block registers this project's own
color names (`--color-accent`, etc.) as real Tailwind utilities
(`bg-accent`), and the rest defines what those colors actually are, once
for light mode, once for dark. The output of all that (an actual `.css`
file full of real, standard CSS rules) shows up in `dist/assets/` after a
build; nothing about Tailwind's syntax survives into what ships. See
[TAILWIND.md](TAILWIND.md) for where those utility classes get used.

## 9. Why client files end up in `dist/`

`dist/` isn't a special, hardcoded folder name with magic behavior, it's
Vite's default output directory when you run `npm run build`. What
happens during that build:

1. Vite starts at [`index.html`](client/index.html) (the entry point from
   §2) and follows every `import` statement it finds, starting with
   `main.jsx`, then `App.jsx`, then everything *those* import, and so on,
   building a complete map of every file the app actually uses.
2. Every JSX file gets compiled to plain JavaScript (§3). Every CSS file,
   including Tailwind's generated styles, gets collected into one
   stylesheet. Everything gets minified (whitespace and long variable
   names stripped out) to reduce file size.
3. The result is written out as a small number of static files (an
   `index.html`, a `.js` bundle, a `.css` bundle) into `dist/`, files a
   browser can load directly with no build tool involved anymore.

Anything *not* reachable by following imports from `index.html` (an
unused component, a stray file) simply never makes it into `dist/`, since
nothing pointed the bundler at it. That `dist/` folder is exactly what the
[Dockerfile](Dockerfile) copies into the production image, and exactly
what Express serves as static files in production (see
[`server/index.js`](server/index.js#L16-L17)).
