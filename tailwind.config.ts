import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Container configuration for consistent content width
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
        "2xl": "3rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
      },
    },
    // Enhanced breakpoints for better responsive control
    screens: {
      xs: "475px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      // Color System - Semantic tokens
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
        // IMSAM Brand Colors
        mint: {
          DEFAULT: "hsl(var(--mint))",
          light: "hsl(159 100% 80%)",
          dark: "hsl(159 100% 35%)",
        },
        navy: {
          DEFAULT: "hsl(var(--navy))",
          light: "hsl(220 55% 15%)",
          dark: "hsl(220 55% 4%)",
        },
        "soft-blue": {
          DEFAULT: "hsl(var(--soft-blue))",
          light: "hsl(217 100% 90%)",
          dark: "hsl(217 100% 70%)",
        },
      },
      // Border Radius Scale
      borderRadius: {
        none: "0",
        sm: "0.25rem",    // 4px
        DEFAULT: "0.5rem", // 8px
        md: "0.75rem",     // 12px
        lg: "1rem",        // 16px
        xl: "1.25rem",     // 20px
        "2xl": "1.5rem",   // 24px
        "3xl": "2rem",     // 32px
        full: "9999px",
      },
      // Typography Scale
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],      // 12px
        sm: ["0.875rem", { lineHeight: "1.25rem" }],  // 14px
        base: ["1rem", { lineHeight: "1.5rem" }],     // 16px
        lg: ["1.125rem", { lineHeight: "1.75rem" }],  // 18px
        xl: ["1.25rem", { lineHeight: "1.75rem" }],   // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }],    // 24px
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }], // 36px
        "5xl": ["3rem", { lineHeight: "1.16" }],      // 48px
        "6xl": ["3.75rem", { lineHeight: "1.2" }],    // 60px
        "7xl": ["4.5rem", { lineHeight: "1.16" }],    // 72px
        "8xl": ["6rem", { lineHeight: "1.16" }],      // 96px
      },
      // Spacing Scale - Enhanced for better control
      spacing: {
        18: "4.5rem",   // 72px
        22: "5.5rem",   // 88px
        26: "6.5rem",   // 104px
        30: "7.5rem",   // 120px
        34: "8.5rem",   // 136px
        38: "9.5rem",   // 152px
        42: "10.5rem",  // 168px
        128: "32rem",   // 512px
        144: "36rem",   // 576px
      },
      // Animation System
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        "voice-wave": {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "voice-wave": "voice-wave 1s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "slide-up": "slide-up 0.4s ease-out",
        "slide-down": "slide-down 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        shimmer: "shimmer 2s infinite linear",
      },
      // Shadow System
      boxShadow: {
        sm: "0 2px 8px hsl(var(--shadow-sm))",
        DEFAULT: "0 4px 16px hsl(var(--shadow-md))",
        md: "0 8px 32px hsl(var(--shadow-md))",
        lg: "0 16px 64px hsl(var(--shadow-lg))",
        xl: "0 24px 80px hsl(var(--shadow-lg))",
        mint: "0 8px 40px hsl(159 100% 44% / 0.25)",
        "mint-lg": "0 12px 60px hsl(159 100% 44% / 0.35)",
        glow: "0 0 60px hsl(159 100% 44% / 0.3)",
        "glow-lg": "0 0 100px hsl(159 100% 44% / 0.4)",
        inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
      },
      // Transition System
      transitionDuration: {
        DEFAULT: "200ms",
        fast: "150ms",
        slow: "300ms",
      },
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      // Z-index Scale
      zIndex: {
        dropdown: "1000",
        sticky: "1020",
        fixed: "1030",
        modal: "1040",
        popover: "1050",
        tooltip: "1060",
      },
      // Touch Target Sizes (min 44x44px for better mobile UX)
      minHeight: {
        touch: "44px",
        "touch-lg": "56px",
      },
      minWidth: {
        touch: "44px",
        "touch-lg": "56px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
