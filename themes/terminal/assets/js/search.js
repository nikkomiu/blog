import { loadScript } from './util'

const searchSelector = '#siteSearch'

function toggleSearch(e) {
  if (e.ctrlKey && e.keyCode === 'K'.charCodeAt(0)) {
    e.preventDefault();

    const searchElement = document.querySelector(`${searchSelector} input[type="text"]`);
    if (searchElement) {
      searchElement.focus();
    }
  }
}

function loadSearchFailed() {
  console.warn('Could not load search');

  document.querySelector(searchSelector).innerHTML = `
    <div class="alert alert-error">
      <p>Search is currently unavailable.</p>
      <p class="small">Please try again later.</p>
    </div>
  `;
}

export async function loadSearch() {
  try {
    // Load search
    await loadScript('/_pagefind/pagefind-ui.js');

    const searchElement = document.querySelector(searchSelector);
    if (!searchElement) {
      console.warn(`Could not find search selector: "${searchSelector}"`);
      return;
    }

    // Enable search
    searchElement.innerHTML = "";
    new PagefindUI({ element: searchSelector });

    // Add search triggers
    document.addEventListener('keydown', toggleSearch);
  } catch (err) {
    loadSearchFailed();
  }
}
