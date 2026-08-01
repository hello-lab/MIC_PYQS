// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['var(--font-press-start)', 'monospace'],
        mono: ['var(--font-courier-prime)', 'monospace'],
      },
      colors: {
        vellum: '#f4eae1',
        ink: '#1a1612',
        iron: '#3a352e',
        mahog: '#2d140e',
        mahogLight: '#3d1e16',
        wax: '#8b2e2e',
        gold: '#cfaa5b',
        lantern: '#f9d976',
        emerald: '#3d7a4f',
      },
    },
  },
  plugins: [],
};