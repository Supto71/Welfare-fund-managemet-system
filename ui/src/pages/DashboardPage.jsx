import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Header from '../components/Header'
import StatCard from '../components/StatCard'
import SharesSummaryBox from '../components/SharesSummaryBox'
import MemberTable from '../components/MemberTable'
import LoadingScreen from '../components/LoadingScreen'
import ErrorScreen from '../components/ErrorScreen'
import CurrencySymbol from '../components/CurrencySymbol'

const fmt = (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatMonthName = (monthStr) => {
  if (!monthStr || monthStr === 'all') return 'সব সময় (All Time)'
  const [year, month] = monthStr.split('-')
  const date = new Date(year, parseInt(month) - 1, 1)
  const bn = date.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' })
  const en = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  return `${bn} (${en})`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [pendingUsers, setPendingUsers] = useState([])

  const isAdmin = user?.role === 'admin'

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getSummary(selectedMonth)
      setData(res.data)

      if (isAdmin) {
        const pendingRes = await api.getPendingApprovals()
        setPendingUsers(pendingRes.data || [])
      }
    } catch (err) {
      setError(err.message || 'ডেটা লোড করতে ব্যর্থ হয়েছে।')
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, isAdmin])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary, refresh])

  const triggerRefresh = () => setRefresh(r => r + 1)

  const handleApprove = async (userId) => {
    try {
      await api.approveUser({ userId })
      triggerRefresh()
    } catch (err) {
      alert(err.message || 'অনুমোদন ব্যর্থ হয়েছে।')
    }
  }

  const handleReject = async (userId) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে আপনি এই নিবন্ধন অনুরোধটি প্রত্যাখ্যান করতে চান?')) return
    try {
      await api.rejectUser({ userId })
      triggerRefresh()
    } catch (err) {
      alert(err.message || 'প্রত্যাখ্যান ব্যর্থ হয়েছে।')
    }
  }

  if (loading) return <LoadingScreen />
  if (error)   return <ErrorScreen message={error} onRetry={triggerRefresh} />

  const {
    totalSavings, soldShares,
    memberCount, members,
    total_amount, total_shares_sold, monthly_amount,
    monthlyHistory
  } = data

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onRefresh={triggerRefresh} className="no-print" />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 space-y-6 animate-slide-up">
        
        {/* Header Action Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 no-print">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">ব্যবসায়িক ড্যাশবোর্ড (Business Dashboard)</h2>
          </div>
          <button onClick={() => window.print()} 
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 transition shadow-sm flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            PDF ডাউনলোড / প্রিন্ট (PDF Download / Print)
          </button>
        </div>

        {/* ── Pending Approvals Section ──────────────────── */}
        {isAdmin && pendingUsers.length > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3 no-print">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-amber-800 text-base flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  অনুমোদনের জন্য অপেক্ষমান সদস্য (Pending Registrations)
                </h3>
                <p className="text-amber-600 text-xs mt-0.5">এই ব্যবহারকারীরা অ্যাকাউন্ট নিবন্ধন করেছেন এবং লগইন করার আগে আপনার অনুমোদনের প্রয়োজন।</p>
              </div>
              <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">{pendingUsers.length} টি অনুরোধ</span>
            </div>
            
            <div className="divide-y divide-amber-100 max-h-60 overflow-y-auto">
              {pendingUsers.map(u => (
                <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{u.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleReject(u.id)}
                      className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                      প্রত্যাখ্যান (Reject)
                    </button>
                    <button onClick={() => handleApprove(u.id)}
                      className="bg-green-600 text-white hover:bg-green-700 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                      অনুমোদন করুন (Approve)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Analytics Cards ─────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            {selectedMonth === 'all' 
              ? 'সারসংক্ষেপ - সব সময় (Summary - All Time)' 
              : `সারসংক্ষেপ - ${formatMonthName(selectedMonth)}`
            }
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label={selectedMonth === 'all' ? "মোট সঞ্চয় (Total Savings)" : `মাসিক সঞ্চয় (Savings - ${formatMonthName(selectedMonth)})`}
              sublabel="Savings"
              value={totalSavings}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M6 4h5a8 8 0 0 1 0 16H6V4z" />
                  <line x1="3" y1="9" x2="18" y2="9" />
                  <line x1="3" y1="14" x2="18" y2="14" />
                </svg>
              }
              color="green"
              prefix={<CurrencySymbol className="w-5 h-5 text-green-700" />}
            />
            <StatCard
              label={selectedMonth === 'all' ? "মোট শেয়ার বিক্রি (Total Sold Shares)" : `বিক্রীত শেয়ার (Shares - ${formatMonthName(selectedMonth)})`}
              sublabel="Sold Shares"
              value={soldShares}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              }
              color="blue"
              suffix=" (Shares)"
              isCurrency={false}
            />
            <StatCard
              label="মোট সদস্য (Total Members)"
              sublabel="Total Members"
              value={memberCount}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              }
              color="purple"
              suffix=" জন (Members)"
              isCurrency={false}
            />
          </div>
        </section>

        {/* ── Summary Boxes: Shares Summary ─────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">শেয়ার সামারি (Shares Summary)</h2>
          <SharesSummaryBox
            totalSharesSold={total_shares_sold}
            monthlyAmount={monthly_amount}
            totalAmount={total_amount}
          />
        </section>

        {/* ── Member Table ─────────────────────────────────── */}
        <section className="pb-8">
          <MemberTable
            members={members}
            isAdmin={isAdmin}
            onUpdate={triggerRefresh}
            months={monthlyHistory}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </section>

      </main>
    </div>
  )
}
