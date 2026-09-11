/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary:     'oklch(0.52 0.22 277)',
        'primary-fg': 'oklch(0.99 0.005 277)',
        accent:      'oklch(0.94 0.035 270)',
        'accent-fg': 'oklch(0.35 0.11 275)',
        border:      'oklch(0.915 0.012 268)',
        muted:       'oklch(0.962 0.008 268)',
        'muted-fg':  'oklch(0.55 0.03 265)',
        card:        'oklch(1 0 0)',
      },
      borderRadius: {
        DEFAULT: '0.9rem',
        sm: 'calc(0.9rem - 4px)',
        md: 'calc(0.9rem - 2px)',
        lg: '0.9rem',
        xl: 'calc(0.9rem + 4px)',
        '2xl': 'calc(0.9rem + 8px)',
        '3xl': 'calc(0.9rem + 12px)',
        '4xl': 'calc(0.9rem + 16px)',
      },
      boxShadow: {
        soft: '0 1px 2px oklch(0.3 0.05 265 / 0.05), 0 8px 24px -12px oklch(0.3 0.05 265 / 0.18)',
        elevated: '0 24px 60px -28px oklch(0.35 0.12 275 / 0.42)',
        glow: '0 18px 40px -18px color-mix(in oklab, oklch(0.52 0.22 277) 55%, transparent)',
      },
    },
  },
  plugins: [],
};
