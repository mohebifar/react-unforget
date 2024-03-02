/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./theme.config.jsx",
    "./pages/**/*.{js,jsx,ts,tsx,md,mdx}",
    "./components/**/*.{js,jsx,ts,tsx,md,mdx}",
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        beforeAfterCodingBlocks:
          "minmax(0, 1fr) minmax(0, 1rem) minmax(0, 1fr);",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    base: false,
    themes: ["synthwave"],
  },
  darkMode: "class",
};
