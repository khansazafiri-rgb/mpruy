// Warna ditulis sebagai token (variabel CSS di src/index.css), bukan kode
// langsung di komponen, supaya mode gelap bisa ditambahkan nanti.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: token('brand'), dark: token('brand-dark'), soft: token('brand-soft') },
        gold: { DEFAULT: token('gold'), soft: token('gold-soft') },
        ink: { DEFAULT: token('ink'), muted: token('ink-muted'), faint: token('ink-faint') },
        page: token('page'),
        surface: token('surface'),
        line: token('line'),
        academic: { DEFAULT: token('academic'), soft: token('academic-soft') },
        progress: { DEFAULT: token('progress'), soft: token('progress-soft') },
        coral: { DEFAULT: token('coral'), soft: token('coral-soft') },
        ok: { DEFAULT: token('ok'), soft: token('ok-soft') },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgb(23 43 56 / 0.025)',
        pop: '0 10px 40px rgb(23 43 56 / 0.18)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
