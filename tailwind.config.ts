import type { Config } from 'tailwindcss'

// Design tokens sampled from the Figma exports in /assetWeb
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1664CC', dark: '#0F4FA8' },
        ink: { DEFAULT: '#1B1F3B', soft: '#4A5068' },
        cream: '#FFFCF5',
        line: '#C6CDDB',
        panel: '#F3F4F8',
        footer: '#F3F1EB',
        tint: {
          blue: '#EDF5FF',
          yellow: '#FFF2C8',
          purple: '#F1EBFF',
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
