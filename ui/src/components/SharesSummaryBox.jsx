import CurrencySymbol from './CurrencySymbol'

const fmt = (v) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function SharesSummaryBox({ totalSharesSold, monthlyAmount, totalAmount }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-navy to-brand-navyMid px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bn text-white font-bold text-xs">শেয়ার সামারি (Shares Summary)</h3>
          </div>
        </div>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        {/* Total Shares */}
        <div className="p-3 flex flex-col gap-1 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">মোট শেয়ার</span>
          </div>
          <p className="text-blue-600 font-extrabold text-lg leading-none">{totalSharesSold} <span className="text-[10px] font-normal text-gray-500">(Shares)</span></p>
        </div>

        {/* Monthly Amount */}
        <div className="p-3 flex flex-col gap-1 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">মাসিক জমা</span>
          </div>
          <div className="text-amber-600 font-extrabold text-lg leading-none flex items-center gap-1">
            <CurrencySymbol className="w-3.5 h-3.5 text-amber-600" />
            <span>{fmt(monthlyAmount)}</span>
          </div>
        </div>

        {/* Total Amount */}
        <div className="p-3 flex flex-col gap-1 bg-green-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">সর্বমোট তহবিল</span>
          </div>
          <div className="text-green-600 font-extrabold text-lg leading-none flex items-center gap-1">
            <CurrencySymbol className="w-3.5 h-3.5 text-green-700" />
            <span>{fmt(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
