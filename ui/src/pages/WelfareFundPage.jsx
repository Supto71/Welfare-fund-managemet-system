import { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import WelfareFundBox from '../components/WelfareFundBox'
import CurrencySymbol from '../components/CurrencySymbol'

const fmt = (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function WelfareFundPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({ totalDonation: 0, totalExpense: 0, welfareBalance: 0 })
  const [memberNames, setMemberNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  
  // Form State
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
    if (!date || !donorName.trim() || amount === '' || isNaN(amount) || Number(amount) < 0) {
      setMsg('সব তথ্য সঠিকভাবে পূরণ করুন।')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      await api.addWelfareTransaction({
        date,
        donor_name: donorName.trim(),
        amount: Number(amount)
      })
      setShowModal(false)
      setDonorName('')
      setAmount('')
      fetchTransactions()
    } catch (err) {
      setMsg(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে।')
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

  const filteredTransactions = transactions.filter(t =>
    (t.donor_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onRefresh={fetchTransactions} />

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in space-y-6">
        
        {/* Welfare Summary Box at the top */}
        <section className="no-print">
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
            <p className="text-sm text-gray-500 mt-1">তারিখ অনুযায়ী সকল অনুদানের বিবরণ (Donations records listed by date)</p>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 no-print w-full sm:w-auto">
            {/* Donor Search Box */}
            <div className="relative w-full sm:w-auto">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <input
                type="text" placeholder="দাতার নাম খুঁজুন (Search donor)..."
                list="donor-suggestions"
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy w-full sm:w-56"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => window.print()} 
                className="flex-1 sm:flex-none bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 hover:text-brand-navy transition shadow-sm flex items-center justify-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                <div className="text-left">
                  <div className="leading-tight">PDF ডাউনলোড / প্রিন্ট</div>
                  <div className="text-[10px] text-gray-400 font-normal leading-tight">PDF Download / Print</div>
                </div>
              </button>
              {isAdmin && (
                <button onClick={() => setShowModal(true)} 
                  className="flex-1 sm:flex-none bg-brand-navy hover:bg-brand-navyLight text-white px-4 py-2 rounded-lg font-bold transition shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                  <div className="text-left">
                    <div className="leading-tight">নতুন রেকর্ড</div>
                    <div className="text-[10px] text-gray-300 font-normal leading-tight">New Donation</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm whitespace-nowrap text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold w-32">
                    <div>তারিখ</div>
                    <div className="text-[10px] text-gray-400 font-normal lowercase mt-0.5">Date</div>
                  </th>
                  <th className="px-6 py-4 font-bold">
                    <div>দাতার নাম</div>
                    <div className="text-[10px] text-gray-400 font-normal lowercase mt-0.5">Donor Name</div>
                  </th>
                  <th className="px-6 py-4 font-bold text-right text-green-600">
                    <div>টাকার পরিমাণ</div>
                    <div className="text-[10px] text-gray-400/80 font-normal lowercase mt-0.5">Amount</div>
                  </th>
                  {isAdmin && <th className="no-print px-6 py-4 font-bold text-center w-24">অ্যাকশন (Action)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} className="px-6 py-12 text-center">
                      <div className="w-8 h-8 border-4 border-brand-navy/20 border-t-brand-navy rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-gray-400 font-medium text-sm">লোড হচ্ছে (Loading)...</p>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} className="px-6 py-12 text-center text-gray-400">
                      কোনো রেকর্ড পাওয়া যায়নি (No records found)。
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600">{tx.date}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">{tx.donor_name}</td>
                      <td className="px-6 py-4 font-bold text-right text-green-700">
                        <div className="inline-flex items-center gap-1 justify-end w-full">
                          <CurrencySymbol className="w-3.5 h-3.5 text-green-700" />
                          <span>{fmt(tx.amount)}</span>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="no-print px-6 py-4 text-center">
                          <button onClick={() => handleDelete(tx.id)} title="ডিলিট করুন"
                            className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
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
                <h3 className="font-bold text-gray-800 text-lg">নতুন অনুদান যোগ করুন (Add New Donation)</h3>
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
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">পরিমাণ (Amount)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <CurrencySymbol className="w-4 h-4 text-gray-400" />
                    </span>
                    <input
                      type="number" required min="0" step="0.01" placeholder="উদা: 1000"
                      value={amount} onChange={e => setAmount(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm font-medium text-green-700 placeholder-gray-400"
                    />
                  </div>
                </div>

                {msg && <p className="text-red-600 text-xs font-medium bg-red-50 p-2 rounded-md">{msg}</p>}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
                    বাতিল (Cancel)
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-[2] bg-brand-navy text-white py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition hover:bg-brand-navyLight flex items-center justify-center gap-2 disabled:opacity-60 disabled:shadow-none">
                    {saving ? 'সংরক্ষণ...' : 'সংরক্ষণ করুন (Save)'}
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
