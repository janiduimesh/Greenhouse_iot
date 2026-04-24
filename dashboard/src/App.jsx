import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Header from './components/Header'
import ChatBot from './components/ChatBot'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Settings from './pages/Settings'
import Analytics from './pages/Analytics'
import Forecast from './pages/Forecast'
import Login from './pages/Login'
import Register from './pages/Register'

function AppContent() {
  const { user, logout, isAdmin } = useAuth()

  // If not logged in, show login/register routes only
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/forecast', label: 'Forecast' },
    { to: '/history', label: 'Alerts' },
    ...(isAdmin() ? [
      { to: '/analytics', label: 'Analytics' },
      { to: '/settings', label: 'Settings' },
      { to: '/register', label: 'Users' },
    ] : []),
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Top bar with user info */}
      <div className="bg-slate-800/60 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isAdmin() ? 'bg-sky-400' : 'bg-green-400'}`} />
          <span className="text-slate-300 text-xs font-medium">{user.name}</span>
          <span className="text-slate-500 text-xs">({user.role})</span>
        </div>
        <button
          onClick={logout}
          className="px-3 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-all"
        >
          Sign Out
        </button>
      </div>

      <main className="flex-1 p-4 md:p-6 pb-20">
        <Routes>
          <Route path="/" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/forecast" element={
            <ProtectedRoute><Forecast /></ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute><History /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute requiredRole="admin"><Settings /></ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute requiredRole="admin"><Analytics /></ProtectedRoute>
          } />
          <Route path="/register" element={
            <ProtectedRoute requiredRole="admin"><Register /></ProtectedRoute>
          } />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex justify-center gap-0 safe-area-pb">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `px-5 py-3 text-xs font-medium transition-colors ${
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

      {/* AI Chatbot — floating bubble, visible on all pages */}
      <ChatBot />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
