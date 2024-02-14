import { loadScript } from "./util";

const pagefindUIID = "pagefind-ui-script";
const searchSelector = ".site-search";

function toggleSearch(e) {
  if ((e.ctrlKey || e.metaKey) && e.keyCode === "K".charCodeAt(0)) {
    e.preventDefault();

    const searchElement = document.querySelector(
      `${searchSelector} input[type="text"]`
    );
    if (searchElement) {
      searchElement.focus();
    }
  }
}

function loadSearchFailed(err) {
  console.warn(`failed to load search: ${err}`);

  document.querySelector(searchSelector).innerHTML = `
    <div class="flex flex-col w-full bg-red-800 text-red-200 px-2 place-content-around rounded-lg">
      <p class="m-0">Search is currently unavailable.</p>
      <p class="m-0 text-sm">Please try again later.</p>
    </div>
  `;
}

export async function loadSearch() {
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
  }
}
