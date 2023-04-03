import './prism'
import './menu' // TODO: modularize this

import { loadSearch } from './search'

function onDocumentLoad() {
    loadSearch();
}

window.addEventListener('load', onDocumentLoad);
