/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./{content,layouts}/**/*.{md,html,js}",
    "./{assets,static}/js/*.js",
  ],
  theme: {
    fontFamily: {
      sans: ["Fira Code", "Monaco", "Ubuntu Mono", "Consolas", "monospace"],
      serif: ["Fira Code", "Monaco", "Ubuntu Mono", "Consolas", "monospace"],
    },
    extend: {
      colors: {
        primary: "#ee72f1",
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            "--tw-prose-headings": theme("colors.fuchsia[500]"),
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
