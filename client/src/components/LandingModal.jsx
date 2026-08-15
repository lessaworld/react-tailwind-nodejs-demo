import { useState } from 'react'

const ARCHITECTURE_URL =
  'https://github.com/lessaworld/react-tailwind-nodejs-demo/blob/master/ARCHITECTURE.md'

// A welcome overlay for the public demo link, shown on every page load, with
// two equally-weighted paths: read the code, or dismiss it and use the app.
export default function LandingModal() {
  const [open, setOpen] = useState(true)

  function dismiss() {
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="max-w-md rounded-lg border border-hairline bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink">FY2025 Foreign Contractor Spend Explorer</h2>
        <p className="mt-2 text-sm text-ink-secondary">
          A demo app for exploring U.S. federal contract awards to foreign vendors in FY2025,
          built with React, Tailwind, and Express over a single static dataset.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <a
            href={ARCHITECTURE_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-hairline px-3 py-2.5 text-center text-sm font-medium text-ink hover:bg-page"
          >
            See the code
          </a>
          <button
            onClick={dismiss}
            className="rounded-md bg-accent px-3 py-2.5 text-center text-sm font-medium text-white hover:opacity-90"
          >
            Run the demo
          </button>
        </div>
      </div>
    </div>
  )
}
