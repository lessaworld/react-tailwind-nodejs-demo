import { useState } from 'react'
import Nav from './components/Nav.jsx'
import LandingModal from './components/LandingModal.jsx'
import DisclaimerBanner from './components/DisclaimerBanner.jsx'
import AwardExplorer from './views/AwardExplorer.jsx'
import Dashboard from './views/Dashboard.jsx'
import CountryExplorer from './views/CountryExplorer.jsx'

export default function App() {
  // Just three fixed views, so a bit of local state stands in for a router --
  // no react-router needed for this. Dashboard is the default landing tab
  // (a chart is a better first impression than an empty-looking table).
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-page">
      <LandingModal />
      <DisclaimerBanner />
      <Nav active={tab} onChange={setTab} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {tab === 'explorer' && <AwardExplorer />}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'vendors' && <CountryExplorer />}
      </main>
    </div>
  )
}
