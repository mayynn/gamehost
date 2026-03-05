/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        extend: {
            colors: {
                primary: { DEFAULT: '#00d4ff', 50: '#e6fbff', 100: '#b3f3ff', 200: '#80ebff', 300: '#4de3ff', 400: '#1adbff', 500: '#00d4ff', 600: '#00a8cc', 700: '#007d99', 800: '#005266', 900: '#002733' },
                accent: { DEFAULT: '#7c3aed', 50: '#f3eaff', 100: '#dfc4fd', 200: '#cb9efc', 300: '#b777fa', 400: '#a351f9', 500: '#7c3aed', 600: '#6429c7', 700: '#4c1fa1', 800: '#34147b', 900: '#1c0a55' },
                dark: { DEFAULT: '#0a0e17', 50: '#1a1f2e', 100: '#151a27', 200: '#111520', 300: '#0d1019', 400: '#0a0e17', 500: '#080b13', 600: '#06080f', 700: '#04060b', 800: '#020307', 900: '#000103' },
                surface: { DEFAULT: '#111827', light: '#1f2937', lighter: '#374151' },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Outfit', 'Inter', 'sans-serif'],
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'slide-up': 'slideUp 0.5s ease-out',
            },
            keyframes: {
                float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-20px)' } },
                glow: { '0%': { boxShadow: '0 0 20px rgba(0,212,255,0.2)' }, '100%': { boxShadow: '0 0 40px rgba(0,212,255,0.4)' } },
                slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
            },
            backdropBlur: { xs: '2px' },
        },
    },
    plugins: [],
};
