import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fdf8f3",
          100: "#FAEEDA",
          200: "#FAC775",
          400: "#EF9F27",
          500: "#BA7517",
          600: "#854F0B",
          700: "#633806",
          800: "#412402",
        },
      },
      borderRadius: {
        xl:  "16px",
        "2xl": "20px",
      },
      fontFamily: {
        sans:  ["var(--font-inter)", "Georgia", "system-ui", "sans-serif"],
        serif: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
