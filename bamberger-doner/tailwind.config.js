/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette — see brand identity in README
        doner: {
          red: '#C8102E', // deep döner red (primary)
          'red-dark': '#A30D26',
          'red-soft': '#E64560',
        },
        charcoal: {
          DEFAULT: '#1A1A1A',
          soft: '#2B2B2B',
        },
        cream: {
          DEFAULT: '#FAF7F2', // warm off-white background
          deep: '#F2ECE2',
        },
        amber: {
          brand: '#E8A317', // golden / "fresh off the grill" accent
          'brand-dark': '#C8870C',
        },
      },
      fontFamily: {
        display: ['Anton', 'Oswald', 'sans-serif'],
        heading: ['Oswald', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(26,26,26,0.25)',
        card: '0 18px 40px -20px rgba(26,26,26,0.35)',
        glow: '0 0 0 4px rgba(232,163,23,0.25)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'spin-slow': 'spin-slow 14s linear infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
}
