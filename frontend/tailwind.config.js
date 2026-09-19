/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--bg-base)',
          card:     'var(--bg-card)',
          hover:    'var(--bg-hover)',
          active:   'var(--bg-active)',
          subtle:   'var(--bg-subtle)',
        },
        border: {
          DEFAULT:   'var(--border-default)',
          subtle:    'var(--border-subtle)',
          highlight: 'var(--border-hi)',
        },
        primary: {
          50: '#F0EEFF', 100: '#E0DAFF', 200: '#C4B5FD',
          300: '#A78BFA', 400: '#818CF8',
          500: '#6366F1', 600: '#4F46E5', 700: '#4338CA',
          DEFAULT: '#6366F1',
        },
        accent: {
          violet:  '#8B5CF6',
          cyan:    '#06B6D4',
          emerald: '#10B981',
          amber:   '#F59E0B',
          rose:    '#F43F5E',
          pink:    '#EC4899',
        },
      },
      fontFamily: {
        sans:     ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        body:     ['Inter', 'system-ui', 'sans-serif'],
        heading:  ['Outfit', 'sans-serif'],
        mono:     ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        glow:           '0 0 28px -4px rgba(99,102,241,0.45)',
        'glow-sm':      '0 0 16px -4px rgba(99,102,241,0.35)',
        'glow-cyan':    '0 0 25px -5px rgba(6,182,212,0.35)',
        'glow-rose':    '0 0 25px -5px rgba(244,63,94,0.35)',
        'glow-violet':  '0 0 25px -5px rgba(139,92,246,0.35)',
        glass:          '0 8px 32px 0 rgba(99,102,241,0.12)',
        card:           '0 2px 14px 0 rgba(99,102,241,0.09), 0 1px 3px 0 rgba(0,0,0,0.04)',
        'card-hover':   '0 8px 30px 0 rgba(99,102,241,0.16), 0 2px 8px 0 rgba(0,0,0,0.06)',
        'card-lift':    '0 16px 40px 0 rgba(99,102,241,0.20)',
        inner:          'inset 0 2px 4px 0 rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'gradient-radial':   'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand':    'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%)',
        'gradient-warm':     'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)',
        'gradient-cool':     'linear-gradient(135deg, #06B6D4 0%, #6366F1 100%)',
        'gradient-success':  'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
        'gradient-danger':   'linear-gradient(135deg, #F43F5E 0%, #F59E0B 100%)',
      },
      animation: {
        'pulse-subtle':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':       'fadeIn 0.35s ease-out',
        'slide-up':      'slideUp 0.35s ease-out',
        'scale-in':      'scaleIn 0.25s ease-out',
        'float':         'float 3s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
        'spin-slow':     'spin 4s linear infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity:'0', transform:'translateY(8px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        slideUp: { '0%': { opacity:'0', transform:'translateY(16px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        scaleIn: { '0%': { opacity:'0', transform:'scale(0.94)' }, '100%': { opacity:'1', transform:'scale(1)' } },
        float:   { '0%,100%': { transform:'translateY(0px)' }, '50%': { transform:'translateY(-6px)' } },
        shimmer: { '0%': { backgroundPosition:'-200% 0' }, '100%': { backgroundPosition:'200% 0' } },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
