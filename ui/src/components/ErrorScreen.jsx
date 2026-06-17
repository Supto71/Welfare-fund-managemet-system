export default function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-4">
      <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
        <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="font-bold text-gray-800 text-lg">ত্রুটি ঘটেছে</p>
        <p className="text-gray-500 text-sm mt-1 max-w-xs">{message}</p>
      </div>
      <button onClick={onRetry}
        className="bg-brand-navy text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-brand-navyLight transition flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        আবার চেষ্টা করুন
      </button>
    </div>
  )
}
