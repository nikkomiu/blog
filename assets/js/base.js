import * as Turbo from "@hotwired/turbo";
import katexAutoRender from "katex/contrib/auto-render";

import "./menu";

import { loadSearch } from "./search";
import { displayLanguageTabs, loadCodeActions } from "./code";

// Add event listeners to expand/collapse sections
function sectionExpandToggle() {
  document.querySelectorAll("button.section-title").forEach((button) => {
    button.addEventListener("click", (event) => {
      const section = event.target.closest("section");
      section.classList.toggle("open");
    });
  });
}

// Load elements that are carried over between page loads
function onDocumentLoad() {
  loadSearch();
}

function onPageLoad() {
  loadCodeActions();

  katexAutoRender(document.body, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
  });

  displayLanguageTabs();
  sectionExpandToggle();
}

window.addEventListener('load', onDocumentLoad);
window.addEventListener("turbo:load", onPageLoad);
