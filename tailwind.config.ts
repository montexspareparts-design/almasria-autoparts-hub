import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        cairo: ["Cairo", "sans-serif"],
        body: ['"IBM Plex Sans Arabic"', "Cairo", "sans-serif"],
        heading: ["Cairo", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "dark-section": "hsl(var(--section-dark))",
        "dark-section-foreground": "hsl(var(--section-dark-foreground))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(-30px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "shimmer-gold": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "section-enter": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.995)", filter: "blur(2px)" },
          "60%": { opacity: "1", filter: "blur(0)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)", filter: "blur(0)" },
        },
        "skeleton-shimmer": {
          "100%": { transform: "translateX(100%)" },
        },
        // === ProductCard new animations ===
        "card-enter": {
          "0%": { opacity: "0", transform: "translateY(18px) scale(0.96)" },
          "60%": { opacity: "1" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "stock-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.35)", opacity: "0.85" },
        },
        "brand-slide-in": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "coverage-shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "60%, 100%": { backgroundPosition: "-200% 0" },
        },
        "price-glow": {
          "0%": { opacity: "0", transform: "translateY(6px) scale(0.92)", filter: "blur(4px)" },
          "60%": { textShadow: "0 0 18px hsl(var(--primary) / 0.55)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)", filter: "blur(0)", textShadow: "0 0 0 transparent" },
        },
        "cart-bounce": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "30%": { transform: "translateY(-3px) rotate(-8deg)" },
          "60%": { transform: "translateY(0) rotate(6deg)" },
        },
        "burst-particle": {
          "0%": { opacity: "1", transform: "translate(0,0) scale(1)" },
          "100%": { opacity: "0", transform: "var(--burst-end, translate(0,-22px)) scale(0.4)" },
        },
        "checkmark-pop": {
          "0%": { opacity: "0", transform: "scale(0.3) rotate(-25deg)" },
          "60%": { opacity: "1", transform: "scale(1.15) rotate(0deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
        },
        "sidebar-indicator": {
          "0%": { transform: "scaleY(0)", opacity: "0" },
          "100%": { transform: "scaleY(1)", opacity: "1" },
        },
        "digit-flip": {
          "0%": { transform: "rotateX(-90deg)", opacity: "0" },
          "55%": { transform: "rotateX(15deg)", opacity: "1" },
          "100%": { transform: "rotateX(0deg)", opacity: "1" },
        },
        "price-highlight": {
          "0%": { backgroundPosition: "200% 0", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { backgroundPosition: "-200% 0", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "slide-in-right": "slide-in-right 0.6s ease-out forwards",
        "shimmer-gold": "shimmer-gold 2.5s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "section-enter": "section-enter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "skeleton-shimmer": "skeleton-shimmer 1.6s infinite",
        "card-enter": "card-enter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "stock-pulse": "stock-pulse 1.6s ease-in-out infinite",
        "brand-slide-in": "brand-slide-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both",
        "coverage-shimmer": "coverage-shimmer 3s ease-in-out infinite",
        "price-glow": "price-glow 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "cart-bounce": "cart-bounce 0.6s ease-in-out",
        "burst-particle": "burst-particle 0.7s ease-out forwards",
        "checkmark-pop": "checkmark-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "sidebar-indicator": "sidebar-indicator 0.25s ease-out both",
        "digit-flip": "digit-flip 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "price-highlight": "price-highlight 1.1s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
