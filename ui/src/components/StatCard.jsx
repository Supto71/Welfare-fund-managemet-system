// StatCard — large analytics card with icon, value, and label
const colorMap = {
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100  text-green-600',  val: 'text-green-700',  ring: 'ring-green-100' },
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100   text-blue-600',   val: 'text-blue-700',   ring: 'ring-blue-100'  },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', val: 'text-purple-700', ring: 'ring-purple-100'},
  gold:   { bg: 'bg-amber-50',  icon: 'bg-amber-100  text-amber-600',  val: 'text-amber-700',  ring: 'ring-amber-100' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100    text-red-600',    val: 'text-red-700',    ring: 'ring-red-100'   },
}

function fmt(v) {
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function StatCard({ label, sublabel, value, icon, color = 'green', prefix = null, suffix = '', isCurrency = true }) {
  const c = colorMap[color] ?? colorMap.green

  return (
    <div className={`${c.bg} rounded shadow-sm border border-white hover:shadow-md transition-shadow duration-200 flex items-center px-2 h-[46px] gap-2`}>
      <div className={`${c.icon} w-6 h-6 rounded flex items-center justify-center shrink-0 ring-1 ${c.ring}`}>
        {icon}
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <p className="text-gray-500 text-[10px] sm:text-xs font-semibold leading-none truncate">{label}</p>
        <div className={`${c.val} text-base font-extrabold leading-none tracking-tight flex items-center gap-1 mt-0.5`}>
          {prefix}
          <span>{isCurrency ? fmt(value) : value}{suffix}</span>
        </div>
      </div>
    </div>
  )
}
