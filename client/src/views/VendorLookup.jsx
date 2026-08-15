import { useEffect, useState } from 'react'
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

      {!profile && (
        <div className="rounded-lg border border-dashed border-hairline p-10 text-center text-sm text-muted">
          Pick a country, then a vendor, to see its FY2025 contract profile.
        </div>
      )}
    </div>
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

function RankedList({ title, items, nameKey }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <h3 className="mb-3 text-sm font-medium text-ink">{title}</h3>
      <ul className="space-y-2 text-sm">
        {items.slice(0, 8).map((item) => (
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
