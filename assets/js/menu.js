import { animate } from "./util";

const menuSelector = ".mobile-menu";
const dropdownSelector = ".mobile-menu-dropdown";

async function showMenu(menu) {
  const dropdown = menu.querySelector(dropdownSelector);
  dropdown.classList.remove("hidden");
  await animate(dropdownSelector, ["fadeInDown", "faster"]);
}

async function hideMenu(menu, animated = true) {
  const dropdown = menu.querySelector(dropdownSelector);

  if (animated) {
    await animate(dropdownSelector, ["flipOutX", "faster"]);
  }

  dropdown.classList.add("hidden");
}

// Handle desktop menu
export function loadMenu() {
  document.querySelectorAll(menuSelector).forEach((menu) => {
    const trigger = menu.querySelector(".mobile-menu-trigger");
    const dropdown = menu.querySelector(dropdownSelector);

    trigger.addEventListener("click", async (e) => {
      e.stopPropagation();

      if (dropdown.classList.contains("hidden")) {
        showMenu(menu);
      } else {
        hideMenu(menu);
      }
    });

    dropdown.addEventListener("click", (e) => e.stopPropagation());
  });

  // Hide menus on body click
  document.body.addEventListener("click", () => {
    document.querySelectorAll(menuSelector).forEach((menu) => {
      const dropdown = menu.querySelector(dropdownSelector);
      if (!dropdown.classList.contains("hidden")) {
        hideMenu(menu);
      }
    });
  });

  // Reset menus on resize
  window.addEventListener("resize", () => {
    document.querySelectorAll(menuSelector).forEach((menu) => {
      const dropdown = menu.querySelector(dropdownSelector);
      if (!dropdown.classList.contains("hidden")) {
        hideMenu(menu, false);
      }
    });
  });
}
