import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { Navigate } from 'react-router-dom'

/* ── Shared icon helpers ─────────────────────────────────── */
const IconEmail = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)
const IconLock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconUser = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconEyeOpen = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconEyeClosed = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

/* ── Reusable input wrapper ──────────────────────────────── */
function InputField({ id, label, type = 'text', value, onChange, placeholder, icon, rightSlot, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        <input
          id={id} type={type} required autoComplete={autoComplete}
          value={value} onChange={onChange} placeholder={placeholder}
          className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
        />
        {rightSlot && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}
      </div>
    </div>
  )
}

/* ── Error alert ─────────────────────────────────────────── */
function AlertBox({ message, type = 'error' }) {
  if (!message) return null
  const styles = type === 'success'
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-red-50 text-red-700 border-red-200'
  return (
    <div className={`flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-lg border animate-fade-in ${styles}`}>
      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        {type === 'success'
          ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          : <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
        }
      </svg>
      {message}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   LOGIN FORM
══════════════════════════════════════════════════════════ */
function LoginForm({ onSwitch }) {
  const { login }              = useAuth()
  const [email,    setEmail]   = useState('')
  const [password, setPassword]= useState('')
  const [showPw,   setShowPw]  = useState(false)
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await api.login({ email, password })
      login(res.user, res.token)
    } catch (err) {
      setError(err.message || 'লগইন ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।')
    } finally { setLoading(false) }
  }

  return (
    <div className="px-8 py-7 space-y-4">
      <div>
        <h2 className="text-gray-800 font-bold text-xl">স্বাগতম! 👋</h2>
        <p className="text-gray-400 text-sm mt-0.5">আপনার অ্যাকাউন্টে লগইন করুন</p>
      </div>

      <AlertBox message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          id="login-email" label="ইমেইল" type="email"
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com" icon={<IconEmail />} autoComplete="username"
        />
        <InputField
          id="login-password" label="পাসওয়ার্ড" type={showPw ? 'text' : 'password'}
          value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" icon={<IconLock />} autoComplete="current-password"
          rightSlot={
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="text-gray-400 hover:text-gray-600 transition">
              {showPw ? <IconEyeClosed /> : <IconEyeOpen />}
            </button>
          }
        />

        <button type="submit" disabled={loading}
          className="w-full bg-brand-navy hover:bg-brand-navyLight text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none">
          {loading
            ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>যাচাই হচ্ছে...</span></>
            : <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg><span>লগইন করুন</span></>
          }
        </button>
      </form>

      {/* Switch to Register & Forgot Password */}
      <div className="text-center text-sm text-gray-500 pt-1 space-y-2">
        <button onClick={() => onSwitch('forgot')} className="text-brand-navy hover:underline">
          পাসওয়ার্ড ভুলে গেছেন?
        </button>
        <p>
          অ্যাকাউন্ট নেই?{' '}
          <button onClick={() => onSwitch('register')} className="text-brand-navy font-bold hover:underline">
            নতুন অ্যাকাউন্ট খুলুন →
          </button>
        </p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   REGISTER FORM
══════════════════════════════════════════════════════════ */
function RegisterForm({ onSwitch }) {
  const { login }                = useAuth()
  const [name,     setName]      = useState('')
  const [email,    setEmail]     = useState('')
  const [password, setPassword]  = useState('')
  const [confirm,  setConfirm]   = useState('')
  const [showPw,   setShowPw]    = useState(false)
  const [loading,  setLoading]   = useState(false)
  const [error,    setError]     = useState('')
  const [success,  setSuccess]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')

    if (password !== confirm) {
      setError('পাসওয়ার্ড দুটি মিলছে না।'); return
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'); return
    }

    setLoading(true)
    try {
      const res = await api.register({ name, email, password })
      if (res.pendingApproval) {
        setSuccess(res.message)
        setName('')
        setEmail('')
        setPassword('')
        setConfirm('')
      } else {
        // Auto-login after successful registration (if not pending approval)
        login(res.user, res.token)
      }
    } catch (err) {
      setError(err.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।')
    } finally { setLoading(false) }
  }

  return (
    <div className="px-8 py-7 space-y-4">
      <div>
        <h2 className="text-gray-800 font-bold text-xl">নতুন অ্যাকাউন্ট ✨</h2>
        <p className="text-gray-400 text-sm mt-0.5">তহবিলে যোগ দিতে নিবন্ধন করুন</p>
      </div>

      <AlertBox message={error} />
      <AlertBox message={success} type="success" />

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name */}
        <InputField
          id="reg-name" label="পূর্ণ নাম" type="text"
          value={name} onChange={e => setName(e.target.value)}
          placeholder="আপনার নাম" icon={<IconUser />} autoComplete="name"
        />

        {/* Email */}
        <InputField
          id="reg-email" label="ইমেইল" type="email"
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com" icon={<IconEmail />} autoComplete="email"
        />

        {/* Password */}
        <InputField
          id="reg-password" label="পাসওয়ার্ড" type={showPw ? 'text' : 'password'}
          value={password} onChange={e => setPassword(e.target.value)}
          placeholder="কমপক্ষে ৬ অক্ষর" icon={<IconLock />} autoComplete="new-password"
          rightSlot={
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="text-gray-400 hover:text-gray-600 transition">
              {showPw ? <IconEyeClosed /> : <IconEyeOpen />}
            </button>
          }
        />

        {/* Confirm Password */}
        <InputField
          id="reg-confirm" label="পাসওয়ার্ড নিশ্চিত করুন" type={showPw ? 'text' : 'password'}
          value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="পুনরায় পাসওয়ার্ড দিন" icon={<IconLock />} autoComplete="new-password"
        />



        <button type="submit" disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none mt-1">
          {loading
            ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>নিবন্ধন হচ্ছে...</span></>
            : <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg><span>অ্যাকাউন্ট তৈরি করুন</span></>
          }
        </button>
      </form>

      {/* Switch to Login */}
      <p className="text-center text-sm text-gray-500 pt-1">
        আগে থেকেই অ্যাকাউন্ট আছে?{' '}
        <button onClick={() => onSwitch('login')} className="text-brand-navy font-bold hover:underline">
          লগইন করুন →
        </button>
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   FORGOT PASSWORD FORM
══════════════════════════════════════════════════════════ */
function ForgotPasswordForm({ onSwitch }) {
  const [step, setStep] = useState(1) // 1: Email, 2: OTP & New Password
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSendEmail = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      const res = await api.forgotPassword({ email })
      setSuccess(res.message)
      setStep(2)
    } catch (err) {
      setError(err.message || 'ইমেইল পাঠানো সম্ভব হয়নি।')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      const res = await api.resetPassword({ email, otp, newPassword })
      setSuccess(res.message)
      // Switch back to login after short delay
      setTimeout(() => onSwitch('login'), 2000)
    } catch (err) {
      setError(err.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-8 py-7 space-y-4">
      <div>
        <h2 className="text-gray-800 font-bold text-xl">পাসওয়ার্ড পুনরুদ্ধার 🔐</h2>
        <p className="text-gray-400 text-sm mt-0.5">আপনার ইমেইলের মাধ্যমে পাসওয়ার্ড রিসেট করুন</p>
      </div>

      <AlertBox message={error} />
      <AlertBox message={success} type="success" />

      {step === 1 ? (
        <form onSubmit={handleSendEmail} className="space-y-4">
          <InputField
            id="forgot-email" label="ইমেইল" type="email"
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="আপনার নিবন্ধিত ইমেইল" icon={<IconEmail />}
          />
          <button type="submit" disabled={loading}
            className="w-full bg-brand-navy hover:bg-brand-navyLight text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-60">
            {loading ? 'পাঠানো হচ্ছে...' : 'রিসেট কোড পাঠান'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <InputField
            id="forgot-otp" label="রিসেট কোড (OTP)" type="text"
            value={otp} onChange={e => setOtp(e.target.value)}
            placeholder="ইমেইলে প্রাপ্ত ৬-ডিজিটের কোড" icon={<IconLock />}
          />
          <InputField
            id="forgot-newpw" label="নতুন পাসওয়ার্ড" type="password"
            value={newPassword} onChange={e => setNewPassword(e.target.value)}
            placeholder="নতুন পাসওয়ার্ড দিন" icon={<IconLock />}
          />
          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-60">
            {loading ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 pt-1">
        মনে পড়েছে?{' '}
        <button onClick={() => onSwitch('login')} className="text-brand-navy font-bold hover:underline">
          লগইন করুন →
        </button>
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   ROOT PAGE — toggles between Login & Register
══════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const { user } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'

  if (user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-navyMid to-brand-navyLight flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-gold/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* ── Dark navy brand banner ───────────────── */}
          <div className="bg-brand-navy px-8 py-6 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white mb-3 shadow-lg overflow-hidden ring-4 ring-brand-navyLight">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-1" onError={(e) => e.target.style.display='none'} />
            </div>
            <h1 className="font-bn text-white text-lg font-bold leading-snug notranslate">আসেন খাই কল্যাণ তহবিল</h1>
            <p className="text-blue-200 text-xs mt-1 font-medium">Share &amp; Welfare Fund Management</p>

            {/* Tab switcher inside banner */}
            <div className="flex mt-5 bg-white/10 rounded-xl p-1 gap-1">
              <button onClick={() => setMode('login')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${mode === 'login' ? 'bg-white text-brand-navy shadow' : 'text-white/70 hover:text-white'}`}>
                লগইন
              </button>
              <button onClick={() => setMode('register')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${mode === 'register' ? 'bg-white text-brand-navy shadow' : 'text-white/70 hover:text-white'}`}>
                নিবন্ধন
              </button>
            </div>
          </div>

          {/* ── Form (animated swap) ─────────────────── */}
          <div key={mode} className="animate-fade-in">
            {mode === 'login' && <LoginForm onSwitch={setMode} />}
            {mode === 'register' && <RegisterForm onSwitch={setMode} />}
            {mode === 'forgot' && <ForgotPasswordForm onSwitch={setMode} />}
          </div>
        </div>

        <p className="text-center text-blue-200/50 text-xs mt-5">
          &copy; 2025 <span className="notranslate">আসেন খাই</span> কল্যাণ তহবিল &mdash; সকল অধিকার সংরক্ষিত
        </p>
      </div>
    </div>
  )
}
