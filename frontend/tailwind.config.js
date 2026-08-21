/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        // Sampled from the doodledry logo — deep maroon + peach.
        brand: {
          50: '#FBF2F0',
          100: '#F6E0DB',
          200: '#EABEB4',
          300: '#DA9985',
          400: '#C0705A',
          500: '#9C4C3A',
          600: '#7A362A',
          700: '#5A2622',
          800: '#3F1A17',
          900: '#2A1210',
          950: '#1A0B0A',
        },
        accent: {
          50: '#FFF9F4',
          100: '#FFEEDF',
          200: '#FFDBBC',
          300: '#FEC194',
          400: '#F89C63',
          500: '#EF7A3C',
          600: '#DB5E24',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(42, 18, 16, 0.05), 0 1px 3px 0 rgba(42, 18, 16, 0.08)',
        soft: '0 2px 8px -2px rgba(42, 18, 16, 0.08), 0 4px 16px -4px rgba(42, 18, 16, 0.08)',
        glow: '0 8px 24px -6px rgba(90, 38, 34, 0.35)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      backgroundImage: {
        'brand-radial': 'radial-gradient(circle at 20% 20%, rgba(254,189,151,0.18), transparent 45%), radial-gradient(circle at 85% 75%, rgba(154,76,58,0.35), transparent 50%)',
      },
    },
  },
  plugins: [],
};
