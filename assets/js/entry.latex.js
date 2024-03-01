import katexAutoRender from "katex/contrib/auto-render";

function onPageLoad() {
  katexAutoRender(document.body, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
  });
}

window.addEventListener("turbo:load", onPageLoad);
