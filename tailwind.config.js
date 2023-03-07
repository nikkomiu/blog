/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './{content,layouts}/**/*.{md,html,js}',
    './static/js/*.js',
    './node_modules/flowbite/**/*.js', // TODO remove this crappy solution
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('flowbite/plugin'),
  ],
};
