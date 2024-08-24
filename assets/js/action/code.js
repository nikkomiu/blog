import CopyButton from "js/component/CopyButton";

const langMapping = {
  cpp: "c++",
  cs: "c#",
};

export function loadCodeActions() {
  document.querySelectorAll(".highlight code[data-lang]").forEach((el) =>
    // TODO: add dropdown copy w/ copy diff, copy previous when add_lines or rem_lines
    CopyButton({
      className: "top-0 right-0 mt-2 mr-2",
      add: (btn) => el.parentNode.insertBefore(btn, el),
      onClick: () => {
        let clipText = el.innerText.replace(/\n\n/g, "\n");
        // TODO: remove lines from "rem_lines" on .highlight
        navigator.clipboard.writeText(clipText);
      },
    })
  );
}

function linesToArr(linesStr) {
  return linesStr.split(" ").flatMap(v => {
    // TODO: check for 1-2

    // if the value is a comma-separated list convert to number array
    if (v.includes(",")) {
      return v.split(",").map(cv => +cv)
    }

    // return the value as a number
    return +v
  })
}

function reparentCodeTableNumber(elem) {
  const newParent = document.createElement("span")
  const newChild = elem.cloneNode(true)
  newChild.style.color = null
  newParent.appendChild(newChild)

  elem.parentNode.replaceChild(newParent, elem)
  return newParent
}

function highlightLines(parent, addLines, remLines, isTableNum = false) {
  const lineElems = parent.querySelectorAll("code > span")
  addLines.forEach(l => {
    let elem = lineElems[l-1]
    if (isTableNum) {
      // Table num elements need to be reparented
      elem = reparentCodeTableNumber(lineElems[l-1])
    }

    elem.classList.add("bg-green-950", "text-green-500")
  })

  remLines.forEach(l => {
    let elem = lineElems[l-1]
    if (isTableNum) {
      // Table num elements need to be reparented
      elem = reparentCodeTableNumber(lineElems[l-1])
    }

    elem.classList.add("bg-red-950", "text-red-500")
  })
}

export function displayLanguageTabs() {
  // Highlight add_lines and rem_lines
  document.querySelectorAll(".highlight[add_lines],.highlight[rem_lines]").forEach(highlight => {
    const addLines = linesToArr(highlight.getAttribute("add_lines"))
    const remLines = linesToArr(highlight.getAttribute("rem_lines"))

    if (highlight.querySelector('table')) {
      const tdElems = highlight.querySelectorAll("td")
      highlightLines(tdElems[0], addLines, remLines, true)
      highlightLines(tdElems[1], addLines, remLines)
    } else {
      highlightLines(highlight, addLines, remLines)
    }
  })

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
