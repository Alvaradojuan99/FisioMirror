/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00694b',
          container: '#008560',
          fixed: '#84f8c8',
          'fixed-dim': '#67dbad',
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#f5fff7',
          fixed: '#002115',
          'fixed-variant': '#005139',
        },
        secondary: {
          DEFAULT: '#005db6',
          container: '#63a1ff',
          fixed: '#d6e3ff',
          'fixed-dim': '#a9c7ff',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#00376f',
          fixed: '#001b3d',
          'fixed-variant': '#00468c',
        },
        tertiary: {
          DEFAULT: '#006947',
          container: '#00855b',
          fixed: '#6ffbbe',
          'fixed-dim': '#4edea3',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#f5fff6',
          fixed: '#002113',
          'fixed-variant': '#005236',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#93000a',
        },
        surface: {
          DEFAULT: '#f8f9fa',
          dim: '#d9dadb',
          bright: '#f8f9fa',
          'container-lowest': '#ffffff',
          'container-low': '#f3f4f5',
          container: '#edeeef',
          'container-high': '#e7e8e9',
          'container-highest': '#e1e3e4',
          variant: '#e1e3e4',
          tint: '#006c4d',
        },
        'on-surface': {
          DEFAULT: '#191c1d',
          variant: '#3d4a43',
        },
        'on-background': '#191c1d',
        background: '#f8f9fa',
        outline: {
          DEFAULT: '#6d7a72',
          variant: '#bccac1',
        },
        'inverse-surface': '#2e3132',
        'inverse-on-surface': '#f0f1f2',
        'inverse-primary': '#67dbad',
        'brand-green': {
          DEFAULT: '#10b981',
          light: '#e8f5ed',
          dark: '#006b44',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['monospace'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
