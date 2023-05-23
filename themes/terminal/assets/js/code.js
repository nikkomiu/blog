export function loadCodeActions() {
  document.querySelectorAll(".highlight pre code").forEach((el) => {
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
