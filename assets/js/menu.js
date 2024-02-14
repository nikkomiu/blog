const menuSelector = ".mobile-menu";
const dropdownSelector = ".mobile-menu-dropdown";

// Handle desktop menu
export function loadMenu() {
  document.querySelectorAll(menuSelector).forEach((menu) => {
    const trigger = menu.querySelector(".mobile-menu-trigger");
    const dropdown = menu.querySelector(dropdownSelector);

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();

      dropdown.classList.toggle("hidden");
    });

    dropdown.addEventListener("click", (e) => e.stopPropagation());
  });

  // Hide menus on body click
  document.body.addEventListener("click", () => {
    document.querySelectorAll(menuSelector).forEach((menu) => {
      const dropdown = menu.querySelector(dropdownSelector);
      if (!dropdown.classList.contains("hidden")) {
        dropdown.classList.add("hidden");
      }
    });
  });

  // Reset menus on resize
  window.addEventListener("resize", () => {
    document.querySelectorAll(menuSelector).forEach((menu) => {
      const dropdown = menu.querySelector(dropdownSelector);
      if (!dropdown.classList.contains("hidden")) {
        dropdown.classList.add("hidden");
      }
    });
  });
}
