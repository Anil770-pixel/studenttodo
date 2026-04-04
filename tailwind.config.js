/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                slate: {
                    850: '#151e2e',
                    900: '#0f172a',
                    950: '#020617', // Main background
                },
                primary: {
                    DEFAULT: '#6366f1', // Indigo 500
                    hover: '#4f46e5', // Indigo 600
                    light: '#818cf8', // Indigo 400
                    glow: 'rgba(99, 102, 241, 0.5)'
                },
                accent: {
                    purple: '#a855f7',
                    cyan: '#06b6d4'
                },
                navy: {
                    900: '#0f172a', // Deep Navy
                    800: '#1e293b',
                },
                neon: {
                    cyan: '#06b6d4',
                    orange: '#f97316',
                    purple: '#8b5cf6',
                    green: '#10b981'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 0 20px -5px rgba(99, 102, 241, 0.4)',
                'glow-lg': '0 0 30px -5px rgba(99, 102, 241, 0.5)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            }
        },
    },
    plugins: [],
}
