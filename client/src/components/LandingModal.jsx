import { useState } from 'react'

const ARCHITECTURE_URL =
  'https://github.com/lessaworld/react-tailwind-nodejs-demo/blob/main/ARCHITECTURE.md'
const DISMISSED_KEY = 'landingModalDismissed'

// A one-time welcome overlay for the public demo link, pointing visitors at
// the architecture writeup. Dismissal is remembered in localStorage so
// returning visitors don't see it again.
export default function LandingModal() {
  const [open, setOpen] = useState(() => !localStorage.getItem(DISMISSED_KEY))

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
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
        <a
          href={ARCHITECTURE_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          Read how it's built →
        </a>
        <button
          onClick={dismiss}
          className="mt-6 block w-full rounded-md border border-hairline px-3 py-2 text-sm text-ink-secondary hover:text-ink"
        >
          Explore the app
        </button>
      </div>
    </div>
  )
}
