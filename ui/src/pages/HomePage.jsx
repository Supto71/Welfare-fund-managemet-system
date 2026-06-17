import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10 sm:py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-navy mb-3">
            স্বাগতম (Welcome), {user?.name}! 👋
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            আসেন খাই কল্যাণ তহবিলে আপনাকে স্বাগতম (Welcome to Asen Khai Welfare Fund portal)। নিচে থেকে আপনার প্রয়োজনীয় সেকশনটি বেছে নিন।
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Card 1: Dashboard */}
          <Link to="/dashboard" 
            className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-brand-gold/50 flex flex-col h-full hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-navy/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500 ease-out" />
            <div className="p-8 relative z-10 flex flex-col items-center text-center flex-1">
              <div className="w-16 h-16 rounded-2xl bg-brand-navy text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">ব্যবসায়িক ড্যাশবোর্ড (Business Dashboard)</h2>
              <p className="text-gray-500">শেয়ার হোল্ডারদের হিসাব, ব্যবসার লাভ-ক্ষতি এবং আপনার ব্যক্তিগত জমার সম্পূর্ণ রিপোর্ট দেখুন।</p>
            </div>
            <div className="bg-gray-50/80 p-4 border-t border-gray-100 text-center text-brand-navy font-bold text-sm group-hover:bg-brand-navy group-hover:text-white transition-colors">
              ড্যাশবোর্ডে প্রবেশ করুন (Enter Dashboard) &rarr;
            </div>
          </Link>

          {/* Card 2: Welfare Fund */}
          <Link to="/welfare-fund" 
            className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-green-500/50 flex flex-col h-full hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500 ease-out" />
            <div className="p-8 relative z-10 flex flex-col items-center text-center flex-1">
              <div className="w-16 h-16 rounded-2xl bg-green-600 text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">আসেন খাই কল্যাণ তহবিল (Welfare Fund)</h2>
              <p className="text-gray-500">কল্যাণ তহবিলে দাতাদের অনুদান, তারিখ অনুযায়ী হিসাব এবং মোট জমা হওয়া ফান্ডের বিস্তারিত তথ্য দেখুন।</p>
            </div>
            <div className="bg-gray-50/80 p-4 border-t border-gray-100 text-center text-green-700 font-bold text-sm group-hover:bg-green-600 group-hover:text-white transition-colors">
              তহবিলে প্রবেশ করুন (Enter Welfare Fund) &rarr;
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
