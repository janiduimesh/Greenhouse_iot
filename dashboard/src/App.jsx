import { Routes, Route, NavLink } from 'react-router-dom'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Settings from './pages/Settings'
import Reports from './pages/Reports'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-4 md:p-6 pb-20">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex justify-center gap-0 safe-area-pb">
        {[
          { to: '/', label: 'Dashboard' },
          { to: '/history', label: 'History' },
          { to: '/settings', label: 'Settings' },
          { to: '/reports', label: 'Reports' },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `px-6 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-700 text-sky-400 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default App
