import CurrencySymbol from './CurrencySymbol'

const fmt = (v) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function SharesSummaryBox({ totalSharesSold, monthlyAmount, totalAmount }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-navy to-brand-navyMid px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bn text-white font-bold text-sm">শেয়ার সামারি (Shares Summary)</h3>
            <p className="text-blue-300 text-xs">Shares Summary</p>
          </div>
        </div>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        {/* Total Shares */}
        <div className="p-5 flex flex-col gap-1 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">মোট শেয়ার</span>
            <span className="text-[10px] text-gray-300">Total Shares</span>
          </div>
          <p className="text-blue-600 font-extrabold text-xl mt-1">{totalSharesSold} (Shares)</p>
          <div className="w-full h-1 rounded-full bg-blue-100 mt-2">
            <div className="h-1 rounded-full bg-blue-500 w-full" />
          </div>
        </div>

        {/* Monthly Amount */}
        <div className="p-5 flex flex-col gap-1 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">মাসিক জমা</span>
            <span className="text-[10px] text-gray-300">Monthly Amt</span>
          </div>
          <div className="text-amber-600 font-extrabold text-xl mt-1 flex items-center gap-1">
            <CurrencySymbol className="w-4 h-4 text-amber-600" />
            <span>{fmt(monthlyAmount)}</span>
          </div>
          <div className="w-full h-1 rounded-full bg-amber-100 mt-2">
            <div className="h-1 rounded-full bg-amber-500 w-full" />
          </div>
        </div>

        {/* Total Amount */}
        <div className="p-5 flex flex-col gap-1 bg-green-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">সর্বমোট তহবিল</span>
            <span className="text-[10px] text-gray-300">Total Capital</span>
          </div>
          <div className="text-green-600 font-extrabold text-xl mt-1 flex items-center gap-1">
            <CurrencySymbol className="w-4 h-4 text-green-700" />
            <span>{fmt(totalAmount)}</span>
          </div>
          <span className="text-xs font-semibold mt-2 px-2 py-0.5 rounded-full self-start bg-green-100 text-green-700">
            ✓ সঞ্চয় (Savings)
          </span>
        </div>
      </div>
    </div>
  )
}
