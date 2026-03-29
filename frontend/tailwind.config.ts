import type { Config } from "tailwindcss"
import tailwindcssAnimate from "tailwindcss-animate"

const config: Config = {
  darkMode: "class",
  content: [
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Surfaces
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // Interactive
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        // Utility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Rarity tiers
        "rarity-common": "#9CA3AF",
        "rarity-uncommon": "#10B981",
        "rarity-rare": "#3B82F6",
        "rarity-epic": "#A855F7",
        "rarity-legendary": "#F59E0B",
        // Branch colors
        "branch-educator": "#10B981",
        "branch-builder": "#3B82F6",
        "branch-creator": "#EC4899",
        "branch-scout": "#06B6D4",
        "branch-diplomat": "#F59E0B",
        // Extended
        "neon-cyan": "#06B6D4",
        "hot-pink": "#EC4899",
        "legendary-gold": "#F59E0B",
      },
      fontFamily: {
        display: ["var(--font-display)", "monospace"],
        heading: ["var(--font-heading)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-hero": "var(--gradient-hero)",
        "gradient-score-card": "var(--gradient-score-card)",
        "gradient-legendary": "var(--gradient-legendary)",
        "gradient-crt": "var(--gradient-crt-scanline)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 8px hsl(var(--primary) / 0.4)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.8)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "counter-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 1.5s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "counter-up": "counter-up 0.3s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
