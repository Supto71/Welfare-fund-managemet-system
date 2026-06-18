import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function Header({ onRefresh }) {
  const { user, logout, updateUser } = useAuth()
  const location = useLocation()
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handleEditNameClick = () => {
    setNewName(user?.name || '')
    setMsg('')
    setIsEditingName(true)
  }

  const handleSaveName = async () => {
    if (!newName.trim()) {
      setMsg('নাম ফাঁকা রাখা যাবে না।')
      return
    }
    setLoading(true)
    setMsg('')
    try {
      const res = await api.updateMyName({ name: newName })
      updateUser(res.user)
      setIsEditingName(false)
    } catch (err) {
      setMsg(err.message || 'নাম পরিবর্তন ব্যর্থ হয়েছে।')
    } finally {
      setLoading(false)
    }
  }

  return (
    <header className="no-print bg-brand-navy text-white shadow-lg sticky top-0 z-30">
      {/* Top strip */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-0.5" onError={(e) => e.target.style.display='none'} />
          </div>
          <div className="min-w-0">
            <h1 className="font-bn font-bold text-base sm:text-lg leading-tight truncate notranslate">
              আসেন খাই কল্যাণ তহবিল
            </h1>
            <p className="text-blue-300 text-xs hidden sm:block">Share &amp; Welfare Fund Dashboard</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 ml-6">
          <Link to="/"
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
              location.pathname === '/'
                ? 'bg-white text-brand-navy'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}>
            হোম (Home)
          </Link>
          <Link to="/dashboard"
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
              location.pathname === '/dashboard'
                ? 'bg-white text-brand-navy'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}>
            ড্যাশবোর্ড (Dashboard)
          </Link>
          <Link to="/welfare-fund" className={`px-4 py-2 rounded-lg text-sm font-bold transition ${location.pathname === '/welfare-fund' ? 'bg-white text-brand-navy shadow-sm' : 'text-blue-200 hover:text-white hover:bg-white/10'}`}>
            কল্যাণ তহবিল (Welfare Fund)
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Refresh */}
          <button onClick={onRefresh} title="রিফ্রেশ"
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>

          {/* User pill */}
          <button onClick={handleEditNameClick} title="প্রোফাইল এডিট করুন" className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl hover:bg-white/20 transition group text-left">
            <div className="w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center text-xs font-bold text-brand-navy">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold leading-none group-hover:text-brand-gold transition-colors">{user?.name}</p>
              <p className="text-blue-300 text-[10px] capitalize">{user?.role}</p>
            </div>
          </button>

          {/* Logout */}
          <button onClick={logout} title="লগআউট"
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-red-500/80 transition flex items-center justify-center group">
            <svg className="w-4 h-4 group-hover:text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-brand-gold via-green-400 to-blue-400" />

      {/* Edit Name Modal */}
      {isEditingName && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-gray-800" onClick={() => setIsEditingName(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">আপনার নাম পরিবর্তন করুন</h3>
                <button onClick={() => setIsEditingName(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">নতুন নাম</label>
                <input
                  type="text" autoFocus
                  value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm"
                />
              </div>

              {msg && <p className="text-red-600 text-xs font-medium">{msg}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsEditingName(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  বাতিল
                </button>
                <button onClick={handleSaveName} disabled={loading}
                  className="flex-1 bg-brand-navy text-white py-2.5 rounded-lg text-sm font-bold transition hover:bg-brand-navyLight flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? 'সংরক্ষণ...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
