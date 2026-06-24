import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import CurrencySymbol from './CurrencySymbol'
import SearchHistoryInput from './SearchHistoryInput'

const fmt = (v) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatMonthName = (monthStr) => {
  if (!monthStr || monthStr === 'all') return 'সব সময় (All Time)'
  const [year, month] = monthStr.split('-')
  const date = new Date(year, parseInt(month) - 1, 1)
  const bn = date.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' })
  const en = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  return `${bn} (${en})`
}

export const formatMonthHeader = (monthStr, lang) => {
  let date
  if (!monthStr || monthStr === 'all') {
    date = new Date()
  } else {
    const [year, month] = monthStr.split('-')
    date = new Date(year, parseInt(month) - 1, 1)
  }
  return date.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'long' })
}

function DiffBadge({ planned, actual }) {
  const diff = actual - planned
  const isPos = diff >= 0
  return (
    <span className={`font-semibold tabular-nums inline-flex items-center gap-0.5 ${isPos ? 'text-green-600' : 'text-red-600'}`}>
      <span>{isPos ? '+' : '−'}</span>
      <CurrencySymbol className={`w-3.5 h-3.5 ${isPos ? 'text-green-600' : 'text-red-600'}`} />
      <span>{fmt(Math.abs(diff))}</span>
    </span>
  )
}

