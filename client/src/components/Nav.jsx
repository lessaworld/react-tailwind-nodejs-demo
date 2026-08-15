const TABS = [
  { id: 'explorer', label: 'Purchase Order Explorer' },
  { id: 'dashboard', label: 'Monthly Spend Dashboard' },
  { id: 'vendors', label: 'Vendor Lookup' },
]

export default function Nav({ active, onChange }) {
  return (
    <header className="border-b border-hairline bg-surface">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-4">
          <h1 className="text-lg font-semibold text-ink">FY2025 Foreign Contractor Spend Explorer</h1>
          <p className="text-sm text-muted">
            U.S. federal contract awards to foreign vendors, Oct 2024–Sep 2025 · source: USASpending.gov
          </p>
        </div>
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                active === tab.id
                  ? 'border-accent text-ink'
                  : 'border-transparent text-muted hover:text-ink-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
