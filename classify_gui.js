(async function(){
  if (window._clasOverlay) return;

  // 1) read clipboard
  let raw;
  try { raw = await navigator.clipboard.readText(); }
  catch (e) { alert("Couldn't read clipboard — copy your list first or grant permissions."); return; }

  // normalizers
  const normHeading = h => (h||"").replace(/\s+/g," ").trim(); // collapse spaces, trim
  const normItem = it => (it||"").replace(/\s+/g," ").trim();

  // 2) parse into ordered groups while merging headings and deduping heading+item
  const lines = raw.split(/\r?\n/);
  const groupsOrdered = [];
  const groupsMap = new Map();
  const seenPairs = new Set();

  function ensureGroup(headingRaw) {
    const heading = normHeading(headingRaw);
    if (!groupsMap.has(heading)) {
      const g = { heading, items: [] };
      groupsMap.set(heading, g);
      groupsOrdered.push(g);
    }
    return groupsMap.get(heading);
  }

  // implicit leading heading = ""
  let currentHeadingRaw = "";
  ensureGroup(currentHeadingRaw);

  for (const ln of lines) {
    if (ln == null) continue;
    const trimmed = ln.trim();
    if (trimmed === "") continue;

    // treat as item only if:
    //  - starts with '.'  (original behavior)
    //  - OR starts with 'x.' (lowercase x followed by a dot) — your done marker
    function isItemLine(t) {
      if (t.startsWith('.')) return true;
      return t.startsWith('x.');
    }

    if (!isItemLine(trimmed)) {
      // treat as heading
      currentHeadingRaw = trimmed;
      ensureGroup(currentHeadingRaw);
    } else {
      // treat as item — preserve marker
      const pos = trimmed.indexOf(".");
      const marker = trimmed.slice(0, pos + 1); // e.g. '.' or 'x.'
      const rawItem = trimmed.slice(pos + 1);
      const item = normItem(rawItem);

      const headingKey = normHeading(currentHeadingRaw);
      const key = `${headingKey}||${item}`;
      if (!seenPairs.has(key)) {
        seenPairs.add(key);
        // store object to preserve marker
        groupsMap.get(headingKey).items.push({ text: item, marker });
      }
    }
  }

  // 3) build decisions (flattened) — support old string items for backward compat
  const decisions = [];
  for (const g of groupsOrdered) {
    for (const it of g.items) {
      if (typeof it === 'string') {
        // backward compat: old code stored plain strings
        decisions.push({ heading: g.heading, text: it, marker: '.', keep: true });
      } else {
        decisions.push({ heading: g.heading, text: it.text, marker: it.marker || '.', keep: true });
      }
    }
  }

  console.info("[clip-organizer] groupsOrdered:", JSON.parse(JSON.stringify(groupsOrdered)));
  console.info("[clip-organizer] decisions:", JSON.parse(JSON.stringify(decisions)));

  if (decisions.length === 0 && groupsOrdered.length === 1 && groupsOrdered[0].heading === "") {
    alert("No items found in clipboard (expected lines starting with '.' or 'x.' for items).");
    return;
  }

  // 4) UI overlay
  const o = document.createElement("div");
  o.id = "_clasOverlay";
  window._clasOverlay = { overlay: o, idx: 0, history: [] };
  Object.assign(o.style, {
    position: "fixed", left: "50%", top: "16%",
    transform: "translateX(-50%)", zIndex: 2147483647,
    background: "#222", color: "#fff", padding: "16px",
    borderRadius: "8px", width: "480px", maxWidth: "calc(100% - 20px)",
    boxShadow: "0 8px 30px rgba(0,0,0,.6)", fontFamily: "system-ui,Segoe UI,Roboto,Arial"
  });

  const prog = document.createElement("div");
  prog.style.height="6px";
  prog.style.background="#2e7d32";
  prog.style.width="0%";
  prog.style.borderRadius="4px";
  o.appendChild(prog);

  const title = document.createElement("div");
  title.textContent="Clip Organizer";
  title.style.textAlign="center";
  title.style.fontWeight="600";
  title.style.marginTop="8px";
  o.appendChild(title);

  const disp = document.createElement("div");
  disp.style.minHeight="2.6em";
  disp.style.margin="12px 0";
  disp.style.fontSize="1.05rem";
  disp.style.whiteSpace="pre-wrap";
  o.appendChild(disp);

  const ctr = document.createElement("div");
  ctr.style.textAlign="center";
  o.appendChild(ctr);

  const makeButton = (txt, bg) => {
    const b = document.createElement("button");
    b.textContent = txt;
    Object.assign(b.style, {padding:"8px 12px",margin:"6px",border:"none",borderRadius:"6px",cursor:"pointer",background:bg,color:"#fff"});
    return b;
  };
  const btnKeep = makeButton("Keep","#2e7d32");
  const btnDrop = makeButton("Drop","#c62828");
  const btnBack = makeButton("Undo","#6c757d");
  const btnCancel = makeButton("Cancel","#444");
  ctr.appendChild(btnKeep);
  ctr.appendChild(btnDrop);
  ctr.appendChild(btnBack);
  ctr.appendChild(btnCancel);

  const hint = document.createElement("div");
  hint.textContent="Y/Enter=Keep • N=Drop • Backspace=Undo • Esc=Cancel";
  hint.style.fontSize="12px";
  hint.style.color="#bbb";
  hint.style.textAlign="center";
  o.appendChild(hint);

  document.body.appendChild(o);
  try { btnKeep.focus(); } catch(e) {}

  function updateProg() {
    prog.style.width = `${Math.round((window._clasOverlay.idx / Math.max(1, decisions.length)) * 100)}%`;
  }

  // 5) assemble + write — **preserve lonely headings and duplicate them into dropped section**
  function assembleAndWrite() {
    let keptOut = "";
    let droppedOut = "";

    for (const g of groupsOrdered) {
      const kept = decisions
        .filter(d => d.heading === g.heading && d.keep)
        .map(d => (d.marker || '.') + d.text);

      const dropped = decisions
        .filter(d => d.heading === g.heading && !d.keep)
        .map(d => (d.marker || '.') + d.text);

      // If heading is non-empty, and either:
      //  - there are kept items for it (we include heading + kept items)
      //  - OR the original group had zero items (lonely heading) -> preserve heading in keptOut
      if (g.heading) {
        if (kept.length > 0) {
          keptOut += g.heading + "\n";
          keptOut += kept.join("\n") + "\n\n";
        } else if (g.items && g.items.length === 0) {
          // preserve lonely heading (as a standalone block in kept section)
          keptOut += g.heading + "\n\n";
        }
      } else {
        // empty heading (leading items) — include kept leading items if any
        if (kept.length > 0) {
          keptOut += kept.join("\n") + "\n\n";
        }
      }

      // dropped: if there are dropped items for this heading, include heading (if non-empty) + dropped items
      if (dropped.length > 0) {
        if (g.heading) droppedOut += g.heading + "\n";
        droppedOut += dropped.join("\n") + "\n\n";
      }
    }

    // ----- NEW: duplicate lonely headings into droppedOut -----
    // Gather lonely headings (non-empty heading with zero original items)
    const lonelyHeadingsBlock = groupsOrdered
      .filter(g => g.heading && (!g.items || g.items.length === 0))
      .map(g => g.heading + "\n\n")
      .join("");

    if (droppedOut && lonelyHeadingsBlock) {
      // Prepend lonely headings so they appear above the dropped section items as context
      droppedOut = lonelyHeadingsBlock + droppedOut;
    }
    // -------------------------------------------------------

    keptOut = keptOut.replace(/\s+$/,"");
    droppedOut = droppedOut.replace(/\s+$/,"");

    let out = "";
    if (droppedOut) {
      if (keptOut) out = keptOut + "\n\n" + "dropped" + "\n\n" + droppedOut;
      else out = droppedOut;
    } else {
      out = keptOut;
    }

    return navigator.clipboard.writeText(out);
  }

  function render() {
    updateProg();
    const s = window._clasOverlay;
    if (s.idx >= decisions.length) {
      disp.textContent = "Saving to clipboard...";
      btnKeep.disabled = btnDrop.disabled = btnBack.disabled = true;
      assembleAndWrite().then(()=>{ cleanup(); alert("Done — output written to clipboard."); }).catch(()=>{ cleanup(); alert("Couldn't write to clipboard."); });
      return;
    }
    disp.textContent = decisions[s.idx].text;
    btnBack.disabled = s.history.length === 0;
  }

  function decide(keep) {
    const s = window._clasOverlay;
    s.history.push({ idx: s.idx, prev: decisions[s.idx].keep });
    decisions[s.idx].keep = keep;
    s.idx++;
    render();
  }

  btnKeep.onclick = () => decide(true);
  btnDrop.onclick = () => decide(false);
  btnBack.onclick = () => { const s = window._clasOverlay; const last = s.history.pop(); if(!last) return; decisions[last.idx].keep = last.prev; s.idx = last.idx; render(); };
  btnCancel.onclick = () => cleanup();

  function keyHandler(e) {
    if (!window._clasOverlay) return;
    if (e.key === "Escape") { e.preventDefault(); cleanup(); return; }
    if (e.key === "Enter" || /^[yY]$/.test(e.key)) { e.preventDefault(); decide(true); return; }
    if (/^[nN]$/.test(e.key)) { e.preventDefault(); decide(false); return; }
    if (e.key === "Backspace") { e.preventDefault(); btnBack.click(); return; }
  }
  document.addEventListener("keydown", keyHandler);

  // draggable (mouse + touch)
  function makeDraggable(el) {
    let dx=0, dy=0, drag=false;
    function md(e) {
      if (e.button !== 0 && !e.touches) return;
      drag = true;
      const r = el.getBoundingClientRect();
      const cx = e.clientX || (e.touches && e.touches[0].clientX);
      const cy = e.clientY || (e.touches && e.touches[0].clientY);
      dx = cx - r.left;
      dy = cy - r.top;
      document.body.style.userSelect = "none";
      e.preventDefault();
    }
    function mm(e) {
      if (!drag) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      el.style.left = Math.max(6, clientX - dx) + "px";
      el.style.top = Math.max(6, clientY - dy) + "px";
      el.style.transform = "";
    }
    function mu() { drag = false; document.body.style.userSelect = ""; }
    el.addEventListener("mousedown", md);
    document.addEventListener("mousemove", mm);
    document.addEventListener("mouseup", mu);
    el.addEventListener("touchstart", md, {passive:false});
    document.addEventListener("touchmove", mm, {passive:false});
    document.addEventListener("touchend", mu);
    return ()=>{ el.removeEventListener("mousedown", md); document.removeEventListener("mousemove", mm); document.removeEventListener("mouseup", mu); el.removeEventListener("touchstart", md); document.removeEventListener("touchmove", mm); document.removeEventListener("touchend", mu); };
  }
  window._clasOverlay.removeDrag = makeDraggable(o);

  function cleanup() {
    try{ const s = window._clasOverlay; if (s && typeof s.removeDrag === "function") s.removeDrag(); }catch(e){}
    try{ if (document.getElementById("_clasOverlay")) document.body.removeChild(o); }catch(e){}
    document.removeEventListener("keydown", keyHandler);
    delete window._clasOverlay;
  }

  render();
})();
