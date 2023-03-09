import 'flowbite'
import { loadSearch } from './search'

function onDocumentLoad() {
    loadSearch();
}

window.addEventListener('load', onDocumentLoad);
