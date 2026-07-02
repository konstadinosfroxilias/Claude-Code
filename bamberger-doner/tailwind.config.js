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
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(24px, -32px) scale(1.12)' },
          '66%': { transform: 'translate(-20px, 18px) scale(0.92)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'spin-slow': 'spin-slow 14s linear infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        blob: 'blob 18s ease-in-out infinite',
        marquee: 'marquee 32s linear infinite',
        'marquee-fast': 'marquee 20s linear infinite',
        wiggle: 'wiggle 0.4s ease-in-out',
        'gradient-pan': 'gradient-pan 6s ease infinite',
      },
    },
  },
  plugins: [],
}