function ProgressMini({ planned, actual }) {
  const pct = Math.min(100, (actual / planned) * 100)
  return (
    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function MemberTable({ 
  members, 
  isAdmin, 
  onUpdate, 
  months = [], 
  selectedMonth = 'all', 
  onMonthChange 
}) {
  const { user } = useAuth()
  const [editMember, setEditMember] = useState(null)
  
  // Transaction Modal State
  const [txAmount,  setTxAmount]  = useState('')
  const [txShares, setTxShares]     = useState('')
  const [txDate, setTxDate]         = useState('')
  const [txNote, setTxNote]         = useState('')
  const [txMode, setTxMode]         = useState('add')
  
  // Edit Profile Mode State
  const [editName,    setEditName]    = useState('')
  const [editPlanned, setEditPlanned] = useState('')
  
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const [search,   setSearch]   = useState('')

  // History Modal State
  const [historyMember, setHistoryMember] = useState(null)
  const [historyData, setHistoryData] = useState({ transactions: [], monthlySummary: [] })
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState('all')

  const filtered = members.filter(m => {
    if (m.role !== 'member' && m.role !== 'admin') {
      return false
    }
    if (selectedMonth && selectedMonth !== 'all' && (m.individual_monthly_deposit || 0) <= 0) {
      return false
    }
    return m.name.toLowerCase().includes(search.toLowerCase())
  })

  const openHistory = async (m) => {
    setHistoryMember(m)
    setLoadingHistory(true)
    setHistoryData({ transactions: [], monthlySummary: [] })
    setSelectedHistoryMonth('all')
    try {
      const res = await api.getMemberHistory(m.id)
      setHistoryData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const closeHistory = () => {
    setHistoryMember(null)
    setHistoryData({ transactions: [], monthlySummary: [] })
    setSelectedHistoryMonth('all')
  }

  const openEdit = (m, mode = 'add') => {
    setEditMember(m)
    setTxAmount('')
    setTxShares('')
    setTxNote('')
    setTxDate(new Date().toISOString().split('T')[0])
    setTxMode(mode)
    setEditName(m.name);
    setEditPlanned(m.planned_amount || 5850);
    setMsg('');
  }
  
  const closeEdit = () => { 
    setEditMember(null); 
    setMsg('');
  }

  const handleSave = async () => {
    if (txMode === 'settings') {
      if (!editName.trim()) {
        setMsg('সদস্যের নাম খালি রাখা যাবে না (Member Name cannot be empty)।'); return
      }
      if (editPlanned === '' || isNaN(editPlanned) || Number(editPlanned) < 0) {
        setMsg('সঠিক লক্ষ্য পরিমাণ লিখুন (Enter valid target amount)।'); return
      }
      
      setLoading(true); setMsg('')
      try {
        await api.updateMemberSettings({
          userId: editMember.id,
          name: editName.trim(),
          planned_amount: Number(editPlanned)
        })
        onUpdate()
        closeEdit()
      } catch (err) {
        setMsg(err.message || 'আপডেট ব্যর্থ হয়েছে।')
      } finally { setLoading(false) }
      return
    }

    if (txMode === 'add' && !txDate) {
      setMsg('তারিখ দিন।'); return
    }
    if (txAmount === '' || isNaN(txAmount) || Number(txAmount) < 0) {
      setMsg('সঠিক পরিমাণ লিখুন।'); return
    }
    if (txShares === '' || isNaN(txShares) || Number(txShares) < 0) {
      setMsg('সঠিক শেয়ার সংখ্যা লিখুন।'); return
    }
    
    setLoading(true); setMsg('')
    try {
      if (txMode === 'add') {
        await api.addTransaction({
          userId: editMember.id,
          date: txDate,
          amount_paid: Number(txAmount),
          shares_bought: Number(txShares) || 0,
          note: txNote
        })
      } else {
        await api.resetTransaction({
          userId: editMember.id,
          amount_paid: Number(txAmount),
          shares_bought: Number(txShares)
        })
      }
      onUpdate()
      closeEdit()
    } catch (err) {
      setMsg(err.message || 'আপডেট ব্যর্থ হয়েছে।')
    } finally { setLoading(false) }
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden notranslate" translate="no">
        {/* Table header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800 text-base">সদস্য তালিকা (Member List)</h3>
            <p className="text-gray-400 text-xs mt-0.5">
              {filtered.length} জন সদস্য (Members)
              {selectedMonth !== 'all' && ` · ফিল্টার: ${formatMonthName(selectedMonth)}`}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Month Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy bg-white font-semibold text-gray-700 w-full sm:w-56 cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.25rem 1.25rem',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <option value="all">সব সময় (All Time)</option>
                {months && months.map((m) => (
                  <option key={m.month} value={m.month}>
                    {formatMonthName(m.month)}
                  </option>
                ))}
              </select>
            </div>

            {/* Name Search Box */}
            <div className="relative w-full sm:w-48 z-40">
              <SearchHistoryInput
                value={search}
                onChange={setSearch}
                placeholder="নাম খুঁজুন (Search name)..."
                storageKey="member_search_history"
              />
            </div>
          </div>
        </div>

        {/* Monthly History Pills (Tabs) */}
        {months && months.length > 0 && (
          <div className="px-5 py-2.5 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-1.5 items-center no-print">
            <span className="text-xs font-bold text-gray-400 mr-1.5">মাস ফিল্টার (Month Filter):</span>
            <button
              onClick={() => onMonthChange('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${selectedMonth === 'all' ? 'bg-brand-navy text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              সব সময় (All Time)
            </button>
            {months.map((m) => (
              <button
                key={m.month}
                onClick={() => onMonthChange(m.month)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${selectedMonth === m.month ? 'bg-brand-navy text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {formatMonthName(m.month)}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] scrollbar-thin">
          <table className="w-full text-sm whitespace-nowrap relative">
            <thead className="sticky top-0 z-30 bg-gray-50 shadow-sm shadow-gray-200/50 outline outline-1 outline-gray-200">
              <tr className="text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-bold w-8">#</th>
                <th className="px-5 py-3 text-left font-bold">
                  <div>সদস্যের নাম</div>
                  <div className="text-[10px] text-gray-400 font-normal lowercase mt-0.5">Member Name</div>
                </th>
                <th className="px-5 py-3 text-right font-bold">
                  <div>পরিকল্পিত</div>
                  <div className="text-[10px] text-gray-400 font-normal lowercase mt-0.5">Planned Target</div>
                </th>
                <th className="px-5 py-3 text-right font-bold text-amber-600">
                  <div>
                    {selectedMonth === 'all'
                      ? `চলতি মাসের জমা (${formatMonthHeader('all', 'bn')})`
                      : `${formatMonthHeader(selectedMonth, 'bn')} এর জমা`
                    }
                  </div>
                  <div className="text-[10px] text-gray-400/80 font-normal lowercase mt-0.5">
                    {selectedMonth === 'all'
                      ? `Monthly Deposit (${formatMonthHeader('all', 'en')})`
                      : `Deposit - ${formatMonthHeader(selectedMonth, 'en')}`
                    }
                  </div>
                </th>
                <th className="px-5 py-3 text-right font-bold text-blue-600">
                  <div>মোট শেয়ার</div>
                  <div className="text-[10px] text-gray-400/80 font-normal lowercase mt-0.5">Total Shares</div>
                </th>
                <th className="px-5 py-3 text-right font-bold text-green-600">
                  <div>বাস্তব</div>
                  <div className="text-[10px] text-gray-400/80 font-normal lowercase mt-0.5">Total Deposit</div>
                </th>
                <th className="px-5 py-3 text-right font-bold">
                  <div>পার্থক্য</div>
                  <div className="text-[10px] text-gray-400 font-normal lowercase mt-0.5">Difference</div>
                </th>
                <th className="px-5 py-3 text-center font-bold">
                  <div>অগ্রগতি</div>
                  <div className="text-[10px] text-gray-400 font-normal lowercase mt-0.5">Progress</div>
                </th>
                <th className="px-5 py-3 text-center font-bold no-print">
                  <div>অ্যাকশন</div>
                  <div className="text-[10px] text-gray-400 font-normal lowercase mt-0.5">Action</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((m, i) => {
                const planned = m.planned_amount || 5850
                const actual  = m.individual_total_deposit || 0
                const diff    = actual - planned
                const pct     = Math.min(100, (actual / planned) * 100)
                const isDone  = pct >= 100

                return (
                  <tr key={m.id} className="hover:bg-gray-50/80 transition-colors group">
                    {/* # */}
                    <td className="px-5 py-3.5 text-gray-400 text-xs font-medium">{i + 1}</td>

                    {/* Name */}
                    <td className="px-5 py-3.5 notranslate" translate="no">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-xs font-bold shrink-0">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 leading-none notranslate" translate="no">{m.name}</p>
                          <p className="text-gray-400 text-[11px] mt-0.5 capitalize">{m.role}</p>
                        </div>
                      </div>
                    </td>

                    {/* Planned */}
                    <td className="px-5 py-3.5 text-right font-medium text-gray-500 tabular-nums">
                      <div className="inline-flex items-center gap-1">
                        <CurrencySymbol className="w-3.5 h-3.5 text-gray-500" />
                        <span>{fmt(planned)}</span>
                      </div>
                    </td>

                    {/* Monthly Deposit */}
                    <td className="px-5 py-3.5 text-right font-semibold text-amber-600 tabular-nums">
                      <div className="inline-flex items-center gap-1">
                        <CurrencySymbol className="w-3.5 h-3.5 text-amber-600" />
                        <span>{fmt(m.individual_monthly_deposit || 0)}</span>
                      </div>
                    </td>

                    {/* Total Shares */}
                    <td className="px-5 py-3.5 text-right font-bold text-blue-600 tabular-nums">
                      {m.individual_total_shares || 0} (Shares)
                    </td>

                    {/* Actual (Total) */}
                    <td className="px-5 py-3.5 text-right font-bold text-green-700 tabular-nums">
                      <div className="inline-flex items-center gap-1">
                        <CurrencySymbol className="w-3.5 h-3.5 text-green-700" />
                        <span>{fmt(actual)}</span>
                      </div>
                    </td>

                    {/* Diff */}
                    <td className="px-5 py-3.5 text-right">
                      <DiffBadge planned={planned} actual={actual} />
                    </td>

                    {/* Progress */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col items-center gap-1">
                        <ProgressMini planned={planned} actual={actual} />
                        <span className={`text-[10px] font-bold ${isDone ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* Admin/User action */}
                    <td className="px-5 py-3.5 text-center no-print">
                      <div className="inline-flex items-center gap-2">
                        {(isAdmin || user?.id === m.id) && (
                          <button onClick={() => openHistory(m)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            হিস্ট্রি (History)
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => openEdit(m)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-navy hover:text-white bg-brand-navy/10 hover:bg-brand-navy px-3 py-1.5 rounded-lg transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path d="M12 5v14M5 12h14"/>
                            </svg>
                            এডিট (Edit)
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-gray-400">
                    <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    কোনো সদস্য পাওয়া যায়নি (No members found)
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer totals */}
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-brand-navy/5 border-t-2 border-brand-navy/10">
                  <td colSpan={2} className="px-5 py-3 font-bold text-gray-700 text-sm">মোট (Total - {filtered.length} members)</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-700 tabular-nums">
                    <div className="inline-flex items-center gap-1 justify-end w-full">
                      <CurrencySymbol className="w-3.5 h-3.5 text-gray-700" />
                      <span>{fmt(filtered.reduce((s, m) => s + (m.planned_amount || 5850), 0))}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-amber-600 tabular-nums">
                    <div className="inline-flex items-center gap-1 justify-end w-full">
                      <CurrencySymbol className="w-3.5 h-3.5 text-amber-600" />
                      <span>{fmt(filtered.reduce((s, m) => s + (m.individual_monthly_deposit || 0), 0))}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-blue-600 tabular-nums">
                    {filtered.reduce((s, m) => s + (m.individual_total_shares || 0), 0)} (Shares)
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-green-700 tabular-nums">
                    <div className="inline-flex items-center gap-1 justify-end w-full">
                      <CurrencySymbol className="w-3.5 h-3.5 text-green-700" />
                      <span>{fmt(filtered.reduce((s, m) => s + (m.individual_total_deposit || 0), 0))}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {(() => {
                      const totalDiff = filtered.reduce((s, m) => s + ((m.individual_total_deposit || 0) - (m.planned_amount || 5850)), 0)
                      return (
                        <span className={`font-bold tabular-nums inline-flex items-center justify-end w-full gap-0.5 ${totalDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <span>{totalDiff >= 0 ? '+' : '−'}</span>
                          <CurrencySymbol className={`w-3.5 h-3.5 ${totalDiff >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                          <span>{fmt(Math.abs(totalDiff))}</span>
                        </span>
                      )
                    })()}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Transaction History Modal ────────────────────────────────── */}
      {historyMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeHistory}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-slide-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">জমার হিস্ট্রি (Deposit History)</h3>
                <p className="text-brand-navy font-bold mt-0.5">{historyMember.name}</p>
              </div>
              <button onClick={closeHistory} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="p-6 overflow-y-auto scrollbar-thin">
              {loadingHistory ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 border-4 border-brand-navy/20 border-t-brand-navy rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Monthly Summary */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">মাসিক সামারি (Monthly Summary)</h4>
                    {historyData.monthlySummary.length === 0 ? (
                      <p className="text-sm text-gray-400">কোনো জমার রেকর্ড নেই (No deposit records found)。</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {historyData.monthlySummary.map((mStat, idx) => {
                          const isSelected = selectedHistoryMonth === mStat.month
                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedHistoryMonth(isSelected ? 'all' : mStat.month)}
                              className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 select-none ${
                                isSelected 
                                  ? 'bg-brand-navy border-brand-navy text-white shadow-md' 
                                  : 'bg-blue-50/50 hover:bg-blue-50 border-blue-100/50 hover:border-blue-200 text-gray-800'
                              }`}
                            >
                              <div className={`text-xs font-bold mb-1 ${isSelected ? 'text-blue-200' : 'text-blue-600/80'}`}>
                                {formatMonthName(mStat.month)}
                              </div>
                              <div className={`font-bold flex items-center gap-1 ${isSelected ? 'text-white' : 'text-brand-navy'}`}>
                                <CurrencySymbol className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-brand-navy'}`} />
                                <span>{fmt(mStat.total_paid)}</span>
                              </div>
                              <div className={`text-[10px] font-semibold ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                                {mStat.total_shares} (Shares)
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Raw Transactions */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span>সকল রেকর্ড (All Time History) {selectedHistoryMonth !== 'all' && ` - ${formatMonthName(selectedHistoryMonth)}`}</span>
                      {selectedHistoryMonth !== 'all' && (
                        <button onClick={() => setSelectedHistoryMonth('all')} className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold transition-colors">
                          ক্লিয়ার (Clear)
                        </button>
                      )}
                    </h4>
                    {(() => {
                      const filteredTxs = historyData.transactions.filter(tx => 
                        selectedHistoryMonth === 'all' || tx.date.startsWith(selectedHistoryMonth)
                      )
                      return filteredTxs.length === 0 ? (
                        <p className="text-sm text-gray-400">কোনো রেকর্ড নেই (No records found)。</p>
                      ) : (
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold text-xs">
                              <tr>
                                <th className="px-4 py-2.5">তারিখ (Date)</th>
                                <th className="px-4 py-2.5 text-right">পরিমাণ (Amount)</th>
                                <th className="px-4 py-2.5 text-right">শেয়ার (Shares)</th>
                                <th className="px-4 py-2.5 text-right">মন্তব্য (Note)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {filteredTxs.map((tx, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-2.5 font-medium text-gray-600">{tx.date}</td>
                                  <td className="px-4 py-2.5 text-right font-bold text-green-600">
                                    <div className="inline-flex items-center gap-1 justify-end w-full">
                                      <CurrencySymbol className="w-3.5 h-3.5 text-green-600" />
                                      <span>{fmt(tx.amount_paid)}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-semibold text-blue-600">{tx.shares_bought}</td>
                                  <td className="px-4 py-2.5 text-right text-gray-500 text-xs italic truncate max-w-[120px]" title={tx.note || '-'}>{tx.note || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Edit Modal (Add transaction, reset baseline, or edit user name / target) ── */}
      {editMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeEdit}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">সদস্যের তথ্য পরিবর্তন</h3>
                  <p className="text-gray-400 text-sm font-semibold mt-0.5">{editMember.name}</p>
                </div>
                <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              {txMode !== 'settings' && (
                <div className="bg-blue-50/50 rounded-xl p-3 flex justify-between items-center text-sm border border-blue-100">
                  <span className="text-gray-500 font-medium">বর্তমান মোট জমা (Total):</span>
                  <span className="font-bold text-brand-navy flex items-center gap-0.5">
                    <CurrencySymbol className="w-3.5 h-3.5 text-brand-navy" />
                    <span>{fmt(editMember.individual_total_deposit || 0)}</span>
                  </span>
                </div>
              )}

              {/* Mode Toggle */}
              <div className="grid grid-cols-3 gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100 text-[10px] font-bold">
                <button 
                  onClick={() => setTxMode('add')}
                  className={`py-1.5 rounded-md transition ${txMode === 'add' ? 'bg-white shadow-sm text-brand-navy' : 'text-gray-400 hover:text-gray-600'}`}>
                  নতুন জমা (Add)
                </button>
                <button 
                  onClick={() => setTxMode('reset')}
                  className={`py-1.5 rounded-md transition ${txMode === 'reset' ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' : 'text-gray-400 hover:text-gray-600'}`}>
                  রিসেট (Reset)
                </button>
                <button 
                  onClick={() => setTxMode('settings')}
                  className={`py-1.5 rounded-md transition ${txMode === 'settings' ? 'bg-white shadow-sm text-brand-navy' : 'text-gray-400 hover:text-gray-600'}`}>
                  সদস্য এডিট (Edit Info)
                </button>
              </div>

              <div className="space-y-3">
                {txMode === 'settings' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">সদস্যের নাম (Member Name)</label>
                      <input
                        type="text"
                        value={editName} onChange={e => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">পরিকল্পিত লক্ষ্য (Planned Target)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <CurrencySymbol className="w-4 h-4 text-gray-400" />
                        </span>
                        <input
                          type="number" min="0" step="0.01"
                          value={editPlanned} onChange={e => setEditPlanned(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium text-gray-700"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {txMode === 'add' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">তারিখ (Date)</label>
                        <input
                          type="date"
                          value={txDate} onChange={e => setTxDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium text-gray-700"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                        {txMode === 'add' ? 'জমার পরিমাণ (Amount)' : 'সর্বমোট নতুন পরিমাণ (New Total Amount)'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <CurrencySymbol className="w-4 h-4 text-gray-400" />
                        </span>
                        <input
                          type="number" min="0" step="0.01" autoFocus placeholder="উদা: 500"
                          value={txAmount} onChange={e => setTxAmount(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium text-gray-700"
                        />
                      </div>
                      {txMode === 'reset' && <p className="text-[10px] text-red-500 mt-1 font-semibold">⚠️ এটি পুরো জমার হিস্ট্রি মুছে দিয়ে শুধু এই নতুন পরিমাণ সেট করবে।</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                        {txMode === 'add' ? 'শেয়ার সংখ্যা (Shares)' : 'সর্বমোট নতুন শেয়ার (New Total Shares)'}
                      </label>
                      <input
                        type="number" min="0" step="1" placeholder="উদা: 1"
                        value={txShares} onChange={e => setTxShares(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium text-gray-700"
                      />
                    </div>
                    {txMode === 'add' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">মন্তব্য (Note) - ঐচ্ছিক</label>
                        <textarea
                          placeholder="উদা: মে মাসের চাঁদা"
                          value={txNote} onChange={e => setTxNote(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium text-gray-700 resize-none"
                        ></textarea>
                      </div>
                    )}
                  </>
                )}
              </div>

              {msg && <p className="text-red-600 text-xs font-medium bg-red-50 p-2 rounded-md">{msg}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={closeEdit} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition">
                  বাতিল
                </button>
                <button onClick={handleSave} disabled={loading}
                  className="flex-[2] bg-brand-navy text-white py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition hover:bg-brand-navyLight flex items-center justify-center gap-2 disabled:opacity-60 disabled:shadow-none">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>সংরক্ষণ...</>
                    : 'সংরক্ষণ করুন'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Datalist for member name search bar suggestions */}
      <datalist id="member-names-list">
        {members.map(m => (
          <option key={m.id} value={m.name} />
        ))}
      </datalist>
    </>
  )
}
