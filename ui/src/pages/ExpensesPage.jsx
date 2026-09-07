import { useState, useEffect, useMemo } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../api"
import Header from "../components/Header"
import LoadingScreen from "../components/LoadingScreen"

// ─── helpers ───────────────────────────────────────────────────────────────────
const fmt = (v) =>
  Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const MONTHS_BN = [
  "জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন",
  "জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর",
]

const fmtDate = (s) => {
  if (!s) return "—"
  const d = new Date(s)
  return `${d.getDate()} ${MONTHS_BN[d.getMonth()]} ${d.getFullYear()}`
}

// ─── dummy expense records (swap with Supabase later) ──────────────────────────
const INIT = [
  { id: 1, date: "2026-09-03", title: "ইন্টারনেট বিল",       amount: 1200,  remarks: "" },
  { id: 2, date: "2026-09-01", title: "অফিস ভাড়া",           amount: 5000,  remarks: "সেপ্টেম্বর" },
  { id: 3, date: "2026-08-20", title: "প্রিন্টিং ও স্টেশনারি", amount: 450,   remarks: "" },
  { id: 4, date: "2026-08-15", title: "ট্রান্সপোর্ট খরচ",    amount: 800,   remarks: "মিটিং যাতায়াত" },
  { id: 5, date: "2026-07-10", title: "ওষুধ ক্রয়",           amount: 2300,  remarks: "কল্যাণ সুবিধা" },
]

const BLANK = { date: "", title: "", amount: "", remarks: "" }

