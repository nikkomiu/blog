import "./menu";

import katexAutoRender from 'katex/contrib/auto-render';

import { loadSearch } from "./search";
import { loadCodeActions } from "./code";

async function getUserInfo() {
  const resp = await fetch("/.auth/me");
  const { clientPrincipal } = await resp.json();

  document.querySelector('.footer .user-info').innerHTML = `
    <div class="user-name">
      Currently signed in as ${clientPrincipal.userDetails}
    </div>
    <a href="/.auth/logout" class="logout">
      Sign Out
    </a>
  `;
}

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

  sectionExpandToggle();
  getUserInfo();
}

window.addEventListener("load", onDocumentLoad);
