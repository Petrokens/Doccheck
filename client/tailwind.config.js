/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        backgroundLight: '#f8f5f2',
        white: '#FFFFFF',
        grayLight: '#CBD4DB',
        bluePrimary: '#0B4D99',
        blueAccent: '#668FBF',
        blackBase: '#1E1E1E',
        blackSoft: '#3C3C3C',
        blackLight: '#646464',
       
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
