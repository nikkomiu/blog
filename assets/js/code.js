const langMapping = {
  cpp: "C++",
  cs: "C#",
};

export function loadCodeActions() {
  document.querySelectorAll(".highlight code[data-lang]").forEach((el) => {
    console.log(el);
    const button = document.createElement("button");
    button.innerText = "Copy";
    button.classList.add("copy-button");
    button.addEventListener("click", () => {
      navigator.clipboard.writeText(el.innerText.replace(/\n\n/g, "\n"));
      button.innerText = "Copied!";
      button.classList.add("active");
      setTimeout(() => {
        button.classList.remove("active");
      }, 2600);
      setTimeout(() => {
        button.innerText = "Copy";
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
