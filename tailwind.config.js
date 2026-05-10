/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f4ead5',
        'paper-dark': '#e8dcc0',
        ink: '#1a1814',
        rouge: '#a8261f',
        'rouge-deep': '#7a1a14',
        maillot: '#e8c547',
        'maillot-deep': '#c89f1a',
        verde: '#3d6b3a',
        montagne: '#b03b4d',
        bianco: '#fafafa',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"EB Garamond"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"Courier New"', 'monospace'],
        sans: ['"Bebas Neue"', 'Impact', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
