// Thin fetch wrappers for the Express API -- one function per route, so views
// don't build URLs by hand. Requests go to a relative "/api/..." path: Vite's
// dev proxy forwards that to Express on :3000 in development, and in
// production Express serves the page itself, so it's always same-origin.

async function getJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

// Skips empty/undefined filter values instead of sending e.g. "?agency=" --
// keeps request URLs (and server-side query parsing) clean.
function toQueryString(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function fetchAwards(params) {
  return getJSON(`/api/awards${toQueryString(params)}`)
}

export function fetchMonthly(params) {
  return getJSON(`/api/awards/monthly${toQueryString(params)}`)
}

export function fetchBreakdown(params) {
  return getJSON(`/api/awards/breakdown${toQueryString(params)}`)
}

export function fetchFilters() {
  return getJSON('/api/filters')
}

export function fetchCountries() {
  return getJSON('/api/countries')
}

export function fetchVendorsForCountry(country) {
  return getJSON(`/api/countries/${encodeURIComponent(country)}/vendors`)
}

export function fetchVendorProfile(recipient) {
  return getJSON(`/api/vendors/${encodeURIComponent(recipient)}`)
}
