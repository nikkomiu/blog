const container = document.querySelector(".container");
const menuSelector = ".menu";

// Handle desktop menu
export function loadMenu() {
  document.querySelectorAll(menuSelector).forEach((menu) => {
    const trigger = menu.querySelector(".menu__trigger");
    const dropdown = menu.querySelector(".menu__dropdown");

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();

      if (menu.classList.contains("open")) {
        menu.classList.remove("open");
      } else {
        // Close all menus...
        document.querySelectorAll(menuSelector).forEach((m) => m.classList.remove("open"));
        // ...before opening the current one
        menu.classList.add("open");
      }

      if (
        dropdown.getBoundingClientRect().right >
        container.getBoundingClientRect().right
      ) {
        dropdown.style.left = "auto";
        dropdown.style.right = 0;
      }
    });

    dropdown.addEventListener("click", (e) => e.stopPropagation());
  });

  // Hide menus on body click
  document.body.addEventListener("click", () => {
    document.querySelectorAll(menuSelector).forEach((menu) => {
      if (menu.classList.contains("open")) {
        menu.classList.remove("open");
      }
    });
  });

  // Reset menus on resize
  window.addEventListener("resize", () => {
    document.querySelectorAll(menuSelector).forEach((menu) => {
      menu.classList.remove("open");
    });
  });
}
