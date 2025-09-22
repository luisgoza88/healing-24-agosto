import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Colores de Healing Forest
        'hf-primary': '#3E5444', // Verde bosque
        'hf-dark': '#12292F', // Dark teal
        'hf-beige': '#E7E4DE', // Beige de fondo
        'hf-coral': '#ECD0B6', // Coral suave
        'hf-gray': '#B2B8B0', // Gris claro
        'hf-terracotta': '#B8604D', // Terracota
        'hf-navy': '#1F2E3B', // Azul marino
        
        // Override de colores por defecto
        primary: {
          DEFAULT: '#3E5444',
          50: '#F5F7F5',
          100: '#E8EBE8',
          200: '#C9D0CA',
          300: '#AAB5AB',
          400: '#6B7F6D',
          500: '#3E5444',
          600: '#384C3D',
          700: '#2E3E32',
          800: '#243028',
          900: '#1C241E',
          950: '#0E1210'
        },
        stroke: {
          DEFAULT: '#E2E8F0',
          dark: '#64748B'
        },
        gray: {
          DEFAULT: '#EFF4FB',
          dark: '#17181C'
        }
      },
      fontSize: {
        'title-xxl': ['44px', '55px'],
        'title-xxl2': ['42px', '58px'],
        'title-xl': ['36px', '45px'],
        'title-xl2': ['33px', '45px'],
        'title-lg': ['28px', '35px'],
        'title-md': ['24px', '30px'],
        'title-md2': ['26px', '30px'],
        'title-sm': ['20px', '26px'],
        'title-sm2': ['22px', '28px'],
        'title-xsm': ['18px', '24px']
      },
      boxShadow: {
        DEFAULT: '0px 1px 3px 0px rgba(0, 0, 0, 0.08)',
        card: '0px 1px 3px 0px rgba(0, 0, 0, 0.12)',
        'card-sm': '0px 1px 2px 0px rgba(0, 0, 0, 0.05)',
        switcher: '0px 2px 4px 0px rgba(0, 0, 0, 0.2), inset 0px 2px 2px 0px rgba(255, 255, 255, 0.05)'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
};

export default config;