/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Merriweather", "serif"],
        display: ["Cormorant", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      colors: {
        // Basfärger styrs till stor del via CSS-variabler per tema (kommer i vår global.css)
        brand: {
          DEFAULT: "var(--brand, #8b1e2d)", // mörkröd accent
          fg: "var(--brand-fg, #ffffff)",
          muted: "var(--brand-muted, #5a0f18)"
        },
        surface: {
          DEFAULT: "var(--surface, #0f0f10)",
          alt: "var(--surface-alt, #171718)",
          paper: "var(--surface-paper, #f3ead7)"
        },
        text: {
          DEFAULT: "var(--text, #eaeaea)",
          muted: "var(--text-muted, #b3b3b3)"
        }
      },
      boxShadow: {
        soft: "0 6px 24px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.08)"
      },
      borderRadius: {
        xl2: "1rem",
        xl3: "1.25rem"
      }
    }
  },
  plugins: []
};