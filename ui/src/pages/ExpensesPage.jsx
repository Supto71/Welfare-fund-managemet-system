import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

// helpers
const fmt = (v) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
]

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return `${d.getDate()} ${MONTHS_BN[d.getMonth()]} ${d.getFullYear()}`
}

const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const INITIAL_RECORDS = [
  { id: 1, date: '2026-09-01', title: 'অফিস ভাড়া', type: 'expense', amount: 5000, remarks: 'সেপ্টেম্বর মাসের ভাড়া' },
  { id: 2, date: '2026-09-03', title: 'ইন্টারনেট বিল', type: 'expense', amount: 1200, remarks: '' },
  { id: 3, date: '2026-09-05', title: 'শেয়ার বাজার বিনিয়োগ', type: 'investment', amount: 50000, remarks: 'DSE তে বিনিয়োগ' },
  { id: 4, date: '2026-08-15', title: 'ট্রান্সপোর্ট খরচ', type: 'expense', amount: 800, remarks: 'মিটিং যাতায়াত' },
  { id: 5, date: '2026-08-20', title: 'প্রিন্টিং ও স্টেশনারি', type: 'expense', amount: 450, remarks: '' },
  { id: 6, date: '2026-08-25', title: 'FDR বিনিয়োগ', type: 'investment', amount: 100000, remarks: 'ব্যাংক FDR, ১ বছর মেয়াদ' },
  { id: 7, date: '2026-07-10', title: 'ওষুধ ক্রয়', type: 'expense', amount: 2300, remarks: 'কল্যাণ সুবিধা' },
  { id: 8, date: '2026-07-18', title: 'সেবিংস বন্ড', type: 'investment', amount: 25000, remarks: 'সরকারি সঞ্চয়পত্র' },
]

const TYPE_OPTIONS = [
  { value: 'all',        label: 'সকল রেকর্ড' },
  { value: 'expense',    label: 'সাধারণ খরচ' },
  { value: 'investment', label: 'বিনিয়োগ' },
]

const EMPTY_FORM = { date: '', title: '', type: 'expense', amount: '', remarks: '' }

function SummaryCard({ label, value, icon, color }) {
  const colors = {
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: 'bg-red-100 text-red-600',    border: 'border-red-100' },
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'bg-blue-100 text-blue-600',   border: 'border-blue-100' },
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'bg-green-100 text-green-600',  border: 'border-green-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'bg-purple-100 text-purple-600', border: 'border-purple-100' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4 flex items-center gap-3 shadow-sm`}>
      <div className={`${c.icon} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-lg font-bold ${c.text}`}>৳ {fmt(value)}</p>
      </div>
    </div>
  )
}

function TypeBadge({ type }) {
  if (type === 'investment')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">📈 বিনিয়োগ</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">💸 খরচ</span>
}

