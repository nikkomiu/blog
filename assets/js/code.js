const langMapping = {
  cpp: "c++",
  cs: "c#",
};

const shellLangs = [];
const shellCommandPrefix = ["$", "#"];

const copyHTML = `
<svg xmlns="http://www.w3.org/2000/svg">
  <use xlink:href="#hi-clipboard-document-list" />
</svg>
<span>Copy</span>
`;

const copiedHTML = `
<svg xmlns="http://www.w3.org/2000/svg">
  <use xlink:href="#hi-clipboard-document-check" />
</svg>
<span>Copied!</span>
`;

export function loadCodeActions() {
  document.querySelectorAll(".highlight code[data-lang]").forEach((el) => {
    const button = document.createElement("button");
    button.innerHTML = copyHTML;
    button.classList.add("copy-button");
    button.addEventListener("click", () => {
      let clipText = el.innerText.replace(/\n\n/g, "\n");
      if (shellLangs.indexOf(el.dataset.lang) >= 0) {
        let appendToPrev = false;
        clipText = clipText.split("\n").reduce((prev, cur) => {
          let curTrim = cur.trim();
          const cmdPrefix = shellCommandPrefix.indexOf(curTrim[0]);
          if (!appendToPrev && (curTrim.length === 0 || cmdPrefix === -1)) {
            return prev;
          }
          appendToPrev = false;

          // if the last char of the line is a \ the command continues to the next line
          if (curTrim[curTrim.length - 1] === "\\") {
            appendToPrev = true;
          }

          if (cmdPrefix >= 0) {
            curTrim = curTrim.replace(shellCommandPrefix[cmdPrefix], "").trim();
          }

          if (!prev) {
            return curTrim;
          }

          return [prev, curTrim].join("\n");
        }, "");
      }

      navigator.clipboard.writeText(clipText);
      button.innerHTML = copiedHTML;
      button.classList.add("active");
      setTimeout(() => {
        button.classList.remove("active");
      }, 2600);
      setTimeout(() => {
        button.innerHTML = copyHTML;
      }, 3000);
    });

    el.parentNode.insertBefore(button, el);
  });
}

export function displayLanguageTabs() {
  document.querySelectorAll("code[data-lang]").forEach((code) => {
    const lang = code.dataset.lang;
    if (!lang || lang === "text") {
      return;
    }

    const tab = document.createElement("span");
    tab.classList.add("lang-tab");
    tab.innerText = langMapping[lang] || lang;

    const parentPre = code.closest("pre");
    if (!parentPre) {
      return;
    }

    parentPre.parentElement.insertBefore(tab, parentPre);
  });
}
