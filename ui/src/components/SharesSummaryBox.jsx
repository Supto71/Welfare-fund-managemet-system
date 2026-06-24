import CurrencySymbol from './CurrencySymbol'

const fmt = (v) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function SharesSummaryBox({ totalSharesSold, monthlyAmount, totalAmount }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col justify-center">
      {/* Three columns directly, no large header to save space */}
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        {/* Total Shares */}
        <div className="p-1.5 flex flex-col gap-0.5 group">
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">মোট শেয়ার</span>
          <p className="text-blue-600 font-extrabold text-sm leading-none">{totalSharesSold} <span className="text-[9px] font-normal text-gray-500">(Shares)</span></p>
        </div>

        {/* Monthly Amount */}
        <div className="p-1.5 flex flex-col gap-0.5 group">
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">মাসিক জমা</span>
          <div className="text-amber-600 font-extrabold text-sm leading-none flex items-center gap-0.5">
            <CurrencySymbol className="w-3 h-3 text-amber-600" />
            <span>{fmt(monthlyAmount)}</span>
          </div>
        </div>

        {/* Total Amount */}
        <div className="p-1.5 flex flex-col gap-0.5 bg-green-50/50">
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">সর্বমোট তহবিল</span>
          <div className="text-green-600 font-extrabold text-sm leading-none flex items-center gap-0.5">
            <CurrencySymbol className="w-3 h-3 text-green-700" />
            <span>{fmt(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
