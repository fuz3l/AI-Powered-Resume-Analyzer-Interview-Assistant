import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FBFBFA",
        surface: "#FFFFFF",
        charcoal: "#111111",
        muted: "#787774",
        borderline: "#EAEAEA",
        pastel: {
          red: "#FDEBEC",
          "red-text": "#9F2F2D",
          blue: "#E1F3FE",
          "blue-text": "#1F6C9F",
          green: "#EDF3EC",
          "green-text": "#346538",
          yellow: "#FBF3DB",
          "yellow-text": "#956400",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"Geist Sans"',
          '"Helvetica Neue"',
          "sans-serif",
        ],
        serif: [
          '"Newsreader"',
          '"Playfair Display"',
          '"Instrument Serif"',
          "Georgia",
          "serif",
        ],
        mono: [
          '"Geist Mono"',
          '"SF Mono"',
          '"JetBrains Mono"',
          "monospace",
        ],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.02em",
      },
    },
  },
  plugins: [],
};
export default config;
