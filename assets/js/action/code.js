import CopyButton from "js/component/CopyButton";

const langMapping = {
  cpp: "c++",
  cs: "c#",
};

export function loadCodeActions() {
  document.querySelectorAll(".highlight code[data-lang]").forEach((el) =>
    CopyButton({
      add: (btn) => el.parentNode.insertBefore(btn, el),
      onClick: () => {
        let clipText = el.innerText.replace(/\n\n/g, "\n");
        navigator.clipboard.writeText(clipText);
      },
    })
  );
}

export function displayLanguageTabs() {
  // Set file header if the "file" property is on the code block
  document.querySelectorAll(".highlight[file]").forEach((highlight) => {
    const fileName = highlight.getAttribute("file");
    const elem = document.createElement("span");
    elem.classList.add("file-tab");
    elem.innerText = fileName;

    highlight.appendChild(elem);
  });

  // Set the language if the code has the "data-lang" property
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

    if (parentPre.parentElement.getAttribute("file")) {
      return;
    }

    parentPre.parentElement.insertBefore(tab, parentPre);
  });
}
