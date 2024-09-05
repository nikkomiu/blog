import { animate, loadScript } from "./util";

const pagefindUIID = "pagefind-ui-script";
const searchSelector = ".site-search";

const searchModalSelector = ".site-search-modal";

let backoff = 1000;

function toggleSearch(e) {
  if (e.key === "Escape") {
    e.preventDefault();

    hideModal();
  }

  if ((e.ctrlKey || e.metaKey) && e.keyCode === "K".charCodeAt(0)) {
    e.preventDefault();

    showModal();
  }
}

function modelBackgroundClickHandler(event) {
  if (document.querySelector(searchModalSelector) !== event.target) {
    return;
  }

  hideModal();
}

function showModal() {
  document.querySelector("body").classList.add("modal-open");
  document.querySelector(searchModalSelector).classList.remove("hidden");
  animate(searchModalSelector, "fadeIn");

  const searchElement = document.querySelector(
    `${searchSelector} input[type="text"]`
  );
  if (searchElement) {
    searchElement.focus();
    searchElement.select();
  }
}

async function hideModal() {
  await animate(searchModalSelector, ["fadeOut", "faster"]);
  document.querySelector(searchModalSelector).classList.add("hidden");
  document.querySelector("body").classList.remove("modal-open");
}

function loadSearchFailed(err) {
  console.warn(`failed to load search: ${err}`);

  document.querySelector(searchSelector).innerHTML = `
    <div class="flex flex-col w-full bg-red-950/50 text-red-500 px-2 place-content-around border-2 border-red-900">
      <p class="m-0">Search is currently unavailable.</p>
      <p class="m-0 text-sm">Please try again later.</p>
    </div>
  `;
}

export async function loadSearch() {
  document.querySelectorAll(".site-search-menu-toggle").forEach((ele) => {
    if (ele.nodeName === "BUTTON") {
      ele.addEventListener("click", showModal);
    }

    ele.classList.remove("hidden");
  });

  try {
    // Load search
    await loadScript("/pagefind/pagefind-ui.js", pagefindUIID);

    const searchElement = document.querySelector(searchSelector);
    if (!searchElement) {
      console.warn(`Could not find search selector: "${searchSelector}"`);
      return;
    }

    // Enable search
    searchElement.innerHTML = "";
    new PagefindUI({
      element: searchSelector,
      showEmptyFilters: false,
      showImages: false,
    });

    // Add search triggers
    document.addEventListener("keydown", toggleSearch);
    document
      .querySelector(searchModalSelector)
      .addEventListener("click", modelBackgroundClickHandler);
    document
      .querySelector(".site-search-close")
      .addEventListener("click", hideModal);
  } catch (err) {
    loadSearchFailed(err);
    backoff *= 3;
    setTimeout(loadSearch, backoff);
  }
}
