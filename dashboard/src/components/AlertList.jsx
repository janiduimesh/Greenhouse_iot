function timeAgo(mins) {
  if (mins < 60) return `${mins} mins ago`
  const h = Math.floor(mins / 60)
  return h === 1 ? '1 hr ago' : `${h} hrs ago`
}

export default function AlertList({ alerts }) {
  return (
    <ul className="space-y-3">
      {alerts.map((a) => (
        <li
          key={a.id}
          className="flex items-start gap-3 p-2 rounded-lg bg-slate-700/50 border border-slate-600"
        >
          <span
            className={`mt-0.5 flex-shrink-0 ${
              a.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
            }`}
          >
            <AlertIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-200">{a.message}</p>
            <p
              className={`text-xs ${
                a.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
              }`}
            >
              {a.severity === 'critical' ? 'Critical' : 'Warning'} – {timeAgo(a.minutesAgo)}
            </p>
          </div>
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
              a.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
            }`}
            aria-hidden
          />
        </li>
      ))}
    </ul>
  )
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
