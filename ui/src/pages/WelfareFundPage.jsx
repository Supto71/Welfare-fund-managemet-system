import { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import WelfareFundBox from '../components/WelfareFundBox'
import CurrencySymbol from '../components/CurrencySymbol'
import SearchHistoryInput from '../components/SearchHistoryInput'

const fmt = (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatMonthName = (monthStr) => {
  if (!monthStr || monthStr === 'all') return 'সব সময় (All Time)'
  const [year, month] = monthStr.split('-')
  const date = new Date(year, parseInt(month) - 1, 1)
  const bn = date.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' })
  const en = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  return `${bn} (${en})`
}

export default function WelfareFundPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({ totalDonation: 0, totalExpense: 0, welfareBalance: 0 })
  const [memberNames, setMemberNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [filterType, setFilterType] = useState('all') // 'all', 'donation', 'expense'
  const [txType, setTxType] = useState('donation') // 'donation' or 'expense'
  const [notes, setNotes] = useState('')
  
  // Interactive Edit State (as requested)
  const [editingRecord, setEditingRecord] = useState(null)
  
  // Form State for Add Record
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [donorName, setDonorName] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const res = await api.getWelfareTransactions()
      setTransactions(res.data.transactions || [])
      setSummary(res.data.summary || { totalDonation: 0, totalExpense: 0, welfareBalance: 0 })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchNames = async () => {
    try {
      const res = await api.getMemberNames()
      setMemberNames(res.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchTransactions()
    fetchNames()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!date || amount === '' || isNaN(amount) || Number(amount) < 0) {
      setMsg('সব তথ্য সঠিকভাবে পূরণ করুন।')
      return
    }
      if (txType === 'donation' && !donorName.trim()) {
        setMsg('দাতার নাম লিখুন।')
        return
      }
      if (txType === 'expense' && !notes.trim()) {
        setMsg('খরচের খাত/বিবরণ লিখুন।')
        return
      }
      setSaving(true)
      setMsg('')
      try {
        const payload = {
          date,
          donor_name: txType === 'donation' ? donorName.trim() : '',
          amount: Number(amount),
          type: txType,
          notes: notes.trim()
        }

        await api.addWelfareTransaction(payload)

        setShowModal(false)
        setDonorName('')
        setNotes('')
        setAmount('')
        fetchTransactions()
      } catch (err) {
        setMsg(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে।')
      } finally {
        setSaving(false)
      }
  }

  const handleUpdateRecord = async (e) => {
    e.preventDefault()
    if (!editingRecord.date || editingRecord.amount === '' || isNaN(editingRecord.amount) || Number(editingRecord.amount) < 0) {
      setMsg('সব তথ্য সঠিকভাবে পূরণ করুন।')
      return
    }
    if (editingRecord.type === 'donation' && !(editingRecord.donor_name || '').trim()) {
      setMsg('দাতার নাম লিখুন।')
      return
    }
    if (editingRecord.type === 'expense' && !(editingRecord.notes || '').trim()) {
      setMsg('খরচের খাত/বিবরণ লিখুন।')
      return
    }

    setSaving(true)
    setMsg('')
    try {
      const payload = {
        date: editingRecord.date,
        donor_name: editingRecord.type === 'donation' ? (editingRecord.donor_name || '').trim() : '',
        amount: Number(editingRecord.amount),
        type: editingRecord.type,
        notes: (editingRecord.notes || '').trim()
      }

      await api.editWelfareTransaction(editingRecord.id, payload)

      // Update local state instantly without fetching
      setTransactions(prev => prev.map(tx => tx.id === editingRecord.id ? { ...tx, ...payload } : tx))
      
      // Update summary locally based on diff
      setSummary(prev => {
        const isDonation = editingRecord.type === 'donation'
        const oldAmount = transactions.find(t => t.id === editingRecord.id)?.amount || 0
        const diff = payload.amount - oldAmount
        return {
          ...prev,
          totalDonation: prev.totalDonation + (isDonation ? diff : 0),
          totalExpense: prev.totalExpense + (!isDonation ? diff : 0),
          welfareBalance: prev.welfareBalance + (isDonation ? diff : -diff)
        }
      })

      setEditingRecord(null)
    } catch (err) {
      setMsg(err.message || 'আপডেট ব্যর্থ হয়েছে।')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই রেকর্ডটি ডিলিট করতে চান? (Are you sure you want to delete this record?)')) return;
    setLoading(true)
    try {
      await api.deleteWelfareTransaction(id)
      fetchTransactions() // Refresh after delete
    } catch (err) {
      console.error(err)
      alert(err.message || 'ডিলিট করতে ব্যর্থ হয়েছে।')
      setLoading(false)
    }
  }

  // Combine member names and past donor names for suggestions
  const suggestions = Array.from(new Set([
    ...memberNames,
    ...transactions.map(t => t.donor_name || '')
  ].filter(Boolean)))

  // Extract unique months (YYYY-MM format) from transactions
  const uniqueMonths = Array.from(new Set(
    transactions
      .map(t => t.date ? t.date.substring(0, 7) : '')
      .filter(Boolean)
  )).sort((a, b) => b.localeCompare(a))

  const filteredTransactions = transactions.filter(t => {
    // 1. Month filter
    if (selectedMonth !== 'all' && (!t.date || !t.date.startsWith(selectedMonth))) {
      return false
    }
    // 2. Type filter
    if (filterType !== 'all' && t.type !== filterType) {
      return false
    }
    // 3. Search filter
    const term = search.toLowerCase()
    return (
      (t.donor_name || '').toLowerCase().includes(term) ||
      (t.notes || '').toLowerCase().includes(term)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onRefresh={fetchTransactions} />

      <main id="printable-full-report" className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in space-y-6">
        
        {/* Welfare Summary Box at the top */}
        <section className="mb-4">
          <WelfareFundBox
            totalDonation={summary.totalDonation}
            totalExpense={summary.totalExpense}
            welfareBalance={summary.welfareBalance}
            isAdmin={isAdmin}
            onUpdate={fetchTransactions}
          />
        </section>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 mt-4">
          <div>
            <h2 className="text-xl font-bold text-brand-navy flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>
              তহবিলের রেকর্ডসমূহ (Welfare Fund Records)
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              তারিখ অনুযায়ী সকল লেনদেনের বিবরণ (Welfare transactions listed by date)
              {selectedMonth !== 'all' && ` · মাস: ${formatMonthName(selectedMonth)}`}
              {filterType !== 'all' && ` · ধরণ: ${filterType === 'donation' ? 'চাঁদা' : 'খরচ'}`}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 no-print w-full sm:w-auto">
            {/* Month Filter Dropdown */}
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy bg-white font-semibold text-gray-700 w-full sm:w-44 cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.25rem 1.25rem',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <option value="all">সব সময় (All Time)</option>
                {uniqueMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthName(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter Dropdown */}
            <div className="relative w-full sm:w-auto">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy bg-white font-semibold text-gray-700 w-full sm:w-44 cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.25rem 1.25rem',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <option value="all">সকল রেকর্ড (All Types)</option>
                <option value="donation">শুধুমাত্র চাঁদা (Donations)</option>
                <option value="expense">শুধুমাত্র খরচ (Expenses)</option>
              </select>
            </div>

            {/* Donor/Purpose Search Box */}
            <div className="relative w-full sm:w-auto z-40">
              <SearchHistoryInput
                value={search}
                onChange={setSearch}
                placeholder="খুঁজুন (Search name, purpose or note)..."
                storageKey="welfare_search_history"
                className="sm:w-56"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => window.print()} 
                className="flex-1 sm:flex-none bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 hover:text-brand-navy transition shadow-sm flex items-center justify-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                <div className="text-left">
                  <div className="leading-tight">PDF ডাউনলোড / প্রিন্ট</div>
                  <div className="text-[10px] text-gray-400 font-normal leading-tight">PDF Download / Print</div>
                </div>
              </button>
              {isAdmin && (
                <>
                  <button onClick={() => openNewModal('donation')} 
                    className="flex-1 sm:flex-none bg-brand-navy hover:bg-brand-navyLight text-white px-4 py-2 rounded-lg font-bold transition shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                    <div className="text-left">
                      <div className="leading-tight">নতুন চাঁদা</div>
                      <div className="text-[10px] text-gray-300 font-normal leading-tight">New Donation</div>
                    </div>
                  </button>
                  <button onClick={() => openNewModal('expense')} 
                    className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6"/></svg>
                    <div className="text-left">
                      <div className="leading-tight">নতুন খরচ</div>
                      <div className="text-[10px] text-red-200 font-normal leading-tight">New Expense</div>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Monthly History Pills (Tabs) */}
        {uniqueMonths && uniqueMonths.length > 0 && (
          <div className="px-5 py-2.5 bg-white rounded-xl border border-gray-100 flex flex-wrap gap-1.5 items-center no-print shadow-sm">
            <span className="text-xs font-bold text-gray-400 mr-1.5">মাস ফিল্টার (Month Filter):</span>
            <button
              onClick={() => setSelectedMonth('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${selectedMonth === 'all' ? 'bg-brand-navy text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              সব সময় (All Time)
            </button>
            {uniqueMonths.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${selectedMonth === m ? 'bg-brand-navy text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {formatMonthName(m)}
              </button>
            ))}
          </div>
        )}

        {/* Cash Book Ledger style Table */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-450 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4 font-bold w-32">তারিখ (Date)</th>
                  <th className="px-6 py-4 font-bold">বিবরণ / খাত (Description / Purpose)</th>
                  <th className="px-6 py-4 font-bold">মন্তব্য / নোট (Remarks / Notes)</th>
                  <th className="px-6 py-4 font-bold text-right text-green-700">জমা / চাঁদা (Donation)</th>
                  <th className="px-6 py-4 font-bold text-right text-red-600">খরচ (Expense)</th>
                  {isAdmin && <th className="no-print px-6 py-4 font-bold text-center w-24">অ্যাকশন (Action)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center">
                      <div className="w-8 h-8 border-4 border-brand-navy/20 border-t-brand-navy rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-gray-400 font-medium text-sm">লোড হচ্ছে (Loading)...</p>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-gray-400">
                      কোনো লেনদেন রেকর্ড পাওয়া যায়নি (No transactions found)。
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(tx => {
                    const isExpense = tx.type === 'expense'
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-600 whitespace-nowrap">{tx.date}</td>
                        <td className="px-6 py-4 font-semibold text-gray-800 break-words max-w-[200px]">
                          {isExpense ? tx.notes : tx.donor_name}
                        </td>
                        <td className="px-6 py-4 text-gray-500 break-words max-w-[200px]" title={tx.notes}>
                          {isExpense ? <span className="text-gray-300">—</span> : (tx.notes || <span className="text-gray-300">—</span>)}
                        </td>
                        <td className="px-6 py-4 font-bold text-right text-green-700 whitespace-nowrap">
                          {!isExpense ? (
                            <div className="inline-flex items-center gap-1 justify-end w-full">
                              <span>+</span>
                              <CurrencySymbol className="w-3.5 h-3.5 text-green-700" />
                              <span>{fmt(tx.amount)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold text-right text-red-600 whitespace-nowrap">
                          {isExpense ? (
                            <div className="inline-flex items-center gap-1 justify-end w-full">
                              <span>−</span>
                              <CurrencySymbol className="w-3.5 h-3.5 text-red-600" />
                              <span>{fmt(tx.amount)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setEditingRecord(tx)}
                                className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1.5 rounded transition" title="এডিট (Edit)">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button onClick={() => handleDelete(tx.id)}
                                className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition" title="ডিলিট (Delete)">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Record Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">
                    {txType === 'donation' ? 'নতুন অনুদান যোগ করুন' : 'নতুন খরচ যোগ করুন'}
                  </h3>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">তারিখ (Date)</label>
                  <input
                    type="date" required
                    value={date} onChange={e => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium"
                  />
                </div>
                {txType === 'donation' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">দাতার নাম (Donor Name)</label>
                      <input
                        type="text" required autoFocus placeholder="দাতার নাম লিখুন"
                        list="donor-suggestions"
                        value={donorName} onChange={e => setDonorName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">নোট / মন্তব্য (Remarks - Optional)</label>
                      <input
                        type="text" placeholder="অনুদানের মন্তব্য/নোট (ঐচ্ছিক)"
                        value={notes} onChange={e => setNotes(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">খরচের বিবরণ / খাত (Purpose / Note)</label>
                    <input
                      type="text" required autoFocus placeholder="উদা: চা-নাস্তা, যাতায়াত খরচ"
                      value={notes} onChange={e => setNotes(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">পরিমাণ (Amount)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <CurrencySymbol className="w-4 h-4 text-gray-400" />
                    </span>
                    <input
                      type="number" required min="0" step="0.01" placeholder="উদা: 1000"
                      value={amount} onChange={e => setAmount(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium placeholder-gray-400 ${txType === 'donation' ? 'text-green-700' : 'text-red-600'}`}
                    />
                  </div>
                </div>

                {msg && <p className="text-red-600 text-xs font-medium bg-red-50 p-2 rounded-md">{msg}</p>}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
                    বাতিল (Cancel)
                  </button>
                  <button type="submit" disabled={saving}
                    className={`flex-[2] text-white py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:shadow-none ${txType === 'donation' ? 'bg-brand-navy hover:bg-brand-navyLight' : 'bg-red-600 hover:bg-red-700'}`}>
                    {saving ? 'সংরক্ষণ...' : 'সংরক্ষণ করুন (Save)'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingRecord(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">
                    {editingRecord.type === 'donation' ? 'অনুদান আপডেট করুন' : 'খরচ আপডেট করুন'}
                  </h3>
                </div>
                <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              <form onSubmit={handleUpdateRecord} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">তারিখ (Date)</label>
                  <input
                    type="date" required
                    value={editingRecord.date} onChange={e => setEditingRecord({ ...editingRecord, date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium"
                  />
                </div>
                {editingRecord.type === 'donation' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">বিবরণ / খাত (Description / Purpose)</label>
                      <input
                        type="text" required autoFocus placeholder="দাতার নাম লিখুন"
                        list="donor-suggestions"
                        value={editingRecord.donor_name || ''} onChange={e => setEditingRecord({ ...editingRecord, donor_name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">মন্তব্য / নোট (Remarks / Notes)</label>
                      <input
                        type="text" placeholder="অনুদানের মন্তব্য/নোট (ঐচ্ছিক)"
                        value={editingRecord.notes || ''} onChange={e => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">বিবরণ / খাত (Description / Purpose)</label>
                    <input
                      type="text" required autoFocus placeholder="উদা: চা-নাস্তা, যাতায়াত খরচ"
                      value={editingRecord.notes || ''} onChange={e => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">টাকার পরিমাণ (Amount)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <CurrencySymbol className="w-4 h-4 text-gray-400" />
                    </span>
                    <input
                      type="number" required min="0" step="0.01" placeholder="উদা: 1000"
                      value={editingRecord.amount} onChange={e => setEditingRecord({ ...editingRecord, amount: e.target.value })}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium placeholder-gray-400 ${editingRecord.type === 'donation' ? 'text-green-700' : 'text-red-600'}`}
                    />
                  </div>
                </div>

                {msg && <p className="text-red-600 text-xs font-medium bg-red-50 p-2 rounded-md">{msg}</p>}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditingRecord(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
                    বাতিল (Cancel)
                  </button>
                  <button type="submit" disabled={saving}
                    className={`flex-[2] text-white py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:shadow-none ${editingRecord.type === 'donation' ? 'bg-brand-navy hover:bg-brand-navyLight' : 'bg-red-600 hover:bg-red-700'}`}>
                    {saving ? 'আপডেট হচ্ছে...' : 'আপডেট করুন (Update)'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Datalist for donor suggestions */}
      <datalist id="donor-suggestions">
        {suggestions.map((name, index) => (
          <option key={index} value={name} />
        ))}
      </datalist>

    </div>
  )
}
