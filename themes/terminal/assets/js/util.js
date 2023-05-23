export function loadScript(url, elementID) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`#${elementID}`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.id = elementID;

    script.onload = resolve;
    script.onerror = reject;

    document.body.appendChild(script);
  });
}
