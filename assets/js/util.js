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

export function animate(element, animation, prefix = "animate__") {
  return new Promise((resolve) => {
    const classes = [`${prefix}animated`];
    if (Array.isArray(animation)) {
      classes.push(...animation.map((anim) => `${prefix}${anim}`));
    } else {
      classes.push(`${prefix}${animation}`);
    }

    const node = document.querySelector(element);
    node.classList.add(...classes);

    function handleAnimationEnd(event) {
      event.stopPropagation();
      node.classList.remove(...classes);
      resolve();
    }

    node.addEventListener("animationend", handleAnimationEnd, { once: true });
  });
}
