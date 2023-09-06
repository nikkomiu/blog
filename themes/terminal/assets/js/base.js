import "./menu";

import katexAutoRender from 'katex/contrib/auto-render';

import { loadSearch } from "./search";
import { loadCodeActions } from "./code";

function onDocumentLoad() {
  loadSearch();
  loadCodeActions();
  katexAutoRender(document.body, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
  });
}

window.addEventListener("load", onDocumentLoad);
