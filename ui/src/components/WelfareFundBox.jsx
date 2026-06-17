import { useState } from 'react'
import { api } from '../api'
import CurrencySymbol from './CurrencySymbol'

const fmt = (v) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function WelfareFundBox({ totalDonation, totalExpense, welfareBalance, isAdmin, onUpdate }) {
  const [modal,   setModal]   = useState(null)   // { field, mode }
  const [amount,  setAmount]  = useState('')
  const [mode,    setMode]    = useState('add')
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState('')

  const openModal = (field) => { setModal(field); setAmount(''); setMode('add'); setMsg('') }
  const closeModal = () => { setModal(null); setMsg('') }

  const handleUpdate = async () => {
    if (!amount || isNaN(amount) || Number(amount) < 0) {
      setMsg('সঠিক পরিমাণ লিখুন।'); return
    }
    setLoading(true); setMsg('')
    try {
      await api.updateWelfare({ field: modal, amount: Number(amount), mode })
      onUpdate()
      closeModal()
    } catch (err) {
      setMsg(err.message || 'আপডেট ব্যর্থ হয়েছে।')
    } finally { setLoading(false) }
  }

  const balancePos = welfareBalance >= 0

  return (
    <>
      {/* ── Welfare Card ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-navy to-brand-navyMid px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bn text-white font-bold text-sm">কল্যাণ তহবিল (Welfare Fund Summary)</h3>
              <p className="text-blue-300 text-xs">Welfare Fund Summary</p>
            </div>
          </div>
          {/* Balance badge */}
          <div className={`px-4 py-2 rounded-xl font-extrabold text-lg flex items-center gap-1.5 ${balancePos ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
            <CurrencySymbol className={`w-5 h-5 ${balancePos ? 'text-green-300' : 'text-red-300'}`} />
            <span>
              {fmt(Math.abs(welfareBalance))}
              <span className="text-xs font-medium ml-1 opacity-80">(Balance)</span>
            </span>
          </div>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          {/* Donation */}
          <div className="p-5 flex flex-col gap-1 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">চাঁদা</span>
              <span className="text-[10px] text-gray-300">Donation</span>
            </div>
            <div className="text-green-600 font-extrabold text-xl mt-1 flex items-center gap-1">
              <CurrencySymbol className="w-4 h-4 text-green-700" />
              <span>{fmt(totalDonation)}</span>
            </div>
            <div className="w-full h-1 rounded-full bg-green-100 mt-2">
              <div className="h-1 rounded-full bg-green-500 w-full" />
            </div>
          </div>

          {/* Expense */}
          <div className="p-5 flex flex-col gap-1 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">খরচ</span>
              <span className="text-[10px] text-gray-300">Expense</span>
            </div>
            <div className="text-red-600 font-extrabold text-xl mt-1 flex items-center gap-1">
              <CurrencySymbol className="w-4 h-4 text-red-600" />
              <span>{fmt(totalExpense)}</span>
            </div>
            <div className="w-full h-1 rounded-full bg-red-100 mt-2">
              <div
                className="h-1 rounded-full bg-red-500 transition-all"
                style={{ width: totalDonation > 0 ? `${Math.min(100, (totalExpense / totalDonation) * 100)}%` : '0%' }}
              />
            </div>
            {isAdmin && (
              <button onClick={() => openModal('total_expense')}
                className="mt-3 text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                আপডেট (Update)
              </button>
            )}
          </div>

          {/* Balance */}
          <div className={`p-5 flex flex-col gap-1 ${balancePos ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">ব্যালেন্স</span>
              <span className="text-[10px] text-gray-300">Balance</span>
            </div>
            <div className={`font-extrabold text-xl mt-1 flex items-center gap-1 ${balancePos ? 'text-green-600' : 'text-red-600'}`}>
              {!balancePos && '−'}
              <CurrencySymbol className={`w-4 h-4 ${balancePos ? 'text-green-700' : 'text-red-600'}`} />
              <span>{fmt(Math.abs(welfareBalance))}</span>
            </div>
            <span className={`text-xs font-semibold mt-2 px-2 py-0.5 rounded-full self-start ${balancePos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {balancePos ? '✓ উদ্বৃত্ত (Surplus)' : '⚠ ঘাটতি (Deficit)'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Admin Edit Modal ──────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-800 text-lg">
                  {modal === 'total_donation' ? '💰 চাঁদা আপডেট (Update Donation)' : '💸 খরচ আপডেট (Update Expense)'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">মোড (Mode)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[['add', '+ যোগ করুন (Add)'], ['set', '= নির্দিষ্ট করুন (Set)']].map(([v, l]) => (
                      <button key={v} onClick={() => setMode(v)}
                        className={`py-2 px-3 rounded-lg text-sm font-semibold border-2 transition ${mode === v ? 'border-brand-navy bg-brand-navy text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">পরিমাণ (Amount)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <CurrencySymbol className="w-4 h-4 text-gray-400" />
                    </span>
                    <input type="number" min="0" step="0.01"
                      value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium"
                    />
                  </div>
                </div>

                {msg && <p className="text-red-600 text-xs font-medium">{msg}</p>}

                <button onClick={handleUpdate} disabled={loading}
                  className="w-full bg-brand-navy hover:bg-brand-navyLight text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> সংরক্ষণ হচ্ছে...</>
                    : 'সংরক্ষণ করুন (Save)'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
