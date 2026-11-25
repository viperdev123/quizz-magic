import type { Config } from 'tailwindcss'

// Design tokens: a Thai lottery-ticket theme (lottery red, gold trim, warm paper)
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#9B1C1C', dark: '#7A1414' },
        gold: { DEFAULT: '#E8C77A', soft: '#FFF1D0', paper: '#FFF7E6' },
        ink: { DEFAULT: '#1B1F3B', soft: '#4A5068' },
        cream: '#F4EADB',
        line: '#D2B97E',
        panel: '#F8EBCD',
        footer: '#FFF1D0',
        tint: {
          blue: '#FFF4DE',
          yellow: '#FFF2C8',
          purple: '#FCEAE6', // lottery pink (name kept for existing classes)
          sand: '#F5E9D3',
          green: '#E6F6EE',
          red: '#FDEDED',
        },
        ok: '#17684A',
        bad: '#B3423D',
        star: '#8A5A00',
        wait: { bg: '#FFF0B7', fg: '#7A5200' },
      },
      fontFamily: {
        sans: ['"Noto Sans Thai Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '24px', field: '16px' },
      minHeight: { tap: '44px' },
      minWidth: { tap: '44px' },
    },
  },
  plugins: [],
} satisfies Config
