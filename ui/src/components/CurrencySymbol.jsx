export default function CurrencySymbol({ className = "w-3.5 h-3.5" }) {
  return (
    <svg 
      className={`${className} inline-block`} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      style={{ display: 'inline-block', verticalAlign: '-0.1em' }}
    >
      <path d="M6 4h5a8 8 0 0 1 0 16H6V4z" />
      <line x1="3" y1="9" x2="18" y2="9" />
      <line x1="3" y1="14" x2="18" y2="14" />
    </svg>
  )
}
