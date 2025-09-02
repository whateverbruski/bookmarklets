(function() {
    // 1. EDIT THIS TEMPLATE
    // This is where you can change the prompt. '{{selected_text}}' is the placeholder
    // for the text you highlight on the page.
    const ZGATHER_PROMPT_TEMPLATE = "What are some good context-gathering questions to ask to understand this merchant's issue deeper: '{{selected_text}}'";

    // 2. Define the search engine URL.
    const SEARCH_URL_BASE = "https://help.shopify.com/en/search?q=";

    // 3. Get the currently highlighted text.
    const selectedText = window.getSelection().toString().trim();

    // 4. Proceed only if some text was actually selected.
    if (selectedText) {
        // Inject the selected text into your prompt template.
        const finalQuery = ZGATHER_PROMPT_TEMPLATE.replace('{{selected_text}}', selectedText);

        // Construct the final URL and open it in a new tab.
        const finalUrl = SEARCH_URL_BASE + encodeURIComponent(finalQuery);
        window.open(finalUrl, '_blank');
    }
    // If no text is selected, it simply does nothing.
})();