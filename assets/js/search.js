import { Modal } from 'flowbite'
import { loadScript } from './util'

const searchButtonSelector = '#siteSearchButton'
const searchSelector = '#siteSearch'
const modalSelector = '#siteSearchModal'
const modalSearchInputSelector = `${modalSelector} input[type="text"]`

let modal = null;

function toggleSearch(e) {
    if (e.ctrlKey && e.keyCode === 'K'.charCodeAt(0)) {
        e.preventDefault();

        if (modal) {
            modal.show();
        }
    }
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

        const modalElement = document.querySelector(modalSelector);
        if (!modalElement) {
            console.warn(`Could not find search modal selector: ${modalSelector}`);
            return;
        }

        // Configure the search modal
        modal = new Modal(modalElement, {
            placement: 'top-center',
            closable: true,
            onShow: () => {
                const searchInput = document.querySelector(modalSearchInputSelector);
                if (searchInput) {
                    searchInput.select();
                } else {
                    console.warn(`Could not find search modal input: ${modalSearchInputSelector}`);
                    return;
                }
            }
        });

        // Add search modal triggers
        document.querySelector(searchButtonSelector).addEventListener('click', () => modal.show());
        document.addEventListener('keydown', toggleSearch);
    } catch (err) {
        console.error(err)
    }
}
