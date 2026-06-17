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
    <div className={`${c.bg} rounded-2xl p-5 shadow-card border border-white hover:shadow-card-hover transition-shadow duration-200 flex items-start gap-4`}>
      <div className={`${c.icon} w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ring-4 ${c.ring}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-gray-500 text-sm font-medium leading-none">{label}</p>
        {sublabel && <p className="text-gray-400 text-[11px] mt-0.5">{sublabel}</p>}
        <div className={`${c.val} text-2xl font-extrabold mt-1.5 tracking-tight flex items-center gap-1`}>
          {prefix}
          <span>{isCurrency ? fmt(value) : value}{suffix}</span>
        </div>
      </div>
    </div>
  )
}
