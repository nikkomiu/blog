import katexAutoRender from "katex/contrib/auto-render";

window.addEventListener("load", () => katexAutoRender(document.body, {
  delimiters: [
    { left: "$$", right: "$$", display: true },
    { left: "$", right: "$", display: false },
  ],
}));
