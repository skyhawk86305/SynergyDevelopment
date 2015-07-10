'use strict';

/* global window */

var SUFFIX = 'Synergy 6',
    SEPARATOR = ' \u2013 ';

function retitle(title) {
    if (title) {
        title = title + SEPARATOR + SUFFIX;
    } else {
        title = SUFFIX;
    }

    if (window && window.document) {
        window.document.title = title;
    }
}

module.exports = retitle;
