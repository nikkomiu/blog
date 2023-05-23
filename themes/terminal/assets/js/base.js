import Prism from 'prismjs'
import './menu'

import { loadSearch } from './search'

function onDocumentLoad() {
    loadSearch();

    Prism.highlightAll();
}

window.addEventListener('load', onDocumentLoad);
