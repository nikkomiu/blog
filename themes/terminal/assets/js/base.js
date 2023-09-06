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

function onDocumentLoad() {
  loadSearch();
  loadCodeActions();

  katexAutoRender(document.body, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
  });

  getUserInfo();
}

window.addEventListener("load", onDocumentLoad);
