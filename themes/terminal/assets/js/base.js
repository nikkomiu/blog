import "./menu";

import katexAutoRender from 'katex/contrib/auto-render';

import { loadSearch } from "./search";
import { displayLanguageTabs, loadCodeActions } from "./code";
import { displayUserInfo } from './user';

function sectionExpandToggle() {
  document.querySelectorAll('button.section-title').forEach((button) => {
    button.addEventListener('click', (event) => {
      console.log('yay')
      const section = event.target.closest('section');
      section.classList.toggle('open');
    });
  });
}

function onDocumentLoad() {
  loadSearch();
  loadCodeActions();

  katexAutoRender(document.body, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
  });

  displayLanguageTabs();
  sectionExpandToggle();
  displayUserInfo();
}

window.addEventListener("load", onDocumentLoad);
