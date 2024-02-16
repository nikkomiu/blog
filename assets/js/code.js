const langMapping = {
  cpp: "C++",
  cs: "C#",
};

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
    console.log(el);
    const button = document.createElement("button");
    button.innerHTML = copyHTML;
    button.classList.add("copy-button");
    button.addEventListener("click", () => {
      navigator.clipboard.writeText(el.innerText.replace(/\n\n/g, "\n"));
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
