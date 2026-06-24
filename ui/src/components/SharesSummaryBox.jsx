import CurrencySymbol from './CurrencySymbol'

const fmt = (v) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function SharesSummaryBox({ totalSharesSold, monthlyAmount, totalAmount }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden min-h-[80px] flex flex-col justify-center">
      {/* Three columns directly, no large header to save space */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 items-center h-full">
        {/* Total Shares */}
        <div className="px-3 py-2 flex flex-col justify-center group h-full">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 leading-tight mb-0.5">মোট শেয়ার</span>
          <p className="text-blue-600 font-extrabold text-lg leading-none">{totalSharesSold} <span className="text-[10px] font-normal text-gray-500">(Shares)</span></p>
        </div>

        {/* Monthly Amount */}
        <div className="px-3 py-2 flex flex-col justify-center group h-full">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 leading-tight mb-0.5">মাসিক জমা</span>
          <div className="text-amber-600 font-extrabold text-lg leading-none flex items-center gap-1">
            <CurrencySymbol className="w-4 h-4 text-amber-600" />
            <span>{fmt(monthlyAmount)}</span>
          </div>
        </div>

        {/* Total Amount */}
        <div className="px-3 py-2 flex flex-col justify-center bg-green-50/50 h-full">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 leading-tight mb-0.5">সর্বমোট তহবিল</span>
          <div className="text-green-600 font-extrabold text-lg leading-none flex items-center gap-1">
            <CurrencySymbol className="w-4 h-4 text-green-700" />
            <span>{fmt(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
