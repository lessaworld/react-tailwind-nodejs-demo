import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH = path.join(__dirname, 'data', 'fy2025-awards.json')

// FY2025 = Oct 2024 -> Sep 2025. Fiscal months are numbered 1-12 starting in
// October so the dashboard can show the fiscal year in its natural order
// instead of a Jan-Dec calendar order.
const FISCAL_MONTHS = [
  { monthKey: '2024-10', label: 'Oct 2024' },
  { monthKey: '2024-11', label: 'Nov 2024' },
  { monthKey: '2024-12', label: 'Dec 2024' },
  { monthKey: '2025-01', label: 'Jan 2025' },
  { monthKey: '2025-02', label: 'Feb 2025' },
  { monthKey: '2025-03', label: 'Mar 2025' },
  { monthKey: '2025-04', label: 'Apr 2025' },
  { monthKey: '2025-05', label: 'May 2025' },
  { monthKey: '2025-06', label: 'Jun 2025' },
  { monthKey: '2025-07', label: 'Jul 2025' },
  { monthKey: '2025-08', label: 'Aug 2025' },
  { monthKey: '2025-09', label: 'Sep 2025' },
]

console.log('Loading award data...')
const loadStart = Date.now()
export const awards = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
console.log(`Loaded ${awards.length.toLocaleString()} award transactions in ${Date.now() - loadStart}ms`)

function monthKeyOf(actionDate) {
  return actionDate.slice(0, 7) // "YYYY-MM-DD" -> "YYYY-MM"
}

// Sums `amount` per fiscal month for whatever rows are passed in (already
// filtered by caller). Always returns all 12 FY2025 months in fiscal order,
// zero-filled -- so a month with no activity still shows as a $0 bar instead
// of just not being in the chart at all.
function sumMonthly(rows) {
  const totals = new Map(FISCAL_MONTHS.map((m) => [m.monthKey, 0]))
  for (const row of rows) {
    const key = monthKeyOf(row.actionDate)
    if (totals.has(key)) totals.set(key, totals.get(key) + row.amount)
  }
  return FISCAL_MONTHS.map((m) => ({ ...m, amount: totals.get(m.monthKey) }))
}

// ---- Rollups computed once at startup -------------------------------------
// The dataset is ~124k small objects; a handful of single-pass loops over it
// runs in well under a second, so there's no need to persist these to disk --
// computing them here on boot is simpler to read and keeps the JSON file as
// the single source of truth.

