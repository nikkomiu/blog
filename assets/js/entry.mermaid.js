import mermaid from "mermaid";

let relativeTop = 0;
let relativeLeft = 0;

function mermaidDraggable(id) {
  const diagram = document.querySelector("#" + id);
  const container = diagram.parentElement;
  const diagramRect = diagram.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  let pos1 = 0;
  let pos2 = 0;
  let pos3 = 0;
  let pos4 = 0;

  container.style.position = "relative";
  container.style.marginInline = "auto";
  container.style.overflow = "hidden";
  container.style.height = diagramRect.height + 10 + "px";
  diagram.style.position = "absolute";
  diagram.style.left = (containerRect.width - diagramRect.width) / 2 + "px";
  diagram.style.top = (containerRect.height - diagramRect.height) / 2 + "px";

  function startDrag(e) {
    e.preventDefault();

    pos3 = e.clientX;
    pos4 = e.clientY;
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
  }

  function stopDrag() {
    startPos = null;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  }

  function onDrag(e) {
    // calculate delta
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    relativeTop += pos2;
    relativeLeft += pos1;

    const prevTop = +diagram.style.top.replace("px", "");
    const prevLeft = +diagram.style.left.replace("px", "");

    diagram.style.top = prevTop - pos2 + "px";
    diagram.style.left = prevLeft - pos1 + "px";
  }

  window.addEventListener("resize", function (e) {
    console.log("resize", e);
    const diagramRect = diagram.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    diagram.style.left =
      (containerRect.width - diagramRect.width - relativeLeft) / 2 + "px";
    diagram.style.top =
      (containerRect.height - diagramRect.height - relativeTop) / 2 + "px";
  });

  container.addEventListener("mousedown", startDrag);
}

function mermaidZoomable(id) {
  const diagram = document.querySelector("#" + id);
  const container = diagram.parentElement;

  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
      e.preventDefault();
    }
  }

  function handleTouchMove(e) {
    const factor =
      Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      ) * 0.01;

    const currentScale = Number(diagram.style.maxWidth.replace("px", ""));
    console.log("fac", factor, "scal", currentScale);

    diagram.style.maxWidth = currentScale - factor + "px";
  }

  function handleTouchEnd(e) {
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
  }

  container.addEventListener("touchstart", handleTouchStart);
}

function mermaidCallback(id) {
  mermaidDraggable(id);
  // mermaidZoomable(id)

  // TODO: add recenter button
  // TODO: add zoom in and out buttons
}

mermaid.initialize({
  theme: "base",
  themeVariables: {
    darkMode: true,
    fontFamily: "Hack, Monaco, Ubuntu Mono, Consolas, monospace",

    primaryColor: "#3b0764",
    secondaryColor: "#4a044e",
    tertiaryColor: "#262626",

    attributeBackgroundColorOdd: "#171717",
    attributeBackgroundColorEven: "#262626",

    lineColor: "#737373",
  },
});

mermaid.run({
  querySelector: ".mermaid",
  postRenderCallback: mermaidCallback,
});
