/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                primary: '#1772da',
                'background-light': '#f6f7f8',
                'background-dark': '#111821',
                surface: '#ffffff',
                'border-subtle': '#e2e8f0',
                success: '#10b981',
                danger: '#ef4444',
                'accent-red': '#ef4444',
            },
            fontFamily: { display: ['Inter', 'sans-serif'] },
            borderRadius: { DEFAULT: '1rem', lg: '2rem', xl: '3rem', full: '9999px' },
        },
    },
    plugins: [],
};
