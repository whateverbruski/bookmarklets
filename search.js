//javascript:(function(){var text = window.getSelection().toString().trim(); if (text) { window.open('https://help.shopify.com/en?payload=%27 + encodeURIComponent(text), %27_blank%27); }})();

// ==UserScript==
// @name         Shopify Help Center AI Auto-Search (v7 - Force Paste)
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Uses document.execCommand to force input recognition and submission.
// @author       You
// @match        https://help.shopify.com/en*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const getQueryFromURL = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('payload');
    };

    const pasteAndSearch = (text) => {
        const inputSelector = 'textarea[data-testid="search-bar-input"]';

        // Wait for 1.5 seconds. This timing is still necessary.
        setTimeout(() => {
            const inputField = document.querySelector(inputSelector);

            if (inputField) {
                // 1. Bring the textarea into focus. This is critical for execCommand.
                inputField.focus();

                // 2. Use execCommand to "paste" the text. This is the hacky part.
                // This browser command is much more likely to be recognized by the site's framework.
                document.execCommand('insertText', false, text);

                // 3. Add the space, again using execCommand for consistency.
                document.execCommand('insertText', false, ' ');

                // 4. Brief pause to allow the change to register fully.
                setTimeout(() => {
                    // 5. Simulate "Enter" to submit.
                    inputField.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
                    }));

                    // 6. Clean up the URL.
                    setTimeout(() => {
                        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                        window.history.pushState({path: newUrl}, '', newUrl);
                    }, 300);
                }, 200);
            }
        }, 1500);
    };

    const query = getQueryFromURL();
    if (query) {
        pasteAndSearch(query);
    }
})();