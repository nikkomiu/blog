module.exports = (ctx) => ({
  map: ctx.options.map,
  plugins: {
    "postcss-import": {},
    tailwindcss: {},
    autoprefixer: {},
  },
});
