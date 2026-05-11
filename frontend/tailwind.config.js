/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Tokens sémantiques (utilisables comme bg-primary, text-danger, etc.)
        primary: {
          DEFAULT: '#2563eb', // blue-600
          hover: '#1d4ed8',   // blue-700
        },
        danger: {
          DEFAULT: '#dc2626', // red-600
          hover: '#b91c1c',   // red-700
          bg: '#450a0a',      // red-950
          border: '#7f1d1d',  // red-900
          text: '#fca5a5',    // red-300
        },
        success: {
          DEFAULT: '#16a34a', // green-600
          text: '#4ade80',    // green-400
          bg: '#052e16',      // green-950
        },
        surface: {
          DEFAULT: '#111827', // gray-900 (cards)
          hover: '#1f2937',   // gray-800
          border: '#1f2937',  // gray-800
          muted: '#374151',   // gray-700
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
      },
    },
  },
  plugins: [],
}
