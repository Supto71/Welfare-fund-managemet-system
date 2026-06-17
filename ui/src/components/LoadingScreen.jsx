export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-brand-navy flex items-center justify-center shadow-lg animate-pulse-slow">
        <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="font-bn font-bold text-gray-700 text-lg">আসেন খাই কল্যাণ তহবিল</p>
        <p className="text-gray-400 text-sm mt-1">ডেটা লোড হচ্ছে...</p>
      </div>
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-brand-navy/40 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}
