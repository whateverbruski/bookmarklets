// this is a bookmarklet for classifying items from clipboard
javascript:(async function(){
  if (window._clasOverlay) return;
  // 1) Read clipboard
  let raw;
  try { raw = await navigator.clipboard.readText(); }
  catch(e) { alert("Copy your list first."); return; }

  // 2) Parse into heading groups (implicit blank for leading items)
  const lines = raw.split(/\r?\n/);
  const groups = [];
  let current = { heading: "", items: [] };
  groups.push(current);
  for (let ln of lines) {
    const line = ln.trim();
    if (!line) continue;
    if (!line.startsWith(".")) {
      current = { heading: line, items: [] };
      groups.push(current);
    } else {
      current.items.push(line.slice(1)); // keep any internal whitespace
    }
  }

  // 3) Build decisions array
  const decisions = [];
  groups.forEach(g => {
    g.items.forEach(text => {
      decisions.push({ heading: g.heading, text, keep: true });
    });
  });

  // 4) Create overlay
  const o = document.createElement("div");
  o.id = "_clasOverlay";
  window._clasOverlay = { overlay: o, idx: 0, history: [] };
  Object.assign(o.style, {
    position: "fixed", top: "20%", left: "50%",
    transform: "translateX(-50%)", background: "#222",
    color: "#fff", padding: "20px", borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    fontFamily: "sans-serif", width: "420px", zIndex: 999999
  });

  // Progress bar (top border)
  const prog = document.createElement("div");
  prog.style.height = "4px";
  prog.style.background = "#4caf50";
  prog.style.width = "0%";
  o.appendChild(prog);

  // Item display
  const disp = document.createElement("div");
  disp.style.margin = "16px 0";
  disp.style.fontSize = "1.1em";
  disp.style.minHeight = "2.4em";
  o.appendChild(disp);

  // Buttons container
  const ctr = document.createElement("div");
  ctr.style.textAlign = "center";
  o.appendChild(ctr);

  // Keep button
  const btnKeep = document.createElement("button");
  btnKeep.textContent = "Keep";
  Object.assign(btnKeep.style, {
    background: "#28a745", color: "#fff",
    padding: "10px 20px", marginRight: "12px",
    fontSize: "1em", border: "none",
    borderRadius: "4px", cursor: "pointer"
  });
  ctr.appendChild(btnKeep);

  // Drop button
  const btnDrop = document.createElement("button");
  btnDrop.textContent = "Drop";
  Object.assign(btnDrop.style, {
    background: "#dc3545", color: "#fff",
    padding: "10px 20px", fontSize: "1em",
    border: "none", borderRadius: "4px",
    cursor: "pointer"
  });
  ctr.appendChild(btnDrop);

  // Undo button
  const btnBack = document.createElement("button");
  btnBack.textContent = "Undo";
  Object.assign(btnBack.style, {
    background: "#6c757d", color: "#fff",
    padding: "8px 16px", marginLeft: "12px",
    fontSize: "0.9em", border: "none",
    borderRadius: "4px", cursor: "pointer"
  });
  ctr.appendChild(btnBack);

  // Cleanup
  function cleanup() {
    document.body.removeChild(o);
    document.removeEventListener("keydown", keyHandler);
    delete window._clasOverlay;
  }

  // Render function
  function render() {
    const s = window._clasOverlay, { idx } = s;
    const total = decisions.length;
    // progress bar
    prog.style.width = `${(idx/total)*100}%`;
    if (idx >= total) {
      // assemble output
      let out = "";
      groups.forEach(g => {
        const kept = decisions
          .filter(d => d.heading === g.heading && d.keep)
          .map(d => "." + d.text);
        if (kept.length) {
          if (g.heading) out += g.heading + "\n";
          out += kept.join("\n") + "\n\n";
        }
      });
      navigator.clipboard.writeText(out.trim()).then(cleanup);
      return;
    }
    disp.textContent = decisions[idx].text;
    btnBack.disabled = s.history.length === 0;
  }

  // Decision maker
  function decide(keep) {
    const s = window._clasOverlay;
    s.history.push({ idx: s.idx, prev: decisions[s.idx].keep });
    decisions[s.idx].keep = keep;
    s.idx++;
    render();
  }
  btnKeep.onclick = () => decide(true);
  btnDrop.onclick = () => decide(false);
  btnBack.onclick = () => {
    const s = window._clasOverlay;
    const last = s.history.pop();
    if (!last) return;
    decisions[last.idx].keep = last.prev;
    s.idx = last.idx;
    render();
  };

  // Keyboard shortcuts: Y/Enter=Keep, N=Drop, Backspace=Undo, Esc=Cancel
  function keyHandler(e) {
    if (e.key === "Escape") cleanup();
    else if (e.key.match(/^[yY]$/) || e.key === "Enter") decide(true);
    else if (e.key.match(/^[nN]$/)) decide(false);
    else if (e.key === "Backspace") btnBack.click();
  }
  document.addEventListener("keydown", keyHandler);

  document.body.appendChild(o);
  // Make the overlay draggable
  (function makeDraggable(el) {
    let offsetX = 0, offsetY = 0, isDragging = false;

    el.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetX = e.clientX - el.getBoundingClientRect().left;
      offsetY = e.clientY - el.getBoundingClientRect().top;
      document.body.style.userSelect = "none"; // prevent text selection
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.transform = ""; // cancel center transform after move
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      document.body.style.userSelect = "";
    });
  })(o);

  btnKeep.focus();
  render();
})();