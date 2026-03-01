export default function DashboardCard({ title, icon, children, className = '' }) {
  return (
    <section
      className={`rounded-xl bg-slate-800 border border-slate-700 p-4 md:p-5 ${className}`}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-3 text-slate-300 text-sm font-medium">
          {icon}
          {title}
        </div>
      )}
      {children}
    </section>
  )
}
