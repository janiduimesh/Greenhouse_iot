import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-slate-800 border border-red-500/30 rounded-xl p-8 text-center max-w-md">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-white text-lg font-semibold mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm">
            This page requires <span className="text-red-400 font-medium">{requiredRole}</span> privileges.
            Your role: <span className="text-sky-400 font-medium">{user.role}</span>
          </p>
        </div>
      </div>
    )
  }

  return children
}
