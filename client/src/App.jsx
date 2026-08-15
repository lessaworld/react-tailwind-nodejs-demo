import { useState } from 'react'
import Nav from './components/Nav.jsx'
import LandingModal from './components/LandingModal.jsx'
import DisclaimerBanner from './components/DisclaimerBanner.jsx'
import Explorer from './views/Explorer.jsx'
import Dashboard from './views/Dashboard.jsx'
import VendorLookup from './views/VendorLookup.jsx'

export default function App() {
  // Just three fixed views, so a bit of local state stands in for a router --
  // no react-router needed for this.
  const [tab, setTab] = useState('explorer')

  return (
    <div className="min-h-screen bg-page">
      <LandingModal />
      <DisclaimerBanner />
      <Nav active={tab} onChange={setTab} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {tab === 'explorer' && <Explorer />}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'vendors' && <VendorLookup />}
      </main>
    </div>
  )
}
