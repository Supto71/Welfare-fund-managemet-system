import CurrencySymbol from './CurrencySymbol'

const fmt = (v) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function SharesSummaryBox({ totalSharesSold, monthlyAmount, totalAmount }) {
  return (
    <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col justify-center">
      {/* Three columns directly, no large header to save space */}
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        {/* Total Shares */}
        <div className="p-1.5 flex flex-col group">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">মোট শেয়ার</span>
          <p className="text-blue-600 font-extrabold text-lg leading-none mt-1">{totalSharesSold} <span className="text-[10px] font-normal text-gray-500">(Shares)</span></p>
        </div>

        {/* Monthly Amount */}
        <div className="p-1.5 flex flex-col group">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">মাসিক জমা</span>
          <div className="text-amber-600 font-extrabold text-lg leading-none flex items-center gap-1 mt-1">
            <CurrencySymbol className="w-3.5 h-3.5 text-amber-600" />
            <span>{fmt(monthlyAmount)}</span>
          </div>
        </div>

        {/* Total Amount */}
        <div className="p-1.5 flex flex-col bg-green-50/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">সর্বমোট তহবিল</span>
          <div className="text-green-600 font-extrabold text-lg leading-none flex items-center gap-1 mt-1">
            <CurrencySymbol className="w-3.5 h-3.5 text-green-700" />
            <span>{fmt(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
