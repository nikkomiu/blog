import katexAutoRender from "katex/contrib/auto-render";

window.addEventListener("load", function () {
  katexAutoRender(document.body, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
  });
});
