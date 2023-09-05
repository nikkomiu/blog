import "./menu";

import katexAutoRender from 'katex/contrib/auto-render';

import { loadSearch } from "./search";
import { loadCodeActions } from "./code";

function onDocumentLoad() {
  loadSearch();
  loadCodeActions();
  katexAutoRender(document.body);
}

window.addEventListener("load", onDocumentLoad);
