/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#0B0D11",
          subtle: "#101216",
          surface: "#14171D",
        },
        glass: {
          surface: "rgba(18, 20, 24, 0.72)",
          subtle: "rgba(255, 255, 255, 0.03)",
          active: "rgba(255, 255, 255, 0.08)",
          border: "rgba(255, 255, 255, 0.10)",
          borderSubtle: "rgba(255, 255, 255, 0.06)",
        },
        text: {
          primary: "#EAEAEA",
          secondary: "#B8B8B8",
          muted: "#757575",
          subtle: "#505050",
        },
        accent: {
          chrome: "#E0E0E0",
          metallic: "#888888",
          border: "#444444",
        },
        status: {
          healthy: "#10B981",
          warning: "#F59E0B",
          critical: "#EF4444",
          info: "#3B82F6",
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        full: '9999px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Anthropic Serif"', 'Newsreader', '"Times New Roman"', 'serif'],
        'serif-heading': ['"Anthropic Serif"', 'Newsreader', '"Times New Roman"', 'serif'],
        'serif-body': ['"Times New Roman"', 'Times', 'serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glass': '0 16px 45px -10px rgba(0, 0, 0, 0.85), 0 3px 12px -2px rgba(0, 0, 0, 0.60)',
        'card': '0 6px 24px -4px rgba(0, 0, 0, 0.70), 0 1px 4px 0 rgba(0, 0, 0, 0.40)',
        'panel': '0 12px 36px -8px rgba(0, 0, 0, 0.65), 0 2px 10px -2px rgba(0, 0, 0, 0.40)',
        'inset-highlight': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)',
      },
    },
  },
  plugins: [],
}
