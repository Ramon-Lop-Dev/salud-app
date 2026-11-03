// tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1f4e79',
        background: '#ffffff',
        text: '#0f172a'
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next"', 'system-ui']
      },
      fontSize: {
        base: ['18px', '1.5'],
        lg: ['20px', '1.6'],
        xl: ['22px', '1.7']
      },
      borderRadius: {
        DEFAULT: '0.5rem'
      },
      spacing: {
        4: '1rem',
        5: '1.25rem',
        6: '1.5rem'
      },
      minHeight: {
        button: '56px'
      }
    }
  },
  plugins: []
};
