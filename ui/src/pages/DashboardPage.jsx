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

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getSummary(selectedMonth)
      setData(res.data)
    } catch (err) {
      setError(err.message || 'ডেটা লোড করতে ব্যর্থ হয়েছে।')
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary, refresh])

  const triggerRefresh = () => setRefresh(r => r + 1)

  if (loading) return <LoadingScreen />
  if (error)   return <ErrorScreen message={error} onRetry={triggerRefresh} />

  const {
    totalSavings, soldShares,
    memberCount, members,
    total_amount, total_shares_sold, monthly_amount,
    monthlyHistory
  } = data

  const isAdmin = user?.role === 'admin'

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
