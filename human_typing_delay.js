// ==UserScript==
// @name         Chat Pacing Indicator (v4 - Smart Timer)
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Adds a smart, cumulative timer and global countdown to encourage human-like response pacing.
// @author       Me
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURATION ---
    const config = {
        // IMPORTANT: Replace with the CSS selector for your chat input field.
        inputSelector: 'textarea.textarea', // Example for AI Studio

        // Your average typing speed in Words Per Minute.
        wordsPerMinute: 80,

        // Visual settings
        waitColor: 'orange',
        readyColor: '#28a745', // Green
        borderWidth: '2px',
    };
    // --- END OF CONFIGURATION ---


    // --- SCRIPT LOGIC (No need to edit below this line) ---
    let targetInput = null;
    let originalBorderStyle = '';
    let pacingTimer = null;         // setTimeout for the final "Ready" state change
    let countdownInterval = null;   // setInterval for the visual countdown display
    let countdownEndTime = 0;       // The timestamp when the current countdown should end
    let lastTextLength = 0;         // The last known character count

    // Calculates time in milliseconds for a specific number of characters
    function calculateTimeForChars(charCount) {
        if (charCount <= 0) return 0;
        const charactersPerMinute = config.wordsPerMinute * 5; // Avg 5 chars per word
        const msPerCharacter = 60000 / charactersPerMinute;
        return Math.floor(charCount * msPerCharacter);
    }

    // Updates the countdown display based on the target end time
    function updateCountdown() {
        const remainingMs = Math.max(0, countdownEndTime - Date.now());
        const seconds = (remainingMs / 1000).toFixed(1);
        countdownElement.textContent = `${seconds}s`;
    }

    // This is the core logic, now rebuilt to be cumulative
    function onInputChange() {
        clearTimeout(pacingTimer);
        clearInterval(countdownInterval);

        const currentText = targetInput.value;
        const currentLength = currentText.length;
        const diff = currentLength - lastTextLength;

        // If the box is empty, reset everything to its original state
        if (currentLength === 0) {
            countdownEndTime = 0;
            targetInput.style.border = originalBorderStyle;
            countdownElement.style.display = 'none';
            lastTextLength = 0;
            return;
        }

        // Only act if characters were ADDED
        if (diff > 0) {
            const timeToAdd = calculateTimeForChars(diff);
            const now = Date.now();

            // If the previous timer was already finished, start a new countdown from now.
            // Otherwise, add the new time to the existing remaining time.
            const newEndTime = Math.max(now, countdownEndTime) + timeToAdd;
            countdownEndTime = newEndTime;
        }

        lastTextLength = currentLength;

        const totalWaitTime = Math.max(0, countdownEndTime - Date.now());

        // Set the "waiting" visual state
        targetInput.style.border = `${config.borderWidth} solid ${config.waitColor}`;
        countdownElement.style.backgroundColor = config.waitColor;
        countdownElement.style.display = 'block';

        // Start the visual countdown interval
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 100);

        // Set the main timer to switch to the "ready" state when the countdown finishes
        pacingTimer = setTimeout(() => {
            clearInterval(countdownInterval);
            // Final check to make sure the input wasn't cleared while waiting
            if (targetInput.value.length > 0) {
                targetInput.style.border = `${config.borderWidth} solid ${config.readyColor}`;
                countdownElement.style.backgroundColor = config.readyColor;
                countdownElement.textContent = 'Ready';
            }
        }, totalWaitTime);
    }

    // This function sets everything up once the element is found
    function initializeScript(element) {
        targetInput = element;
        originalBorderStyle = targetInput.style.border || '1px solid initial';
        lastTextLength = targetInput.value.length; // Handle pre-filled text

        // Create the global countdown timer element
        let countdownElement = document.createElement('div');
        window.countdownElement = countdownElement; // Make it globally accessible for our functions
        countdownElement.style.position = 'fixed';
        countdownElement.style.bottom = '20px';
        countdownElement.style.right = '20px';
        countdownElement.style.padding = '5px 10px';
        countdownElement.style.borderRadius = '15px';
        countdownElement.style.color = 'white';
        countdownElement.style.fontSize = '14px';
        countdownElement.style.fontFamily = 'monospace';
        countdownElement.style.zIndex = '9999';
        countdownElement.style.display = 'none';
        countdownElement.style.transition = 'background-color 0.3s ease-in-out';
        document.body.appendChild(countdownElement);

        // If there's text on load, start the timer
        if (lastTextLength > 0) {
            onInputChange();
        }

        targetInput.addEventListener('input', onInputChange);
    }


    // --- AGGRESSIVE LOADER ---
    const loader = setInterval(() => {
        const element = document.querySelector(config.inputSelector);
        if (element) {
            clearInterval(loader);
            initializeScript(element);
        }
    }, 500);

})();