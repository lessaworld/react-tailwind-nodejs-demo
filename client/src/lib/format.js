// "Compact" (e.g. $2.7M) for chart axes/tiles where space is tight and precision
// isn't the point; "Full" (e.g. $2,679,864) for table rows and tooltips where
// the exact dollar figure matters.
const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const fullCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatCurrencyCompact(amount) {
  return compactCurrency.format(amount)
}

export function formatCurrencyFull(amount) {
  return fullCurrency.format(amount)
}

// actionDate from the API is "YYYY-MM-DD" (ISO) -- reformat to the more
// familiar M/D/YYYY for display.
export function formatDate(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${m}/${d}/${y}`
}
