import Prism from 'prismjs'
import 'prismjs/plugins/toolbar/prism-toolbar'
import 'prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard'

import './menu'

import { loadSearch } from './search'

function onDocumentLoad() {
    loadSearch();

    Prism.highlightAll();
  }

window.addEventListener('load', onDocumentLoad);
