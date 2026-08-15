import { Router } from 'express'
import {
  getCountries,
  getVendorsForCountry,
  getVendorProfile,
  getMonthlyRollup,
  getBreakdown,
  getFilterOptions,
  queryAwards,
} from '../data.js'

const router = Router()

function toNumber(value) {
  if (value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

// Purchase Order Explorer: filtered/sorted/paginated award transactions.
router.get('/awards', (req, res) => {
  const { q, agency, category, country, minAmount, maxAmount, sort, order, page, pageSize } = req.query
  res.json(
    queryAwards({
      q,
      agency,
      category,
      country,
      minAmount: toNumber(minAmount),
      maxAmount: toNumber(maxAmount),
      sort,
      order,
      page: toNumber(page) ?? 1,
      pageSize: Math.min(toNumber(pageSize) ?? 25, 100),
    })
  )
})

// Monthly Spend Dashboard: FY2025 Oct-Sep totals, optionally scoped.
router.get('/awards/monthly', (req, res) => {
  const { recipient, agency, country } = req.query
  res.json(getMonthlyRollup({ recipient, agency, country }))
})

// Dashboard secondary view: top-N totals by agency or by country.
router.get('/awards/breakdown', (req, res) => {
  const { by, agency, country, limit } = req.query
  if (by !== 'agency' && by !== 'country') {
    return res.status(400).json({ error: "Query param 'by' must be 'agency' or 'country'" })
  }
  res.json(getBreakdown({ by, agency, country, limit: toNumber(limit) ?? 10 }))
})

// Filter option lists (agencies, categories, countries) for the Explorer UI.
router.get('/filters', (req, res) => {
  res.json(getFilterOptions())
})

// Vendor Lookup step 1: countries sorted by total spend.
router.get('/countries', (req, res) => {
  res.json(getCountries())
})

// Vendor Lookup step 2: vendors within a country, sorted by total spend.
router.get('/countries/:country/vendors', (req, res) => {
  res.json(getVendorsForCountry(req.params.country))
})

// Vendor Lookup step 3: full profile for one vendor.
router.get('/vendors/:recipient', (req, res) => {
  const profile = getVendorProfile(req.params.recipient)
  if (!profile) return res.status(404).json({ error: 'Vendor not found' })
  res.json(profile)
})

export default router
