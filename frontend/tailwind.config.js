/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.2s ease-out',
      },
      colors: {
        uber: {
          black: '#000000',
          white: '#ffffff',
          gray: '#f6f6f6',
          'dark-gray': '#1a1a1a',
          'mid-gray': '#282828',
          'light-gray': '#717171',
          green: '#00b140',
        },
      },
    },
  },
  plugins: [],
};
