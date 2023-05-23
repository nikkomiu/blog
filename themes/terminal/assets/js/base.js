import "./menu";

import { loadSearch } from "./search";
import { loadCodeActions } from "./code";

function onDocumentLoad() {
  loadSearch();
  loadCodeActions();
}

window.addEventListener("load", onDocumentLoad);
