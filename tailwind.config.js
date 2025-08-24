/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#12292F',
          beige: '#E7E4DE',
          green: '#16A34A',
        },
        secondary: {
          vineRed: '#5E3532',
          green: '#3E5444',
          terracotta: '#B8604D',
          grey: '#879794',
          brown: '#61473B',
          navy: '#1F2E3B',
        },
        ui: {
          background: '#FFFFFF',
          surface: '#F5F5F5',
          error: '#DC2626',
          success: '#16A34A',
          warning: '#F59E0B',
          info: '#3B82F6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}