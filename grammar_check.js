javascript:(async () => {
  try {
    // 1. Get selected text
    const selection = window.getSelection();
    const selectedText = selection.toString();
    if (!selectedText) {
      alert("Select some text inside an editable field.");
      return;
    }

    // 2. Verify selection is within an editable element
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const editableParent = container.closest?.("textarea, input, [contenteditable='true']") ||
                           (container.nodeType === 3 && container.parentElement.closest?.("textarea, input, [contenteditable='true']"));

    if (!editableParent) {
      alert("Selected text must be inside an editable field.");
      return;
    }

    // 3. Construct prompt
    const prompt = `Grammar check: ${selectedText}`;

    // 4. Call your API
    const apiKey = "YOUR_API_KEY"; // 🔁 Replace with your token or remove if handled elsewhere
    const endpoint = "https://YOUR_API_ENDPOINT/v1/chat/completions"; // 🔁 Replace with your endpoint

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}` // 🔁 Remove if not needed
      },
      body: JSON.stringify({
        model: "gpt-4", // 🔁 Replace with your model identifier
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      alert("No response from model.");
      return;
    }

    // 5. Replace selected text
    if (editableParent.tagName === "TEXTAREA" || editableParent.tagName === "INPUT") {
      const start = editableParent.selectionStart;
      const end = editableParent.selectionEnd;
      const value = editableParent.value;
      editableParent.value = value.slice(0, start) + result + value.slice(end);
    } else if (editableParent.isContentEditable) {
      range.deleteContents();
      range.insertNode(document.createTextNode(result));
    } else {
      alert("Unsupported editable element.");
    }
  } catch (err) {
    console.error("zcheck error:", err);
    alert("Something went wrong. Check console.");
  }
})();
