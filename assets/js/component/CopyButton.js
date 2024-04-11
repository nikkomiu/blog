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

const btnClass =
  "copy-button flex absolute top-0 right-0 mt-2 mr-2 opacity-0 transition-opacity ease-in-out px-2 py-1 text-fuchsia-50 hover:bg-fuchsia-950 hover:text-fuchsia-300 duration-300";

export default function CopyButton({ add, onClick }) {
  const button = document.createElement("button");
  button.innerHTML = copyHTML;
  button.classList.add(...btnClass.split(" "));

  if (onClick) {
    button.addEventListener("click", () => {
      onClick();

      button.innerHTML = copiedHTML;
      button.classList.add("active");
      setTimeout(() => {
        button.classList.remove("active");
      }, 2600);
      setTimeout(() => {
        button.innerHTML = copyHTML;
      }, 3000);
    });
  }

  add(button);
}
