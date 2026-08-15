import { useState } from 'react'

const REPO_URL = 'https://github.com/lessaworld/react-tailwind-nodejs-demo'

// A welcome gate for the public demo link, shown on every page load. The
// backdrop is a solid, opaque page-color fill (not a dark/blurred overlay)
// so nothing of the app underneath is visible, and there's no click-outside
// or Escape handler -- the visitor must pick one of the two buttons to
// reveal the app.
export default function LandingModal() {
  const [open, setOpen] = useState(true)

  function dismiss() {
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-page p-4">
      <div className="max-w-md rounded-lg border border-hairline bg-surface p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">FY2025 Foreign Contractor Spend Explorer</h2>
        <p className="mt-2 text-sm text-ink-secondary">
          A demo app for exploring U.S. federal contract awards to foreign vendors in FY2025,
          built over a single static dataset.

          This is a demo project built with real data, intended to explore Node.js, React, and Tailwind development, not to make any analytical claim.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            onClick={dismiss}
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
