const copyHTML = ({ copyText, svgClass, textClass }) => `
<svg xmlns="http://www.w3.org/2000/svg" class="${svgClass}">
  <use xlink:href="#hi-clipboard-document-list" />
</svg>
<span class="${textClass}">${copyText}</span>
`;

const copiedHTML = ({ svgClass, textClass }) => `
<svg xmlns="http://www.w3.org/2000/svg" class="${svgClass}">
  <use xlink:href="#hi-clipboard-document-check" />
</svg>
<span class="${textClass}">Copied!</span>
`;

const btnClass =
  "copy-button flex absolute opacity-0 transition-opacity ease-in-out px-2 py-1 text-fuchsia-50 hover:bg-fuchsia-950 hover:text-fuchsia-300 duration-300";

export default function CopyButton({
  buttonText,
  add,
  size,
  onClick,
  className,
}) {
  const copyText = buttonText || "Copy";
  const classes = btnClass.split(" ");

  let svgClass;
  const textClass = "hidden sm:flex";
  switch (size) {
    case "sm":
      svgClass = "w-4 h-4 mr-1";
      classes.push("text-sm")
      break;
    default:
      svgClass = "w-6 h-6 mr-2";
      break;
  }

  const copyRendered = copyHTML({ copyText, svgClass, textClass });
  const button = document.createElement("button");
  button.innerHTML = copyRendered;
  button.classList.add(...classes, ...className.split(" "));

  if (onClick) {
    button.addEventListener("click", () => {
      onClick();

      button.innerHTML = copiedHTML({ svgClass, textClass });
      button.classList.add("active");
      setTimeout(() => {
        button.classList.remove("active");
      }, 2600);
      setTimeout(() => {
        button.innerHTML = copyRendered;
      }, 3000);
    });
  }

  add(button);
}
