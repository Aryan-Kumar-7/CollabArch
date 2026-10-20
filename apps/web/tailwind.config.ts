import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: '#0f172a',
        'surface-elevated': '#1e293b',
        'surface-border': '#334155',
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        gateway: '#38bdf8',
        service: '#818cf8',
        database: '#34d399',
        queue: '#fbbf24',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-dash': 'flowDash 1s linear infinite',
      },
      keyframes: {
        flowDash: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      boxShadow: {
        'glow-gateway': '0 0 20px -3px rgba(56, 189, 248, 0.35)',
        'glow-service': '0 0 20px -3px rgba(129, 140, 248, 0.35)',
        'glow-database': '0 0 20px -3px rgba(52, 211, 153, 0.35)',
        'glow-queue': '0 0 20px -3px rgba(251, 191, 36, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
