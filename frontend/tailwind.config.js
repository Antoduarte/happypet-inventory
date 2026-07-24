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
          50: '#fbf3fd',
          100: '#f6e3fa',
          200: '#edc7f2',
          300: '#df9fe6',
          400: '#c96fd6',
          500: '#a63cb8',
          600: '#831a97',
          700: '#680a7d',
          800: '#560a67',
          900: '#470c54',
          950: '#2e0838',
          DEFAULT: '#680a7d', // Primario (color oficial)
          dark: '#530862', // hover/pressed
          light: '#8e1ba4', // enlaces / nav activo / focus
          muted: '#dcb3e8', // decorativo (blobs del login)
        }
      }
    },
  },
  plugins: [],
}
