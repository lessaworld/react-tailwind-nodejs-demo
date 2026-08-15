import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrencyCompact, formatCurrencyFull } from '../lib/format.js'

// FY2025 (Oct-Sep) monthly spend, as bars. Shared by the Dashboard (overall,
// optionally filtered by agency/country) and Country Explorer (one vendor).
// `data` is the array the API already returns from getMonthlyRollup():
// [{ monthKey, label, amount }, ...] for all 12 fiscal months, zero-filled.
// One series -> one hue, no legend needed (the section heading names it).
export default function MonthlyBarChart({ data, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--grid-1)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: 'var(--grid-1)' }}
          tick={{ fill: 'var(--muted-1)', fontSize: 12 }}
        />
        <YAxis
          tickFormatter={formatCurrencyCompact}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-1)', fontSize: 12 }}
          width={56}
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
        <Bar dataKey="amount" fill="var(--accent-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
