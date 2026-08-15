import { useEffect, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { fetchCountries, fetchVendorProfile, fetchVendorsForCountry } from '../lib/api.js'
import { formatCurrencyCompact, formatCurrencyFull } from '../lib/format.js'
import StatTile from '../components/StatTile.jsx'
import MonthlyBarChart from '../components/MonthlyBarChart.jsx'

const OTHERS_COLOR = 'var(--muted-1)'
const SERIES_COUNT = 10

function seriesColor(index) {
  return `var(--series-${(index % SERIES_COUNT) + 1})`
}

// Same color for a slice and its legend entry: rank-based for real entities,
// a distinct neutral for "Others" since it's an aggregate, not one of them.
function colorForSlice(entry, index) {
  return entry.name === 'Others' ? OTHERS_COLOR : seriesColor(index)
}

// Top 10 by spend, with anything past that collapsed into one "Others" slice.
function buildTopSlices(items, nameKey) {
  const top = items.slice(0, SERIES_COUNT)
  const othersTotal = items.slice(SERIES_COUNT).reduce((sum, item) => sum + item.totalAmount, 0)
  return [
    ...top.map((item) => ({ name: item[nameKey], totalAmount: item.totalAmount })),
    ...(othersTotal > 0 ? [{ name: 'Others', totalAmount: othersTotal }] : []),
  ]
}

export default function CountryExplorer() {
  const [countries, setCountries] = useState([])
  const [country, setCountry] = useState('')
  const [vendors, setVendors] = useState([])
  const [recipient, setRecipient] = useState('')
  const [profile, setProfile] = useState(null)

  // Step 1: countries, pre-sorted by total spend (server-side), for the first dropdown.
  useEffect(() => {
    fetchCountries().then(setCountries)
  }, [])

  // Step 2: whenever the chosen country changes, load that country's vendors
  // (also pre-sorted by spend) and clear whatever vendor/profile was picked
  // for the *previous* country -- otherwise a stale profile could stick
  // around after switching countries.
  useEffect(() => {
    setVendors([])
    setRecipient('')
    setProfile(null)
    if (!country) return
    fetchVendorsForCountry(country).then(setVendors)
  }, [country])

  // Step 3: once a vendor is picked, load its full profile (totals, agencies,
  // categories, monthly trend) for the panel below.
  useEffect(() => {
    setProfile(null)
    if (!recipient) return
    fetchVendorProfile(recipient).then(setProfile)
  }, [recipient])

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
            1. Country (sorted by total spend)
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">Select a country...</option>
            {countries.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country} — {formatCurrencyCompact(c.totalAmount)} ({c.vendorCount.toLocaleString()} vendors)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
            2. Vendor (sorted by total spend)
          </label>
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={!country}
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink disabled:opacity-50"
          >
            <option value="">{country ? 'Select a vendor...' : 'Pick a country first'}</option>
            {vendors.map((v) => (
              <option key={v.recipient} value={v.recipient}>
                {v.recipient} — {formatCurrencyCompact(v.totalAmount)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {profile && <VendorProfile profile={profile} />}

      {!profile && country && vendors.length > 0 && (
        <BreakdownOverview
          title={country}
          subtitle={`Top ${Math.min(SERIES_COUNT, vendors.length)} of ${vendors.length.toLocaleString()} vendors by FY2025 spend. Pick one above (or in the chart) for its full profile.`}
          listTitle="Top vendors"
          slices={buildTopSlices(vendors, 'recipient')}
          onSelect={setRecipient}
        />
      )}

      {/* Before any country is picked, lead with the same breakdown one level
          up (by country instead of vendor), so there's something to look at
          immediately instead of an empty state. */}
      {!profile && !country && countries.length > 0 && (
        <BreakdownOverview
          title="All countries"
          subtitle={`Top ${Math.min(SERIES_COUNT, countries.length)} of ${countries.length.toLocaleString()} countries by FY2025 spend. Pick one above (or in the chart) to drill into its vendors.`}
          listTitle="Top countries"
          slices={buildTopSlices(countries, 'country')}
          onSelect={setCountry}
        />
      )}
    </div>
  )
}

function BreakdownOverview({ title, subtitle, listTitle, slices, onSelect }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-hairline bg-surface p-4">
          <h3 className="mb-3 text-sm font-medium text-ink">Share of total spend</h3>
          <BreakdownPieChart slices={slices} onSelect={onSelect} />
        </div>
        <RankedList
          title={listTitle}
          items={slices}
          nameKey="name"
          limit={slices.length}
          colorFor={colorForSlice}
          onSelect={onSelect}
        />
      </div>
    </div>
  )
}

// Clicking a slice (or the matching row in the ranked list) selects that
// country/vendor, the same as picking it from the dropdown above -- "Others"
// isn't a real entity, so it's excluded from both.
function BreakdownPieChart({ slices, onSelect }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={slices} dataKey="totalAmount" nameKey="name" outerRadius={100} paddingAngle={1.5}>
          {slices.map((entry, i) => {
            const selectable = entry.name !== 'Others'
            return (
              <Cell
                key={entry.name}
                fill={colorForSlice(entry, i)}
                stroke="var(--surface-1)"
                strokeWidth={2}
                cursor={selectable ? 'pointer' : 'default'}
                onClick={selectable ? () => onSelect(entry.name) : undefined}
              />
            )
          })}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-1)',
            borderRadius: 8,
            fontSize: 13,
          }}
          labelStyle={{ color: 'var(--ink-1)', fontWeight: 600 }}
          formatter={(value) => [formatCurrencyFull(value), 'Spend']}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

function VendorProfile({ profile }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink">{profile.recipient}</h2>
        <p className="text-sm text-muted">{profile.country}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Total FY2025 spend" value={formatCurrencyCompact(profile.totalAmount)} />
        <StatTile label="Distinct awards" value={profile.awardCount.toLocaleString()} />
        <StatTile label="Agencies sold to" value={profile.agencies.length.toLocaleString()} />
      </div>

      <div className="mb-6 rounded-lg border border-hairline bg-surface p-4">
        <h3 className="mb-3 text-sm font-medium text-ink">Monthly spend, FY2025</h3>
        <MonthlyBarChart data={profile.monthly} height={240} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RankedList title="Agencies sold to" items={profile.agencies} nameKey="agency" />
        <RankedList title="Top categories (NAICS)" items={profile.categories} nameKey="category" />
      </div>
    </div>
  )
}

