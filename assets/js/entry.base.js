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

function onPageLoad() {
  loadSearch();

  loadMenu();

  loadCodeActions();

  displayLanguageTabs();
  sectionExpandToggle();
}

window.addEventListener("load", onPageLoad);
