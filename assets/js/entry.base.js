import "@hotwired/turbo";

import { displayLanguageTabs, loadCodeActions } from "./code";
import { loadMenu } from "./menu";
import { loadSearch } from "./search";

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
  const searchClearButton = document.querySelector(
    ".pagefind-ui__search-clear"
  );
  if (searchClearButton) {
    searchClearButton.click();
  }

  loadMenu();

  loadCodeActions();

  displayLanguageTabs();
  sectionExpandToggle();
}

window.addEventListener("load", onDocumentLoad);
window.addEventListener("turbo:load", onPageLoad);
