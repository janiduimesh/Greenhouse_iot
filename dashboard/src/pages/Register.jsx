import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { BASE_URL } from '../api/socketConfig'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('farmer')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const { register, token } = useAuth()

  // Fetch existing users
  async function fetchUsers() {
    setUsersLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const user = await register(name, email, password, role)
      setSuccess(`${user.name} registered as ${user.role} successfully!`)
      setName('')
      setEmail('')
      setPassword('')
      setRole('farmer')
      fetchUsers() // refresh user list
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-slate-500 text-xs uppercase tracking-widest">
        Admin — User Management
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Registration Form ──────────────────────────────── */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              <span className="text-xl">➕</span>
            </div>
            <div>
              <h2 className="text-white font-semibold">Register New User</h2>
              <p className="text-slate-400 text-xs">Add a new admin or farmer to the system</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <span className="text-red-400">⚠</span>
                <span className="text-red-300">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}
              >
                <span className="text-green-400">✓</span>
                <span className="text-green-300">{success}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-400 text-sm font-medium mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="John Doe"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@greenhouse.local"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min 6 characters"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-sm font-medium mb-1.5">Role</label>
              <div className="flex gap-3">
                {['farmer', 'admin'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                      role === r
                        ? r === 'admin'
                          ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                          : 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-slate-900/60 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {r === 'admin' ? '🛡️ Admin' : '🌾 Farmer'}
                  </button>
                ))}
              </div>
              <p className="text-slate-500 text-xs mt-1.5">
                {role === 'admin'
                  ? 'Full access: dashboard, settings, reports, user management'
                  : 'Limited access: dashboard, forecast, alerts only'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating user...
                </>
              ) : (
                'Register User'
              )}
            </button>
          </form>
        </div>

        {/* ── Existing Users List ────────────────────────────── */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
              >
                <span className="text-xl">👥</span>
              </div>
              <div>
                <h2 className="text-white font-semibold">Registered Users</h2>
                <p className="text-slate-400 text-xs">{users.length} user{users.length !== 1 ? 's' : ''} in the system</p>
              </div>
            </div>

            <button
              onClick={fetchUsers}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 transition-all"
            >
              Refresh
            </button>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500">
              <span className="text-3xl mb-2">📭</span>
              <p className="text-sm">No users registered yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                      u.role === 'admin'
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{u.name}</p>
                      <p className="text-slate-500 text-xs">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      u.role === 'admin'
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        : 'bg-green-500/15 text-green-400 border border-green-500/30'
                    }`}>
                      {u.role === 'admin' ? '🛡️ Admin' : '🌾 Farmer'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Privileges Reference ──────────────────────────── */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <span>📋</span> Role Privileges Reference
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sky-400 font-semibold text-sm">🛡️ Admin (Owner)</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Live Dashboard & Sensor Data</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> ML Forecast Predictions</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Alerts & History</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Download Reports (CSV)</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Device Settings & Control</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> User Management</li>
            </ul>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-400 font-semibold text-sm">🌾 Farmer</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Live Dashboard & Sensor Data</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> ML Forecast Predictions</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Alerts & History</li>
              <li className="flex items-center gap-2"><span className="text-red-400">✗</span> Download Reports (CSV)</li>
              <li className="flex items-center gap-2"><span className="text-red-400">✗</span> Device Settings & Control</li>
              <li className="flex items-center gap-2"><span className="text-red-400">✗</span> User Management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