function AddEditModal({ record, onClose, onSave }) {
  const [form, setForm] = useState(record ? { ...record, amount: String(record.amount) } : { ...EMPTY_FORM })
  const [err, setErr] = useState('')
  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSubmit = () => {
    if (!form.date) return setErr('তারিখ দিন।')
    if (!form.title.trim()) return setErr('খাত / বিবরণ দিন।')
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      return setErr('সঠিক পরিমাণ দিন।')
    onSave({ ...form, amount: Number(form.amount) })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-lg">{record ? 'রেকর্ড সম্পাদনা করুন' : '+ নতুন খরচ / বিনিয়োগ'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">তারিখ *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">খাত / বিবরণ *</label>
              <input type="text" placeholder="যেমন: অফিস ভাড়া, FDR বিনিয়োগ..." value={form.title}
                onChange={e => set('title', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ধরন *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm bg-white">
                <option value="expense">💸 সাধারণ খরচ (Expense)</option>
                <option value="investment">📈 বিনিয়োগ (Investment)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">পরিমাণ (৳) *</label>
              <input type="number" min="0" placeholder="0.00" value={form.amount}
                onChange={e => set('amount', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">মন্তব্য / নোট</label>
              <textarea rows={2} placeholder="অতিরিক্ত তথ্য (ঐচ্ছিক)" value={form.remarks}
                onChange={e => set('remarks', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm resize-none" />
            </div>
          </div>
          {err && <p className="text-red-600 text-xs font-medium">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">বাতিল</button>
            <button onClick={handleSubmit} className="flex-1 bg-brand-navy text-white py-2.5 rounded-lg text-sm font-bold hover:bg-brand-navyLight transition">
              {record ? 'আপডেট করুন' : 'যোগ করুন'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [records, setRecords]       = useState(INITIAL_RECORDS)
  const [typeFilter, setTypeFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [search, setSearch]         = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editRecord, setEditRecord] = useState(null)

  const monthOptions = useMemo(() => {
    const set = new Set(records.map(r => r.date.slice(0, 7)))
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [records])

  const formatMonthLabel = (m) => {
    const [year, month] = m.split('-')
    const d = new Date(year, parseInt(month) - 1, 1)
    return `${MONTHS_BN[d.getMonth()]} ${d.getFullYear()}`
  }

  const filtered = useMemo(() => {
    return records
      .filter(r => typeFilter === 'all' || r.type === typeFilter)
      .filter(r => monthFilter === 'all' || r.date.startsWith(monthFilter))
      .filter(r => r.title.toLowerCase().includes(search.toLowerCase()) ||
                   r.remarks.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [records, typeFilter, monthFilter, search])

  const totalExpense    = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  const totalInvestment = records.filter(r => r.type === 'investment').reduce((s, r) => s + r.amount, 0)
  const currentMonth    = getCurrentMonth()
  const currentMonthExp = records.filter(r => r.type === 'expense' && r.date.startsWith(currentMonth)).reduce((s, r) => s + r.amount, 0)
  const filteredTotal   = filtered.reduce((s, r) => s + r.amount, 0)

  const handleSave = (data) => {
    if (editRecord) {
      setRecords(prev => prev.map(r => r.id === editRecord.id ? { ...r, ...data } : r))
    } else {
      const newId = Math.max(0, ...records.map(r => r.id)) + 1
      setRecords(prev => [...prev, { id: newId, ...data }])
    }
    setShowModal(false)
    setEditRecord(null)
  }

  const handleEdit = (rec) => { setEditRecord(rec); setShowModal(true) }
  const handleDelete = (id) => {
    if (!window.confirm('এই রেকর্ডটি মুছতে চান?')) return
    setRecords(prev => prev.filter(r => r.id !== id))
  }
  const openAddModal = () => { setEditRecord(null); setShowModal(true) }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onRefresh={() => {}} />

      <main className="flex-1 max-w-6xl mx-auto w-full pb-10 px-4 sm:px-6 space-y-5 pt-5 animate-fade-in">

        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">ব্যয় ও বিনিয়োগ (Expenses &amp; Investments)</h2>
            <p className="text-xs text-gray-500 mt-0.5">তহবিলের সকল খরচ ও বিনিয়োগের বিস্তারিত রেকর্ড</p>
          </div>
          {isAdmin && (
            <button onClick={openAddModal}
              className="flex items-center gap-2 bg-brand-navy text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-brand-navyLight transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              নতুন খরচ / বিনিয়োগ যোগ করুন
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="মোট ব্যয়" value={totalExpense} color="red"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>}
          />
          <SummaryCard label="মোট বিনিয়োগ" value={totalInvestment} color="blue"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>}
          />
          <SummaryCard label="চলতি মাসের খরচ" value={currentMonthExp} color="purple"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>}
          />
          <SummaryCard label="ফিল্টার করা মোট" value={filteredTotal} color="green"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>}
          />
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-0">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input type="text" placeholder="খাত বা মন্তব্য খুঁজুন..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" />
          </div>
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy bg-white">
            <option value="all">সব সময় (All Time)</option>
            {monthOptions.map(m => <option key={m} value={m}>{formatMonthLabel(m)}</option>)}
          </select>
          <div className="flex gap-1.5 flex-wrap">
            {TYPE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setTypeFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
                  typeFilter === opt.value
                    ? 'bg-brand-navy text-white border-brand-navy shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center bg-gray-50/60">
            <h3 className="text-sm font-bold text-gray-700">
              রেকর্ড তালিকা
              <span className="ml-2 bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{filtered.length} টি</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 font-semibold uppercase tracking-wide border-b border-gray-100 bg-gray-50/40">
                  <th className="px-4 py-3 text-left w-10">#</th>
                  <th className="px-4 py-3 text-left">তারিখ</th>
                  <th className="px-4 py-3 text-left">খাত / বিবরণ</th>
                  <th className="px-4 py-3 text-center">ধরন</th>
                  <th className="px-4 py-3 text-right">পরিমাণ (৳)</th>
                  <th className="px-4 py-3 text-left">মন্তব্য / নোট</th>
                  {isAdmin && <th className="px-4 py-3 text-center">অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-gray-400 text-sm">
                      <svg className="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      কোনো রেকর্ড পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  filtered.map((rec, idx) => (
                    <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-4 py-3 text-gray-400 font-medium text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">{formatDate(rec.date)}</td>
                      <td className="px-4 py-3 text-gray-800 font-semibold">{rec.title}</td>
                      <td className="px-4 py-3 text-center"><TypeBadge type={rec.type} /></td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${rec.type === 'investment' ? 'text-blue-700' : 'text-red-600'}`}>
                        {fmt(rec.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[180px] truncate">{rec.remarks || '—'}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(rec)} title="সম্পাদনা"
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDelete(rec.id)} title="মুছুন"
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                    <td colSpan={4} className="px-4 py-3 text-right text-xs text-gray-600">ফিল্টার করা মোট পরিমাণ:</td>
                    <td className="px-4 py-3 text-right text-sm text-brand-navy tabular-nums">৳ {fmt(filteredTotal)}</td>
                    <td colSpan={isAdmin ? 2 : 1} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </main>

      {showModal && (
        <AddEditModal
          record={editRecord}
          onClose={() => { setShowModal(false); setEditRecord(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
