import mermaid from "mermaid";

function onPageLoad() {
  mermaid.initialize({ startOnLoad: true });
}

window.addEventListener("load", onPageLoad);
