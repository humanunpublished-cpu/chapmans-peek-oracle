/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'oracle-green': '#00ff88',
        'oracle-cyan': '#00d4ff',
        'oracle-red': '#ff3b5c',
        'oracle-gold': '#ffd700',
        'oracle-bg': '#0a0a0f',
        'oracle-panel': 'rgba(20, 25, 35, 0.95)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)' },
          '50%': { opacity: 0.8, boxShadow: '0 0 40px rgba(0, 255, 136, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
