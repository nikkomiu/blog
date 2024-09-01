/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./{content,layouts}/**/*.{md,html,js}",
    "./{assets,static}/js/**/*.js",
  ],
  theme: {
    fontFamily: {
      sans: ["Hack", "Monaco", "Ubuntu Mono", "Consolas", "monospace"],
      serif: ["Hack", "Monaco", "Ubuntu Mono", "Consolas", "monospace"],
      mono: ["Hack", "Monaco", "Ubuntu Mono", "Consolas", "monospace"],
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
