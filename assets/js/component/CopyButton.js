const copyHTML = ({ copyText, svgClass, textClass }) => `
<span class="${textClass}">${copyText}</span>
<svg xmlns="http://www.w3.org/2000/svg" class="${svgClass}">
  <use xlink:href="#octicon-copy" />
</svg>
`;

const copiedHTML = ({ svgClass, textClass }) => `
<span class="${textClass}">Copied!</span>
<svg xmlns="http://www.w3.org/2000/svg" class="${svgClass}">
  <use xlink:href="#octicon-check" />
</svg>
`;

const btnClass =
  "copy-button flex absolute opacity-0 transition-opacity ease-in-out px-2 py-1 text-fuchsia-50 hover:bg-fuchsia-950 hover:text-fuchsia-300 duration-300 text-sm";

export default function CopyButton({
  buttonText,
  add,
  size,
  onClick,
  className,
  textClass,
  copiedTextClass,
}) {
  const copyText = buttonText || "Copy";
  const classes = btnClass.split(" ");

  let svgClass;
  const textClasses = `hidden sm:flex pr-2 ${textClass}`.trim();
  const copiedTextClasses = `hidden sm:flex pr-2 ${copiedTextClass}`.trim();
  switch (size) {
    case "sm":
      svgClass = "w-4 h-4";
      break;
    default:
      svgClass = "w-5 h-5";
      break;
  }

  const copyRendered = copyHTML({ copyText, svgClass, textClass: textClasses });
  const button = document.createElement("button");
  button.ariaLabel = copyText;
  button.innerHTML = copyRendered;
  button.classList.add(...classes, ...className.split(" "));

  if (onClick) {
    button.addEventListener("click", () => {
      onClick();

      button.innerHTML = copiedHTML({ svgClass, textClass: copiedTextClasses });
      button.ariaLabel = copyText;
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
