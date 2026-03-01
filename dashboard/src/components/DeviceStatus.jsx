export default function DeviceStatus({ devices }) {
  return (
    <ul className="space-y-3">
      {devices.map((d) => (
        <li
          key={d.id}
          className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/50 border border-slate-600"
        >
          {d.status === 'online' ? (
            <span className="text-green-500 flex-shrink-0" aria-hidden>
              <CheckIcon />
            </span>
          ) : (
            <span className="text-red-500 flex-shrink-0" aria-hidden>
              <AlertIcon />
            </span>
          )}
          <span className="font-medium text-slate-200">{d.name}</span>
          <span
            className={`ml-auto text-sm ${
              d.status === 'online' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {d.status === 'online' ? 'Online' : '– Alert Active'}
          </span>
          {d.status === 'alert' && (
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-slate-200"
              aria-label="More info"
            >
              <InfoIcon />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}
