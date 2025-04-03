/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'gray-850': '#1f2937', // Specific dark gray for backgrounds
        primary: {
          DEFAULT: '#3b82f6', // blue-500
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#6b7280', // gray-500
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ef4444', // red-500
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#f3f4f6', // gray-100
          foreground: '#1f2937', // gray-850
        },
        background: {
          DEFAULT: '#ffffff',
          foreground: '#1f2937', // gray-850
        },
        muted: {
          DEFAULT: '#f3f4f6', // gray-100
          foreground: '#6b7280', // gray-500
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#1f2937', // gray-850
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#1f2937', // gray-850
        },
        ring: {
          DEFAULT: '#e5e7eb', // gray-200
        },
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fadeIn': 'fadeIn 0.5s ease-in-out',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
} 