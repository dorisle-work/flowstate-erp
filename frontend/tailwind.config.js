/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Be Vietnam Pro"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#1c1f26',
        tide: '#3ddc97',
      },
      boxShadow: {
        dock: '0 12px 32px rgba(28, 31, 38, 0.08)',
      },
    },
  },
  plugins: [],
}
