// ==UserScript==
// @name         Speed Reader with Playback Controls (Keyboard Shortcut)
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Select text, then press Ctrl+Shift+S to speed read. Includes persistent WPM, pause/play (Spacebar/Enter), and sentence navigation.
// @author       Your Name
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration: Set your desired keyboard shortcut here ---
    const SHORTCUT_KEY = 'S'; // The letter you want to press
    const USE_CTRL_KEY = true;
    const USE_SHIFT_KEY = true;
    const USE_ALT_KEY = false;

    /**
     * This function listens for the shortcut and starts the reader.
     */
    function keydownListener(e) {
        if (e.key.toUpperCase() === SHORTCUT_KEY &&
            e.ctrlKey === USE_CTRL_KEY &&
            e.shiftKey === USE_SHIFT_KEY &&
            e.altKey === USE_ALT_KEY
           ) {
            e.preventDefault();
            e.stopPropagation();
            initSpeedReader();
        }
    }

    document.addEventListener('keydown', keydownListener);

    /**
     * The main function to initialize the speed reader UI and logic.
     */
    async function initSpeedReader() {
        if (document.getElementById('srOverlay')) return;

        let sel = window.getSelection().toString().trim();
        if (!sel) {
            try {
                sel = await navigator.clipboard.readText();
            } catch (e) {
                alert("Speed Reader: No text selected, and clipboard access was denied.");
                return;
            }
        }

        const words = sel.split(/\s+/).filter(word => word.length > 0);
        const total = words.length;
        if (total === 0) {
            alert("Speed Reader: No words to read.");
            return;
        }

        // --- State Variables ---
        let idx = 0;
        let baseWPM = await GM_getValue('srWPM', 300);
        let delay = 60000 / baseWPM;
        let timer;
        let isPaused = false;

        const sentenceStartIndices = [0];
        words.forEach((word, index) => {
            if (/[.!?]$/.test(word) && index < total - 1) {
                sentenceStartIndices.push(index + 1);
            }
        });

        // --- UI Creation ---
        const o = document.createElement('div');
        o.id = 'srOverlay';
        Object.assign(o.style, {
            position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
            background: '#222', color: '#fff', padding: '20px', borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: '2147483647',
            fontFamily: 'sans-serif', textAlign: 'center', width: '450px'
        });

        const pb = document.createElement('div');
        Object.assign(pb.style, { position: 'absolute', top: 0, left: 0, height: '4px', background: '#4caf50', width: '0%' });
        o.appendChild(pb);

        const x = document.createElement('span');
        x.textContent = '×'; x.title = 'Close';
        Object.assign(x.style, { position: 'absolute', top: '6px', right: '10px', cursor: 'pointer', fontSize: '18px', color: '#aaa' });
        x.onclick = cleanup;
        o.appendChild(x);

        const disp = document.createElement('div');
        Object.assign(disp.style, { fontSize: '2.2em', minHeight: '1.2em', margin: '20px 0', whiteSpace: 'nowrap' });
        o.appendChild(disp);

        // --- Reorganized Controls Layout ---
        const controlsContainer = document.createElement('div');

        // WPM Slider and Buttons
        const wpmCtr = document.createElement('div');
        wpmCtr.style.margin = '10px 0';

        const minus = document.createElement('button');
        minus.textContent = '–';
        minus.onclick = () => updateWPM(baseWPM - 10);

        const slider = document.createElement('input');
        slider.type = 'range'; slider.min = 100; slider.max = 1000; slider.step = 10;
        slider.value = baseWPM;
        slider.style.margin = '0 8px'; slider.style.verticalAlign = 'middle';
        slider.style.width = '200px';
        slider.oninput = function () { updateWPM(+this.value); };

        const plus = document.createElement('button');
        plus.textContent = '+';
        plus.onclick = () => updateWPM(baseWPM + 10);

        const lbl = document.createElement('div');
        lbl.textContent = 'WPM: ' + baseWPM;
        lbl.style.marginTop = '4px'; lbl.style.fontSize = '0.9em';

        wpmCtr.append(minus, slider, plus, lbl);

        // Playback Buttons
        const playbackCtr = document.createElement('div');
        playbackCtr.style.margin = '20px 0 10px 0';

        const backBtn = document.createElement('button');
        backBtn.textContent = '<<'; backBtn.title = 'Previous Sentence (Left Arrow)';
        backBtn.onclick = goBackSentence;

        const playPauseBtn = document.createElement('button');
        playPauseBtn.textContent = '||'; playPauseBtn.title = 'Pause/Play (Spacebar/Enter)';
        playPauseBtn.style.margin = '0 15px';
        playPauseBtn.style.minWidth = '40px';
        playPauseBtn.onclick = togglePause;

        const forwardBtn = document.createElement('button');
        forwardBtn.textContent = '>>'; forwardBtn.title = 'Next Sentence (Right Arrow)';
        forwardBtn.onclick = skipForwardSentence;

        playbackCtr.append(backBtn, playPauseBtn, forwardBtn);

        controlsContainer.append(wpmCtr, playbackCtr);
        o.append(disp, controlsContainer);
        document.body.append(o);

        setTimeout(() => document.addEventListener('click', outside), 0);

        // --- Core Functions ---
        function updateWPM(v) {
            baseWPM = Math.max(50, Math.min(2000, v));
            delay = 60000 / baseWPM;
            GM_setValue('srWPM', baseWPM);
            slider.value = baseWPM;
            lbl.textContent = 'WPM: ' + baseWPM;
        }

        function show() {
            if (isPaused) return;
            if (idx >= total) return cleanup();
            if (idx < 0) idx = 0;

            const w = words[idx++];
            const orp = Math.floor((w.length - 1) / 2);

            const frag = document.createDocumentFragment();
            frag.appendChild(document.createTextNode(w.slice(0, orp)));
            const mid = document.createElement('span');
            mid.style.color = 'orange'; mid.style.fontWeight = 'bold';
            mid.textContent = w[orp] || '';
            frag.appendChild(mid);
            frag.appendChild(document.createTextNode(w.slice(orp + 1)));

            disp.textContent = '';
            disp.appendChild(frag);

            pb.style.width = (idx / total * 100) + '%';

            let mul = 1;
            if (/[.,!?]$/.test(w)) mul = w.endsWith(',') ? 1.5 : 2;
            else if (w.length > 8) mul = 1.2;

            timer = setTimeout(show, delay * mul);
        }

        function togglePause() {
            isPaused = !isPaused;
            playPauseBtn.textContent = isPaused ? '▶' : '||';
            playPauseBtn.title = isPaused ? 'Play (Spacebar/Enter)' : 'Pause (Spacebar/Enter)';
            if (!isPaused) {
                show();
            } else {
                clearTimeout(timer);
            }
        }

        function goBackSentence() {
            clearTimeout(timer);
            const currentSentenceStart = sentenceStartIndices.slice().reverse().find(i => i < idx);
            if (currentSentenceStart !== undefined) {
                if (idx - 1 === currentSentenceStart && currentSentenceStart > 0) {
                    const prevIndex = sentenceStartIndices.indexOf(currentSentenceStart) - 1;
                    idx = sentenceStartIndices[prevIndex] || 0;
                } else {
                    idx = currentSentenceStart;
                }
            } else {
                idx = 0;
            }
            if(isPaused) { showWordAtIndex(); } else { show(); }
        }

        function skipForwardSentence() {
            clearTimeout(timer);
            const nextSentenceStart = sentenceStartIndices.find(i => i >= idx);
            if (nextSentenceStart !== undefined) {
                idx = nextSentenceStart;
            } else {
                idx = total;
            }
            if(isPaused) { showWordAtIndex(); } else { show(); }
        }

        function showWordAtIndex() {
            if (idx >= total) { cleanup(); return; }
            if (idx < 0) idx = 0;
            const w = words[idx];

            const orp = Math.floor((w.length - 1) / 2);
            const frag = document.createDocumentFragment();
            frag.appendChild(document.createTextNode(w.slice(0, orp)));
            const mid = document.createElement('span');
            mid.style.color = 'orange'; mid.style.fontWeight = 'bold';
            mid.textContent = w[orp] || '';
            frag.appendChild(mid);
            frag.appendChild(document.createTextNode(w.slice(orp + 1)));

            disp.textContent = '';
            disp.appendChild(frag);
            pb.style.width = ((idx + 1) / total * 100) + '%';
        }

        function keyHandler(e) {
            // Spacebar should only work for pause/play, not page scrolling.
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                togglePause();
            }
            else if (e.key === 'Escape') cleanup();
            else if (e.key === 'Enter') { e.preventDefault(); togglePause(); }
            else if (e.key === 'ArrowLeft') goBackSentence();
            else if (e.key === 'ArrowRight') skipForwardSentence();
        }

        function outside(e) { if (!o.contains(e.target)) cleanup(); }

        function cleanup() {
            clearTimeout(timer);
            document.removeEventListener('keydown', keyHandler);
            document.removeEventListener('click', outside);
            const el = document.getElementById('srOverlay');
            if (el) document.body.removeChild(el);
        }

        document.addEventListener('keydown', keyHandler);
        show();
    }
})();