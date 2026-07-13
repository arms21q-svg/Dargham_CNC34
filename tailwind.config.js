/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7f4',
          100: '#dceee6',
          200: '#bbddcd',
          300: '#8fc5ad',
          400: '#62a88a',
          500: '#448d6f',
          600: '#347159',
          700: '#2b5a49',
          800: '#25493c',
          900: '#203c33',
          950: '#11221c',
        },
        surface: {
          light: '#faf9f7',
          dark: '#1a1f1e',
        },
        accent: {
          warm: '#c4a882',
          cool: '#6b9dad',
        },
      },
      fontFamily: {
        arabic: ['Tajawal', 'system-ui', 'Segoe UI', 'sans-serif'],
        english: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.35)' },
          '50%': { boxShadow: '0 10px 30px -5px rgba(124, 58, 237, 0.65)' },
        },
      },
    },
  },
  plugins: [],
}
