/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Refined editorial palette — warm cream paper feel
        paper: '#F7F4ED',         // warm cream background
        paperRaised: '#FBF9F3',   // slightly lighter (for raised areas)
        ink: '#171717',            // headlines, high contrast
        text: '#2A2622',           // body text, warm-leaning
        muted: '#6B655B',          // secondary text
        rule: '#D8D2C4',           // hairline borders
        ruleLight: '#E5E0D4',      // even lighter hairline
        accent: '#0F4C3A',         // deep forest green
        accentHover: '#0A3527',    // darker on hover
        // Legacy aliases for safety
        navy: '#F7F4ED',
        cyan: '#0F4C3A',
        gold: '#0F4C3A',
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontVariationSettings: {
        'optical-32': "'opsz' 32",
        'optical-48': "'opsz' 48",
      },
      letterSpacing: {
        tightest: '-0.025em',
      },
    },
  },
  plugins: [],
};
