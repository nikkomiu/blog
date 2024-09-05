export default function animate(element, animation, prefix = "animate__") {
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
