const REPO_URL = 'https://github.com/lessaworld/react-tailwind-nodejs-demo'

// A persistent (non-dismissible) strip above the Nav, distinct from
// LandingModal: the modal is a one-time gate, this is an always-visible
// disclosure for anyone who lands mid-session or scrolls back up.
export default function DisclaimerBanner() {
  return (
    <div className="bg-red-600 px-4 py-3 text-center text-xs text-white sm:px-6">
      <span className="font-semibold">DISCLAIMER:</span> this is a demo
      project built with real data, intended to explore Node.js, React, and
      Tailwind development, not to make any analytical claim.{' '}
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="font-medium underline hover:text-red-100"
      >
        View source on GitHub
      </a>
    </div>
  )
}
