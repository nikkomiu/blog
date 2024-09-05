import { loadScript } from "./util";

const pagefindUIID = "pagefind-ui-script";
const searchSelector = ".site-search";

const searchModalSelector = ".site-search-modal";

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
  const modal = document.querySelector(searchModalSelector);
  modal.classList.remove("hidden");
  modal.addEventListener("click", modelBackgroundClickHandler);
  document
    .querySelector(".site-search-close")
    .addEventListener("click", hideModal);

  const searchElement = document.querySelector(
    `${searchSelector} input[type="text"]`
  );
  if (searchElement) {
    searchElement.focus();
    searchElement.select();
  }
}

function hideModal() {
  document
    .querySelector(".site-search-close")
    .removeEventListener("click", hideModal);
  const modal = document.querySelector(searchModalSelector);
  modal.classList.add("animate__fadeOut");
  const handler = () => {
    modal.classList.add("hidden");
    modal.classList.remove("animate__fadeOut");
    modal.removeEventListener("animationend", handler);
  };

  modal.addEventListener("animationend", handler);
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

let backoff = 1000;

export async function loadSearch() {
  document.querySelectorAll("button.site-search-menu-toggle").forEach((ele) => {
    ele.addEventListener("click", showModal);
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
    new PagefindUI({ element: searchSelector });

    // Add search triggers
    document.addEventListener("keydown", toggleSearch);
  } catch (err) {
    loadSearchFailed(err);
    backoff *= 3;
    setTimeout(loadSearch, backoff);
  }
}