// ─── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, color, icon, sub }) {
  const palette = {
    green:  "from-green-500  to-emerald-600",
    red:    "from-red-500    to-rose-600",
    blue:   "from-blue-500   to-indigo-600",
  }
  return (
    <div className={`bg-gradient-to-br ${palette[color]} rounded-2xl p-5 text-white shadow-lg flex items-center gap-4`}>
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{label}</p>
        <p className="text-2xl font-extrabold leading-tight">৳ {fmt(value)}</p>
        {sub && <p className="text-[11px] text-white/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Add / Edit modal ──────────────────────────────────────────────────────────
function Modal({ record, onClose, onSave }) {
  const [form, setForm] = useState(
    record ? { ...record, amount: String(record.amount) } : { ...BLANK }
  )
  const [err, setErr] = useState("")
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.date)           return setErr("তারিখ দিন।")
    if (!form.title.trim())   return setErr("বিবরণ দিন।")
    if (!form.amount || isNaN(+form.amount) || +form.amount <= 0)
                              return setErr("সঠিক পরিমাণ দিন।")
    onSave({ ...form, amount: +form.amount })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-lg">
              {record ? "খরচ সম্পাদনা" : "+ নতুন খরচ যোগ করুন"}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">তারিখ *</label>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">খাত / বিবরণ *</label>
              <input type="text" placeholder="যেমন: অফিস ভাড়া, বিদ্যুৎ বিল..." value={form.title}
                onChange={e => set("title", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">পরিমাণ (৳) *</label>
              <input type="number" min="0" placeholder="0.00" value={form.amount}
                onChange={e => set("amount", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">মন্তব্য</label>
              <input type="text" placeholder="অতিরিক্ত তথ্য (ঐচ্ছিক)" value={form.remarks}
                onChange={e => set("remarks", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" />
            </div>
          </div>

          {err && <p className="text-red-500 text-xs font-medium">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              বাতিল
            </button>
            <button onClick={submit}
              className="flex-1 bg-brand-navy text-white py-2.5 rounded-xl text-sm font-bold hover:bg-brand-navyLight transition">
              {record ? "আপডেট করুন" : "যোগ করুন"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  // savings from dashboard API
  const [savings,  setSavings]  = useState(0)
  const [loading,  setLoading]  = useState(true)

  // expense records (local state — swap with API later)
  const [records,  setRecords]  = useState(INIT)
  const [search,   setSearch]   = useState("")
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState(null)

  // fetch real savings from dashboard summary
  useEffect(() => {
    api.getSummary("all")
      .then(res => setSavings(res.data?.totalSavings || 0))
      .catch(() => setSavings(0))
      .finally(() => setLoading(false))
  }, [])

  // metrics
  const totalExpense  = records.reduce((s, r) => s + r.amount, 0)
  const netBalance    = savings - totalExpense

  // filtered list
  const filtered = useMemo(() =>
    records
      .filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.remarks.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [records, search]
  )

  // CRUD
  const handleSave = (data) => {
    if (editing) {
      setRecords(prev => prev.map(r => r.id === editing.id ? { ...r, ...data } : r))
    } else {
      const newId = Math.max(0, ...records.map(r => r.id)) + 1
      setRecords(prev => [{ id: newId, ...data }, ...prev])
    }
    setModal(false); setEditing(null)
  }
  const openEdit   = (r) => { setEditing(r); setModal(true) }
  const openAdd    = ()  => { setEditing(null); setModal(true) }
  const handleDel  = (id) => {
    if (!window.confirm("এই রেকর্ডটি মুছতে চান?")) return
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onRefresh={() => {}} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 pb-12 space-y-6 animate-fade-in">

        {/* ── Page Header ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-gray-800">ব্যয় ব্যবস্থাপনা</h2>
            <p className="text-xs text-gray-500 mt-0.5">তহবিলের সঞ্চয় ও খরচের বিস্তারিত হিসাব</p>
          </div>
          {isAdmin && (
            <button onClick={openAdd}
              className="flex items-center gap-2 bg-brand-navy text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-brand-navyLight transition shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              নতুন খরচ যোগ করুন
            </button>
          )}
        </div>

        {/* ── 3 Metric Cards ──────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="মোট সঞ্চয়"
            value={savings}
            color="green"
            sub="ড্যাশবোর্ড থেকে সংযুক্ত"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            }
          />
          <MetricCard
            label="মোট খরচ"
            value={totalExpense}
            color="red"
            sub={`${records.length} টি রেকর্ড`}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            }
          />
          <MetricCard
            label="নেট ব্যালেন্স"
            value={netBalance}
            color="blue"
            sub={netBalance >= 0 ? "✓ উদ্বৃত্ত (Surplus)" : "✗ ঘাটতি (Deficit)"}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            }
          />
        </div>

        {/* ── Search Bar ──────────────────────────────────── */}
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" placeholder="খাত বা মন্তব্য দিয়ে খুঁজুন..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy shadow-sm"
          />
        </div>

        {/* ── Expense Table ────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">
              খরচের রেকর্ড
              <span className="ml-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{filtered.length} টি</span>
            </h3>
            <span className="text-xs text-gray-400">মোট: ৳ {fmt(filtered.reduce((s,r)=>s+r.amount,0))}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-50 bg-gray-50/30">
                  <th className="px-5 py-3 text-left w-8">#</th>
                  <th className="px-5 py-3 text-left">তারিখ</th>
                  <th className="px-5 py-3 text-left">খাত / বিবরণ</th>
                  <th className="px-5 py-3 text-right">পরিমাণ (৳)</th>
                  <th className="px-5 py-3 text-left">মন্তব্য</th>
                  {isAdmin && <th className="px-5 py-3 text-center">অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-14 text-center">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <p className="text-gray-400 text-sm">কোনো রেকর্ড পাওয়া যায়নি</p>
                    </td>
                  </tr>
                ) : filtered.map((rec, i) => (
                  <tr key={rec.id} className="hover:bg-red-50/30 transition-colors group">
                    <td className="px-5 py-3.5 text-gray-300 font-medium text-xs">{i + 1}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">{fmtDate(rec.date)}</td>
                    <td className="px-5 py-3.5 text-gray-800 font-semibold">{rec.title}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-red-600 tabular-nums">{fmt(rec.amount)}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">{rec.remarks || "—"}</td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(rec)} title="সম্পাদনা"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          <button onClick={() => handleDel(rec.id)} title="মুছুন"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>

              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-100 bg-red-50/40 font-bold">
                    <td colSpan={3} className="px-5 py-3 text-right text-xs text-gray-500">মোট খরচ:</td>
                    <td className="px-5 py-3 text-right text-sm text-red-600 tabular-nums">
                      ৳ {fmt(filtered.reduce((s, r) => s + r.amount, 0))}
                    </td>
                    <td colSpan={isAdmin ? 2 : 1}/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </main>

      {modal && (
        <Modal
          record={editing}
          onClose={() => { setModal(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
