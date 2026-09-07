import { useState, useEffect, useMemo } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../api"
import Header from "../components/Header"
import StatCard from "../components/StatCard"
import CurrencySymbol from "../components/CurrencySymbol"
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

// ─── dummy expense records ──────────────────────────────────────────────────────
const BLANK = { date: "", title: "", amount: "", remarks: "" }


// ─── Add / Edit modal ──────────────────────────────────────────────────────────
function Modal({ record, onClose, onSave }) {
  const [form, setForm] = useState(
    record ? { ...record, amount: String(record.amount) } : { ...BLANK }
  )
  const [err, setErr] = useState("")
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.date)         return setErr("তারিখ দিন।")
    if (!form.title.trim()) return setErr("বিবরণ দিন।")
    if (!form.amount || isNaN(+form.amount) || +form.amount <= 0)
                            return setErr("সঠিক পরিমাণ দিন।")
    onSave({ ...form, amount: +form.amount })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-lg">
              {record ? "খরচ সম্পাদনা করুন" : "+ নতুন খরচ যোগ করুন"}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">তারিখ *</label>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">খাত / বিবরণ *</label>
              <input type="text" placeholder="যেমন: অফিস ভাড়া, বিদ্যুৎ বিল..." value={form.title}
                onChange={e => set("title", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">পরিমাণ (৳) *</label>
              <input type="number" min="0" placeholder="0.00" value={form.amount}
                onChange={e => set("amount", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">মন্তব্য</label>
              <input type="text" placeholder="অতিরিক্ত তথ্য (ঐচ্ছিক)" value={form.remarks}
                onChange={e => set("remarks", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm" />
            </div>
          </div>
          {err && <p className="text-red-600 text-xs font-medium">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              বাতিল
            </button>
            <button onClick={submit}
              className="flex-1 bg-brand-navy text-white py-2.5 rounded-lg text-sm font-bold hover:bg-brand-navyLight transition">
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

  const [savings,  setSavings]  = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [records,  setRecords]  = useState([])
  const [search,   setSearch]   = useState("")
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState(null)

  const fetchData = async () => {
    try {
      const [sumRes, txRes] = await Promise.all([
        api.getSummary("all"),
        api.getWelfareTransactions()
      ])
      setSavings(sumRes.data?.totalSavings || 0)
      const exps = txRes.data?.transactions?.filter(t => t.type === 'expense').map(t => ({
        id: t.id,
        date: t.date,
        title: t.notes,
        amount: parseFloat(t.amount),
        remarks: t.donor_name || ""
      })) || []
      setRecords(exps)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const totalExpense = records.reduce((s, r) => s + r.amount, 0)
  const netBalance   = savings - totalExpense

  const filtered = useMemo(() =>
    records
      .filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.remarks.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [records, search]
  )

  const handleSave = async (data) => {
    try {
      const payload = {
        date: data.date,
        amount: Number(data.amount),
        type: 'expense',
        notes: data.title,
        donor_name: data.remarks || ""
      }
      if (editing) {
        await api.editWelfareTransaction(editing.id, payload)
      } else {
        await api.addWelfareTransaction(payload)
      }
      setModal(false)
      setEditing(null)
      fetchData()
    } catch (err) {
      alert(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে।')
    }
  }

  const openEdit  = (r) => { setEditing(r); setModal(true) }
  const openAdd   = ()  => { setEditing(null); setModal(true) }
  const handleDel = async (id) => {
    if (!window.confirm("এই রেকর্ডটি মুছতে চান?")) return
    try {
      await api.deleteWelfareTransaction(id)
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      alert(err.message || 'মুছতে ব্যর্থ হয়েছে।')
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onRefresh={() => {}} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-4 pb-10 space-y-3 animate-fade-in">

        {/* ── Sticky top panel (same style as DashboardPage) ── */}
        <div className="sticky top-[72px] z-40 bg-[#f8f9fa] shadow-sm pb-2 pt-2 px-4 sm:px-6 -mx-4 sm:mx-0 sm:rounded-b-xl border-b border-gray-200 space-y-2">

          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1">
            <h2 className="text-base font-medium text-gray-800 leading-none">ব্যয় ব্যবস্থাপনা (Expense Management)</h2>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button onClick={openAdd}
                  className="bg-white border border-blue-200 text-blue-700 px-3.5 py-1.5 rounded font-bold hover:bg-blue-50 transition shadow-sm flex items-center gap-1.5 text-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                  </svg>
                  নতুন খরচ যোগ করুন
                </button>
              )}
            </div>
          </div>

          {/* 3 Stat Cards */}
          <div className="grid grid-cols-3 gap-1.5">
            <StatCard
              label="মোট সঞ্চয়"
              value={savings}
              color="green"
              prefix={<CurrencySymbol className="w-3.5 h-3.5 text-green-700" />}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M6 4h5a8 8 0 0 1 0 16H6V4z"/>
                  <line x1="3" y1="9" x2="18" y2="9"/>
                  <line x1="3" y1="14" x2="18" y2="14"/>
                </svg>
              }
            />
            <StatCard
              label="মোট খরচ"
              value={totalExpense}
              color="red"
              prefix={<CurrencySymbol className="w-3.5 h-3.5 text-red-700" />}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              }
            />
            <StatCard
              label={netBalance >= 0 ? "নেট ব্যালেন্স (উদ্বৃত্ত)" : "নেট ব্যালেন্স (ঘাটতি)"}
              value={netBalance}
              color={netBalance >= 0 ? "blue" : "gold"}
              prefix={<CurrencySymbol className={`w-3.5 h-3.5 ${netBalance >= 0 ? "text-blue-700" : "text-amber-700"}`} />}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              }
            />
          </div>
        </div>

        {/* ── Search + Table ────────────────────────────────── */}
        <section className="pb-8">

          {/* Search */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-4 py-3 mb-3 flex items-center gap-3">
            <div className="relative flex-1">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text" placeholder="খাত বা মন্তব্য দিয়ে খুঁজুন..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>
            <div className="text-xs text-gray-400 shrink-0">
              মোট: <span className="font-semibold text-red-600">৳ {fmt(filtered.reduce((s,r)=>s+r.amount,0))}</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-800">
                খরচের রেকর্ড
                <span className="ml-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{filtered.length} টি</span>
              </h3>
              <span className="text-[10px] text-gray-400">সর্বশেষ তারিখ অনুযায়ী সাজানো</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 font-semibold uppercase tracking-wide border-b border-gray-100 bg-gray-50/40">
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left">তারিখ</th>
                    <th className="px-4 py-3 text-left">খাত / বিবরণ</th>
                    <th className="px-4 py-3 text-right">পরিমাণ (৳)</th>
                    <th className="px-4 py-3 text-left">মন্তব্য</th>
                    {isAdmin && <th className="px-4 py-3 text-center">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-gray-400 text-sm">
                        <svg className="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        কোনো রেকর্ড পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : filtered.map((rec, i) => (
                    <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-4 py-3 text-gray-400 font-medium text-xs">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(rec.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></div>
                          <span className="text-gray-800 font-semibold">{rec.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600 tabular-nums">{fmt(rec.amount)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{rec.remarks || "—"}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
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
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                      <td colSpan={3} className="px-4 py-3 text-right text-xs text-gray-600">মোট খরচের পরিমাণ:</td>
                      <td className="px-4 py-3 text-right text-sm text-red-600 tabular-nums">
                        ৳ {fmt(filtered.reduce((s, r) => s + r.amount, 0))}
                      </td>
                      <td colSpan={isAdmin ? 2 : 1}/>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </section>

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
