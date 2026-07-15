/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0F2A43', deep: '#0A1E31', soft: '#27496B' },
        civic: { DEFAULT: '#E8871E', dark: '#C96F0C', tint: '#FDF3E5' },
        paper: '#F6F7F9'
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
