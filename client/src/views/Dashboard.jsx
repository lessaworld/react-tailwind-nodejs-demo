import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fetchBreakdown, fetchFilters, fetchMonthly } from '../lib/api.js'
import { formatCurrencyCompact, formatCurrencyFull } from '../lib/format.js'
import MonthlyBarChart from '../components/MonthlyBarChart.jsx'

// Two independent charts sharing one pair of agency/country filters: the
// monthly trend (always FY2025 Oct-Sep) and a top-10 breakdown that can be
// toggled between "by agency" and "by country".
export default function Dashboard() {
  const [filterOptions, setFilterOptions] = useState({ agencies: [], countries: [] })
  const [agency, setAgency] = useState('')
  const [country, setCountry] = useState('')
  const [monthly, setMonthly] = useState([])
  const [breakdownBy, setBreakdownBy] = useState('agency')
  const [breakdown, setBreakdown] = useState([])

  useEffect(() => {
    fetchFilters().then(setFilterOptions)
  }, [])

  // Re-fetch the monthly trend whenever either filter changes.
  useEffect(() => {
    fetchMonthly({ agency, country }).then(setMonthly)
  }, [agency, country])

  useEffect(() => {
    // Breaking down BY agency only makes sense while no agency filter is set
    // (and likewise for country) -- otherwise every bar would be the same one.
    const params = { by: breakdownBy, limit: 10 }
    if (breakdownBy === 'agency') params.country = country
    else params.agency = agency
    fetchBreakdown(params).then(setBreakdown)
  }, [breakdownBy, agency, country])

  const total = monthly.reduce((sum, m) => sum + m.amount, 0)

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={agency}
          onChange={(e) => setAgency(e.target.value)}
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
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink"
        >
          <option value="">All countries</option>
          {filterOptions.countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {(agency || country) && (
          <button
            onClick={() => {
              setAgency('')
              setCountry('')
            }}
            className="rounded-md border border-hairline px-3 py-2 text-sm text-muted hover:text-ink-secondary"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-hairline bg-surface p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-ink">Monthly spend, FY2025 (Oct 2024–Sep 2025)</h2>
          <span className="text-lg font-semibold text-ink">{formatCurrencyCompact(total)}</span>
        </div>
        <MonthlyBarChart data={monthly} height={280} />
      </div>

      <div className="rounded-lg border border-hairline bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Top 10 by {breakdownBy === 'agency' ? 'agency' : 'country'}</h2>
          <div className="flex gap-1 rounded-md border border-hairline p-0.5 text-xs">
            {['agency', 'country'].map((opt) => (
              <button
                key={opt}
                onClick={() => setBreakdownBy(opt)}
                className={`rounded px-2 py-1 capitalize ${
                  breakdownBy === opt ? 'bg-accent text-white' : 'text-muted hover:text-ink-secondary'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(220, breakdown.length * 32)}>
          <BarChart
            data={breakdown}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--grid-1)" />
            <XAxis
              type="number"
              tickFormatter={formatCurrencyCompact}
              tickLine={false}
              axisLine={{ stroke: 'var(--grid-1)' }}
              tick={{ fill: 'var(--muted-1)', fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={220}
              tick={{ fill: 'var(--ink-2)', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'var(--page-1)' }}
              contentStyle={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-1)',
                borderRadius: 8,
                fontSize: 13,
              }}
              labelStyle={{ color: 'var(--ink-1)', fontWeight: 600 }}
              formatter={(value) => [formatCurrencyFull(value), 'Spend']}
            />
            <Bar dataKey="totalAmount" fill="var(--accent-1)" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