function buildCountryAndVendorRollups() {
  const countryTotals = new Map() // country -> { totalAmount, awardIds:Set, recipientSet:Set, transactionCount }
  const vendorTotals = new Map() // `${country} ${recipient}` -> { totalAmount, awardIds:Set, transactionCount }

  for (const row of awards) {
    if (!countryTotals.has(row.country)) {
      countryTotals.set(row.country, { totalAmount: 0, awardIds: new Set(), recipientSet: new Set(), transactionCount: 0 })
    }
    const c = countryTotals.get(row.country)
    c.totalAmount += row.amount
    c.awardIds.add(row.id)
    c.recipientSet.add(row.recipient)
    c.transactionCount += 1

    // Keyed by country+recipient, not recipient alone, in case the same
    // vendor name were ever reused by an unrelated company in another country.
    const vKey = row.country + ' ' + row.recipient
    if (!vendorTotals.has(vKey)) {
      vendorTotals.set(vKey, { country: row.country, recipient: row.recipient, totalAmount: 0, awardIds: new Set(), transactionCount: 0 })
    }
    const v = vendorTotals.get(vKey)
    v.totalAmount += row.amount
    v.awardIds.add(row.id)
    v.transactionCount += 1
  }

  const countries = [...countryTotals.entries()]
    .map(([country, c]) => ({
      country,
      totalAmount: c.totalAmount,
      awardCount: c.awardIds.size,
      vendorCount: c.recipientSet.size,
      transactionCount: c.transactionCount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  const vendorsByCountry = new Map()
  for (const v of vendorTotals.values()) {
    const entry = { recipient: v.recipient, totalAmount: v.totalAmount, awardCount: v.awardIds.size, transactionCount: v.transactionCount }
    if (!vendorsByCountry.has(v.country)) vendorsByCountry.set(v.country, [])
    vendorsByCountry.get(v.country).push(entry)
  }
  for (const list of vendorsByCountry.values()) {
    list.sort((a, b) => b.totalAmount - a.totalAmount)
  }

  return { countries, vendorsByCountry }
}

function buildFilterOptionLists() {
  const agencies = new Set()
  const categories = new Set()
  for (const row of awards) {
    if (row.agency) agencies.add(row.agency)
    if (row.category) categories.add(row.category)
  }
  return {
    agencies: [...agencies].sort(),
    categories: [...categories].sort(),
  }
}

const { countries, vendorsByCountry } = buildCountryAndVendorRollups()
const { agencies, categories } = buildFilterOptionLists()

export function getCountries() {
  return countries
}

export function getVendorsForCountry(country) {
  return vendorsByCountry.get(country) ?? []
}

export function getFilterOptions() {
  // Filter dropdowns are alphabetical (easy to scan/find one) -- this is
  // deliberately different from getCountries(), whose Vendor Lookup order
  // is sorted by spend instead.
  return { agencies, categories, countries: countries.map((c) => c.country).sort() }
}

// Full profile for one vendor (Vendor Lookup step 3): totals, which agencies
// bought from them and how much, top NAICS categories, and their monthly
// trend. Computed on demand per request rather than precomputed for every one
// of the ~6,870 vendors up front -- a single filter+aggregate pass over ~124k
// rows is a few ms, so there's nothing to gain from caching it.
export function getVendorProfile(recipient) {
  const rows = awards.filter((r) => r.recipient === recipient)
  if (rows.length === 0) return null

  const awardIds = new Set()
  const agencyTotals = new Map()
  const categoryTotals = new Map()
  let totalAmount = 0

  for (const row of rows) {
    totalAmount += row.amount
    awardIds.add(row.id)

    if (!agencyTotals.has(row.agency)) agencyTotals.set(row.agency, { totalAmount: 0, count: 0 })
    const a = agencyTotals.get(row.agency)
    a.totalAmount += row.amount
    a.count += 1

    if (!categoryTotals.has(row.category)) categoryTotals.set(row.category, { totalAmount: 0, count: 0 })
    const c = categoryTotals.get(row.category)
    c.totalAmount += row.amount
    c.count += 1
  }

  const toSortedArray = (map, key) =>
    [...map.entries()]
      .map(([name, v]) => ({ [key]: name, ...v }))
      .sort((a, b) => b.totalAmount - a.totalAmount)

  return {
    recipient,
    country: rows[0].country,
    totalAmount,
    awardCount: awardIds.size,
    transactionCount: rows.length,
    agencies: toSortedArray(agencyTotals, 'agency'),
    categories: toSortedArray(categoryTotals, 'category'),
    monthly: sumMonthly(rows),
  }
}

export function getMonthlyRollup({ recipient, agency, country } = {}) {
  let rows = awards
  if (recipient) rows = rows.filter((r) => r.recipient === recipient)
  if (agency) rows = rows.filter((r) => r.agency === agency)
  if (country) rows = rows.filter((r) => r.country === country)
  return sumMonthly(rows)
}

export function getBreakdown({ by, agency, country, limit = 10 } = {}) {
  // "by" is 'agency' or 'country' -- top-N totals for the dashboard's
  // secondary breakdown view, respecting whichever OTHER filter is active.
  let rows = awards
  if (agency) rows = rows.filter((r) => r.agency === agency)
  if (country) rows = rows.filter((r) => r.country === country)

  const totals = new Map()
  for (const row of rows) {
    const key = row[by]
    if (!key) continue
    totals.set(key, (totals.get(key) ?? 0) + row.amount)
  }
  return [...totals.entries()]
    .map(([name, totalAmount]) => ({ name, totalAmount }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit)
}

export function queryAwards({ q, agency, category, country, minAmount, maxAmount, sort = 'actionDate', order = 'desc', page = 1, pageSize = 25 } = {}) {
  let rows = awards

  if (q) {
    const needle = q.toLowerCase()
    rows = rows.filter(
      (r) => r.recipient.toLowerCase().includes(needle) || r.description.toLowerCase().includes(needle)
    )
  }
  if (agency) rows = rows.filter((r) => r.agency === agency)
  if (category) rows = rows.filter((r) => r.category === category)
  if (country) rows = rows.filter((r) => r.country === country)
  if (minAmount !== undefined) rows = rows.filter((r) => r.amount >= minAmount)
  if (maxAmount !== undefined) rows = rows.filter((r) => r.amount <= maxAmount)

  // `actionDate` sorts correctly as a plain string because it's ISO format
  // (YYYY-MM-DD) -- lexical order and chronological order are the same thing.
  const sortKey = sort === 'amount' ? 'amount' : 'actionDate'
  const dir = order === 'asc' ? 1 : -1
  rows = [...rows].sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * dir)

  const total = rows.length
  const start = (page - 1) * pageSize
  const pageRows = rows.slice(start, start + pageSize)

  return { rows: pageRows, total, page, pageSize }
}
