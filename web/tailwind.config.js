/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gate: {
          900: '#0b1020',
          800: '#111827',
          700: '#1f2937',
          500: '#3b82f6',
          400: '#60a5fa',
          300: '#93c5fd'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.18)'
      }
    }
  },
  plugins: []
};
