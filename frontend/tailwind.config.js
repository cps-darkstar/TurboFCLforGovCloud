/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-bg': '#F0F4F8',
        'secondary-bg': '#FFFFFF',
        'accent-bg': '#E2E8F0',
        'primary-text': '#1A202C',
        'secondary-text': '#4A5568',
        'accent-text': '#2B6CB0',
        'primary-border': '#CBD5E0',
        'accent-border': '#2B6CB0',
        'button-primary-bg': '#3182CE',
        'button-primary-hover': '#2B6CB0',
        'button-secondary-bg': '#E2E8F0',
        'button-secondary-hover': '#CBD5E0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        input: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        button: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}