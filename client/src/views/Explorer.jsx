import { useEffect, useState } from 'react'
import { fetchAwards, fetchFilters } from '../lib/api.js'
import { formatCurrencyFull, formatDate } from '../lib/format.js'

const PAGE_SIZE = 25

const emptyFilters = {
  q: '',
  agency: '',
  category: '',
  country: '',
  minAmount: '',
  maxAmount: '',
}

export default function Explorer() {
  const [filterOptions, setFilterOptions] = useState({ agencies: [], categories: [], countries: [] })
  const [filters, setFilters] = useState(emptyFilters)
  const [qInput, setQInput] = useState('')
  // Amount desc by default so the biggest awards surface immediately.
  const [sort, setSort] = useState('amount')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ rows: [], total: 0 })
  const [loading, setLoading] = useState(true)

  // Populate the agency/category/country dropdown options once on mount.
  useEffect(() => {
    fetchFilters().then(setFilterOptions)
  }, [])

  // Debounce the free-text search: qInput updates on every keystroke, but
  // `filters.q` (which actually triggers a fetch below) only updates 300ms
  // after typing stops. Without this, every character typed would fire its
  // own API request.
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters((f) => ({ ...f, q: qInput }))
      setPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [qInput])

  // The single source of truth for what's on screen: re-fetch any time a
  // filter, the sort, or the page changes. With ~124k rows server-side,
  // filtering/sorting/paging all happen in Express, not in the browser.
  useEffect(() => {
    setLoading(true)
    fetchAwards({ ...filters, sort, order, page, pageSize: PAGE_SIZE })
      .then(setResult)
      .finally(() => setLoading(false))
  }, [filters, sort, order, page])

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1) // changing a filter invalidates the current page
  }

  function toggleSort(key) {
    if (sort === key) {
      // clicking the active column again flips direction
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(key)
      setOrder('desc')
    }
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="text"
          placeholder="Search vendor or description..."
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          className="col-span-1 rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted lg:col-span-2"
        />
        <select
          value={filters.agency}
          onChange={(e) => updateFilter('agency', e.target.value)}
          className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink"
        >
          <option value="">All agencies</option>
          {filterOptions.agencies.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={filters.country}
          onChange={(e) => updateFilter('country', e.target.value)}
          className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink"
        >
          <option value="">All countries</option>
          {filterOptions.countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          list="category-options"
          placeholder="Category (NAICS)..."
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value)}
          className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted lg:col-span-2"
        />
        <datalist id="category-options">
          {filterOptions.categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          type="number"
          placeholder="Min amount ($)"
          value={filters.minAmount}
          onChange={(e) => updateFilter('minAmount', e.target.value)}
          className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
        />
        <input
          type="number"
          placeholder="Max amount ($)"
          value={filters.maxAmount}
          onChange={(e) => updateFilter('maxAmount', e.target.value)}
          className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
        />
      </div>

      <div className="mb-2 flex items-center justify-between text-sm text-muted">
        <span>{result.total.toLocaleString()} matching award actions</span>
        <span>
          Page {page} of {totalPages}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
              <SortableHeader label="Date" col="actionDate" sort={sort} order={order} onClick={toggleSort} />
              <th className="px-3 py-2 font-medium">Vendor</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Agency</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <SortableHeader label="Amount" col="amount" sort={sort} order={order} onClick={toggleSort} align="right" />
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={row.id + i} className="border-b border-hairline last:border-0 hover:bg-page">
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-secondary">{formatDate(row.actionDate)}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-ink">{row.recipient}</div>
                  <div className="text-xs text-muted">{row.country}</div>
                </td>
                <td className="max-w-xs px-3 py-2 text-ink-secondary">{row.description}</td>
                <td className="px-3 py-2 text-ink-secondary">{row.agency}</td>
                <td className="px-3 py-2 text-ink-secondary">{row.category}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink">
                  {formatCurrencyFull(row.amount)}
                </td>
              </tr>
            ))}
            {!loading && result.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  No awards match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded-md border border-hairline px-3 py-1.5 text-sm text-ink-secondary disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="rounded-md border border-hairline px-3 py-1.5 text-sm text-ink-secondary disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

function SortableHeader({ label, col, sort, order, onClick, align }) {
  const active = sort === col
  return (
    <th
      onClick={() => onClick(col)}
      className={`cursor-pointer select-none px-3 py-2 font-medium hover:text-ink-secondary ${align === 'right' ? 'text-right' : ''}`}
    >
      {label}
      {active && <span className="ml-1 text-accent">{order === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
}
