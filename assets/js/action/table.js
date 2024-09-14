import CopyButton from "js/component/CopyButton";

function tableToCSV(tableEl) {
  return [...tableEl.querySelectorAll("tr")]
    .map((row) => {
      return [...row.querySelectorAll("td,th")]
        .map((col) => {
          if (col.innerText.includes(",")) {
            return `"${col.innerText}"`;
          } else {
            return col.innerText;
          }
        })
        .join(",");
    })
    .join("\n");
}

export function loadTableActions() {
  document.querySelectorAll(".prose table").forEach((el) => {
    // Ignore tables within highlight blocks
    if (el.closest(".highlight")) {
      return;
    }

    // wrap the table in a div
    const wrapper = document.createElement("div");
    wrapper.classList.add("table-wrapper", "relative");
    wrapper.appendChild(el.cloneNode(true));
    el.parentElement.replaceChild(wrapper, el);

    CopyButton({
      buttonText: "Copy CSV",
      size: "sm",
      className: "bottom-[-1.85rem] right-0",
      add: (btn) => wrapper.append(btn),
      onClick: () => navigator.clipboard.writeText(tableToCSV(el)),
    });
  });
}
