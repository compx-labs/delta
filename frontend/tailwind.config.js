/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Palette (dominant - ~90% of UI)
        'near-black': '#0B0D10',
        'off-white': '#F5F6F7',
        'slate-grey': '#5E646B',
        'mid-grey': '#A3A7AD',
        // Accent Colour (signal colour only)
        'amber': '#D6A84F',
      },
      fontFamily: {
        mono: ['Space Mono', 'monospace'],
        sans: ['Space Mono', 'monospace'], // Use monospace as default
      },
      fontWeight: {
        normal: '400',
        medium: '700', // Override Tailwind's default 500 to match Space Mono's bold (700)
      },
    },
  },
  plugins: [],
}

