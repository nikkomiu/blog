const { default: CopyButton } = require("js/component/CopyButton");

export function loadTableActions() {
  document.querySelectorAll('.prose table').forEach(el => CopyButton({
    add: (btn) => el.prepend(btn),
    onClick: () => {
      console.log(el);
    }
  }));
}
