/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    500: '#10b981', // Emerald
                    600: '#059669',
                    900: '#064e3b',
                },
                accent: {
                    500: '#a855f7', // Purple
                }
            }
        },
    },
    plugins: [],
}
