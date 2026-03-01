export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
      <div className="flex items-center gap-2">
        <span className="text-green-500" aria-hidden>
          <CheckIcon />
        </span>
        <h1 className="text-lg font-semibold text-white">
          Smart Greenhouse Monitoring Dashboard
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <button type="button" className="p-2 text-slate-400 hover:text-slate-200" aria-label="Notifications">
          <BellIcon />
        </button>
        <button type="button" className="p-2 text-slate-400 hover:text-slate-200" aria-label="Schedule">
          <CalendarIcon />
        </button>
        <button type="button" className="p-2 text-slate-400 hover:text-slate-200" aria-label="Menu">
          <MenuIcon />
        </button>
      </div>
    </header>
  )
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13 21a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
