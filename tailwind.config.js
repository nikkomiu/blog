/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./{content,layouts}/**/*.{md,html,js}",
    "./{assets,static}/js/*.js",
  ],
  theme: {
    fontFamily: {
      sans: ["Hack", "Monaco", "Ubuntu Mono", "Consolas", "monospace"],
      serif: ["Hack", "Monaco", "Ubuntu Mono", "Consolas", "monospace"],
      mono: ["Hack", "Monaco", "Ubuntu Mono", "Consolas", "monospace"],
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
