export function loadScript(url, elementID) {
  return new Promise((resolve, reject) => {
    const ele = document.querySelector(`#${elementID}`);
    if (ele?.hasAttribute("data-ok")) {
      resolve();
      return;
    }
    ele?.remove();

    const script = document.createElement("script");
    script.src = url;
    script.id = elementID;

    script.onerror = reject;
    script.onload = () => {
      script.setAttribute("data-ok", "true");
      resolve();
    };

    document.body.appendChild(script);
  });
}
