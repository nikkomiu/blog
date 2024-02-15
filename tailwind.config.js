/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./{content,layouts}/**/*.{md,html,js}",
    "./{assets,static}/js/*.js",
  ],
  theme: {
    fontFamily: {
      sans: [
        "Source Code Pro",
        "Monaco",
        "Ubuntu Mono",
        "Consolas",
        "monospace",
      ],
      serif: [
        "Source Code Pro",
        "Monaco",
        "Ubuntu Mono",
        "Consolas",
        "monospace",
      ],
    },
    extend: {
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
