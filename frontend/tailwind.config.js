/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/primereact/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#17153B',
          DEFAULT: '#2E236C', // Primary
          light: '#433D8B',
          muted: '#C8ACD6',
        }
      }
    },
  },
  plugins: [],
}