function RankedList({ title, items, nameKey, limit = 8, colorFor, onSelect }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <h3 className="mb-3 text-sm font-medium text-ink">{title}</h3>
      <ul className="space-y-2 text-sm">
        {items.slice(0, limit).map((item, i) => {
          const row = (
            <>
              <span className="flex min-w-0 items-center gap-2 text-ink-secondary">
                {colorFor && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: colorFor(item, i) }}
                  />
                )}
                <span className="truncate">{item[nameKey]}</span>
              </span>
              <span className="whitespace-nowrap tabular-nums text-ink">{formatCurrencyFull(item.totalAmount)}</span>
            </>
          )
          // Clicking a row selects it, same as picking it from the dropdown
          // above -- "Others" isn't a real entity, so it stays unclickable.
          const selectable = onSelect && item[nameKey] !== 'Others'
          return (
            <li key={item[nameKey]}>
              {selectable ? (
                <button
                  type="button"
                  onClick={() => onSelect(item[nameKey])}
                  className="flex w-full items-center justify-between gap-3 rounded px-1 py-0.5 text-left hover:bg-page"
                >
                  {row}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3">{row}</div>
              )}
            </li>
          )
        })}
        {items.length === 0 && <li className="text-muted">None</li>}
      </ul>
    </div>
  )
}
