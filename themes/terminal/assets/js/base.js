import 'prismjs'
import './menu'

import { loadSearch } from './search'

function onDocumentLoad() {
    loadSearch();
}

window.addEventListener('load', onDocumentLoad);
