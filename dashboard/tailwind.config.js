/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: { 800: '#1e293b', 700: '#334155', 600: '#475569' },
        accent: { green: '#22c55e', orange: '#f97316', red: '#ef4444' },
      },
    },
  },
  plugins: [],
}
