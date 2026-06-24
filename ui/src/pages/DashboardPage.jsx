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
  const [showVerificationSection, setShowVerificationSection] = useState(false)

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

      <main className="flex-1 max-w-6xl mx-auto w-full pb-6 space-y-4 animate-slide-up">
        
        {/* ── STICKY TOP SECTION: Everything ─────────────────────────── */}
        <div className="sticky top-0 z-50 bg-[#f8f9fa] shadow-sm pb-2 pt-2 px-4 sm:px-6 -mx-4 sm:mx-0 sm:rounded-b-xl border-b border-gray-200 space-y-2">
          
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 no-print">
            <h2 className="text-xl font-bold text-gray-800 leading-none">ব্যবসায়িক ড্যাশবোর্ড (Business Dashboard)</h2>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button 
                  onClick={() => setShowVerificationSection(!showVerificationSection)}
                  className="bg-white border border-blue-200 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-50 transition shadow-sm flex items-center justify-center gap-1.5 text-xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {showVerificationSection ? 'হাইড করুন' : 'রেজিস্ট্রেশন কন্ট্রোল'}
                </button>
              )}
              <button onClick={() => window.print()} 
                className="bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded font-bold hover:bg-gray-50 transition shadow-sm flex items-center justify-center gap-1.5 text-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                PDF প্রিন্ট
              </button>
            </div>
          </div>

          {/* Metrics & Shares (Compact Grid) */}
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Stat Cards - take 3/5 width */}
            <div className="grid grid-cols-3 gap-2 flex-[3]">
              <StatCard
                label="মোট সঞ্চয় (Savings)"
                value={totalSavings}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M6 4h5a8 8 0 0 1 0 16H6V4z" />
                    <line x1="3" y1="9" x2="18" y2="9" />
                    <line x1="3" y1="14" x2="18" y2="14" />
                  </svg>
                }
                color="green"
                prefix={<CurrencySymbol className="w-4 h-4 text-green-700" />}
              />
              <StatCard
                label="শেয়ার বিক্রি (Sold)"
                value={soldShares}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                }
                color="blue"
                isCurrency={false}
              />
              <StatCard
                label="সদস্য (Members)"
                value={18}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                }
                color="purple"
                isCurrency={false}
              />
            </div>
            {/* Shares Summary - take 2/5 width */}
            <div className="flex-[2]">
              <SharesSummaryBox
                totalSharesSold={total_shares_sold}
                monthlyAmount={monthly_amount}
                totalAmount={total_amount}
              />
            </div>
          </div>
        </div>

        {/* ── Pending Approvals Section ──────────────────── */}
        {isAdmin && showVerificationSection && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm space-y-3 no-print mx-4 sm:mx-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  অপেক্ষমান সদস্য (Pending Registrations)
                </h3>
              </div>
              <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingUsers.length} টি অনুরোধ</span>
            </div>
            
            <div className="divide-y divide-amber-100 max-h-60 overflow-y-auto">
              {pendingUsers.length === 0 ? (
                <div className="py-4 text-center text-amber-700 text-xs font-medium">কোনো অপেক্ষমান সদস্য নেই</div>
              ) : (
                pendingUsers.map(u => (
                  <div key={u.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-gray-800 text-xs">{u.name}</p>
                      <p className="text-gray-500 text-[10px]">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleReject(u.id)}
                        className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-2 py-1 rounded text-[10px] font-bold transition">
                        Reject
                      </button>
                      <button onClick={() => handleApprove(u.id)}
                        className="bg-green-600 text-white hover:bg-green-700 px-2 py-1 rounded text-[10px] font-bold transition shadow-sm">
                        Approve
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ── Registered Members List (Admin Only) ─────────────────────────── */}
        {isAdmin && (
          <section className="mt-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-800">সফলভাবে নিবন্ধিত সদস্য (Successfully Registered)</h2>
                  <p className="text-xs text-gray-500 mt-0.5">অফিসিয়াল সদস্য তালিকা</p>
                </div>
                <div className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                  {members.filter(m => m.role === 'member' || m.role === 'admin').length} জন
                </div>
              </div>
              <div className="p-6">
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {members.filter(m => m.role === 'member' || m.role === 'admin').map((member, idx) => (
                    <li key={member.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 truncate">
                        <p className="text-sm font-semibold text-gray-800 truncate">{member.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{member.role}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

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
