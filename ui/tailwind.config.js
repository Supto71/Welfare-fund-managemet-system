/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans Bengali', 'ui-sans-serif', 'system-ui'],
        bn:   ['Noto Sans Bengali', 'sans-serif'],
      },
      colors: {
        brand: {
          navy:    '#0f172a',   // dark blue banner
          navyMid: '#1e3a5f',
          navyLight:'#243b55',
          green:   '#16a34a',
          gold:    '#f59e0b',
          cream:   '#fef9f0',
          red:     '#dc2626',
        },
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.07)',
        'card-hover': '0 6px 24px rgba(0,0,0,0.12)',
      },
      animation: {
        'fade-in': 'fadeIn .35s ease',
        'slide-up': 'slideUp .4s ease',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
