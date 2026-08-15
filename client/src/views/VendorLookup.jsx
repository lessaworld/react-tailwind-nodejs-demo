import { useEffect, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { fetchCountries, fetchVendorProfile, fetchVendorsForCountry } from '../lib/api.js'
import { formatCurrencyCompact, formatCurrencyFull } from '../lib/format.js'
import StatTile from '../components/StatTile.jsx'
import MonthlyBarChart from '../components/MonthlyBarChart.jsx'

export default function VendorLookup() {
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
        <CountryOverview country={country} vendors={vendors} />
      )}

      {!profile && !country && (
        <div className="rounded-lg border border-dashed border-hairline p-10 text-center text-sm text-muted">
          Pick a country to see its top vendors, then a vendor for its full FY2025 profile.
        </div>
      )}
    </div>
  )
}

// Shown once a country is picked but before a vendor is: a top-10-by-spend
// breakdown (an 11th "Others" slice covers the rest) so there's something
// to look at immediately instead of an empty state.
function CountryOverview({ country, vendors }) {
  const top10 = vendors.slice(0, 10)
  const othersTotal = vendors.slice(10).reduce((sum, v) => sum + v.totalAmount, 0)
  const slices = [
    ...top10.map((v) => ({ name: v.recipient, totalAmount: v.totalAmount })),
    ...(othersTotal > 0 ? [{ name: 'Others', totalAmount: othersTotal }] : []),
  ]

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink">{country}</h2>
        <p className="text-sm text-muted">
          Top {top10.length} of {vendors.length.toLocaleString()} vendors by FY2025 spend. Pick one above for its
          full profile.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-hairline bg-surface p-4">
          <h3 className="mb-3 text-sm font-medium text-ink">Share of country spend</h3>
          <TopVendorsPieChart slices={slices} />
        </div>
        <RankedList title="Top vendors" items={slices} nameKey="name" limit={slices.length} />
      </div>
    </div>
  )
}

// One hue, graded by rank (rank 1 solid, rank 10 faintest) so the ranking
// itself carries information, not just the wedge size. "Others" gets a
// distinct neutral fill since it's an aggregate bucket, not a real vendor.
function TopVendorsPieChart({ slices }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={slices} dataKey="totalAmount" nameKey="name" outerRadius={100} paddingAngle={1.5}>
          {slices.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={entry.name === 'Others' ? 'var(--muted-1)' : 'var(--accent-1)'}
              fillOpacity={entry.name === 'Others' ? 1 : Math.max(0.35, 1 - i * 0.075)}
              stroke="var(--surface-1)"
              strokeWidth={2}
            />
          ))}
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

function RankedList({ title, items, nameKey, limit = 8 }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <h3 className="mb-3 text-sm font-medium text-ink">{title}</h3>
      <ul className="space-y-2 text-sm">
        {items.slice(0, limit).map((item) => (
          <li key={item[nameKey]} className="flex items-center justify-between gap-3">
            <span className="text-ink-secondary">{item[nameKey]}</span>
            <span className="whitespace-nowrap tabular-nums text-ink">{formatCurrencyFull(item.totalAmount)}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-muted">None</li>}
      </ul>
    </div>
  )
}
