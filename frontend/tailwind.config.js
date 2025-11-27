/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fpl: {
          purple: '#37003c',
          green: '#00ff87',
          cyan: '#04f5ff',
          pink: '#e90052'
        }
      }
    },
  },
  plugins: [],
}
