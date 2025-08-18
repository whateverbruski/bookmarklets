// ==UserScript==
// @name         Chat Persuasion Card — Steps Left + Zero Padding v1.6
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Compact top-flush tracker — Steps column left, Principles right; rows padding 0; single timer per list, CSV export, local-only. Paste into Tampermonkey.
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* =============
     CONFIG
     ============= */
  const PRINCIPLES = [
    'Unity',
    'Authority',
    'Liking',
    'Pre-Suasion',
    'Reciprocity',
    'Commitment/Consistency',
    'Social Proof',
    'Scarcity'
  ];

  const STEPS = [
    'Greet',
    'Acknowledge',
    'Empathize',
    'Reassure',
    'Context gather/Understand Issue',
    'Gameplan',
    'Context provide/Resolve Issue',
    'Next Steps',
    'Closing'
  ];

  const STORAGE_HISTORY_KEY = 'chatPersuasionHistory_v2';
  const STORAGE_POS_KEY = 'chatPersuasionPosPct_v2';
  const STORAGE_COLLAPSE_KEY = 'chatPersuasionCollapsed_v2';

  /* =============
     STATE
     ============= */
  let state = {
    principles: {},
    steps: {},
    history: JSON.parse(localStorage.getItem(STORAGE_HISTORY_KEY) || '[]'),
    scorePrinciples: 0,
    scoreSteps: 0
  };

  PRINCIPLES.forEach(p => {
    state.principles[p] = { startedAt: null, elapsed: 0, running: false, skipped: false, done: false };
  });
  STEPS.forEach(s => {
    state.steps[s] = { startedAt: null, elapsed: 0, running: false, skipped: false, done: false };
  });

  /* =============
     STYLES + UI
     ============= */
  const style = document.createElement('style');
style.textContent = `
  #cpCard {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    top: 0;
    width: 640px; /* reduced from 760px */
    z-index: 2147483647;
    font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial;
  }
  #cpInner {
    margin-top:4px;
    border-radius:8px;
    overflow:hidden;
    background:#0b1320;
    color:#dbeafe;
    box-shadow: 0 4px 18px rgba(2,6,23,0.5);
    border:1px solid rgba(255,255,255,0.04);
  }
  #cpHeader {
    display:flex; align-items:center; gap:4px;
    padding:0px; height:24px;
    background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
  }
  #cpTitle { font-weight:600; font-size:11px; color:#e6eef8; line-height:1; }
  #cpScores { margin-left:auto; display:flex; gap:4px; align-items:center; }
  .cpScore {
    font-weight:600;
    background: rgba(255,255,255,0.03);
    padding:2px 6px;
    border-radius:999px;
    font-size:11px;
    color:#d7f6e6;
  }
  #cpCollapseBtn {
    background:transparent; color:#9fb0c8;
    border:0; padding:0 4px;
    border-radius:4px;
    cursor:pointer; font-size:12px;
  }

  #cpCard.collapsed #cpBody, #cpCard.collapsed #cpFooter { display:none; }

  #cpBody { padding:4px 6px; display:flex; gap:6px; }
  .cpCol { flex:1; min-width:0; }
  .colTitle { font-size:11px; color:#9fb0c8; margin-bottom:4px; }

  .cpRow {
    display:flex; align-items:center; gap:4px;
    padding:0; height:15px;
  }
  .cpLabel {
    flex:1; font-size:11px; font-weight:500;
    color:#e6eef8;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .cpCheckbox { width:14px; height:14px; cursor:pointer; accent-color:#28a745; }
  .cpTimer {
    width:46px; text-align:right;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace;
    font-size:11px; color:#bfe3ff;
  }
  .cpSkip {
    background:transparent; border:1px solid rgba(255,255,255,0.03);
    color:#ffb4b4;
    padding:1px 4px; font-size:10px;
    border-radius:4px; cursor:pointer;
  }
  .strike { text-decoration:line-through; opacity:0.6; color:#8ca0b6; }

  #cpFooter {
    padding:0px;
    display:flex; gap:6px;
    align-items:center; justify-content:space-between;
    font-size:10px; color:#9fb0c8;
    background:linear-gradient(0deg, rgba(255,255,255,0.01), transparent);
  }
  input.cpEmail {
    background: rgba(255,255,255,0.02);
    border:1px solid rgba(255,255,255,0.03);
    color:#dbeafe;
    padding:4px 6px; border-radius:6px;
    font-size:11px; width:180px;
  }
  button.cpBtn {
    background:transparent;
    border:1px solid rgba(255,255,255,0.03);
    color:#cfefff;
    padding:2px 5px;
    border-radius:4px;
    font-size:10px;
    cursor:pointer;
  }
  button.cpBtn.ghost { opacity:0.9; }
  @media (max-width:900px){
    #cpCard{ width:92%; }
    .cpLabel{ width:100px; }
  }
`;
  document.head.appendChild(style);

  const cpCard = document.createElement('div');
  cpCard.id = 'cpCard';
  cpCard.innerHTML = `
    <div id="cpInner">
      <div id="cpHeader">
        <div id="cpTitle">Persuasion • Chat</div>
        <div id="cpScores">
          <div class="cpScore" id="cpScorePrinciples">P: 0</div>
          <div class="cpScore" id="cpScoreSteps">S: 0</div>
        </div>
        <button id="cpCollapseBtn">▾</button>
      </div>
      <div id="cpBody">
        <!-- Steps column moved to the LEFT as requested -->
        <div class="cpCol" id="colSteps">
          <div class="colTitle">Chat Steps</div>
          <div id="cpSteps"></div>
        </div>
        <div class="cpCol" id="colPrinciples">
          <div class="colTitle">Principles</div>
          <div id="cpPrinciples"></div>
        </div>
      </div>
      <div id="cpFooter">
        <div style="display:flex;gap:8px;align-items:center;">
          <input class="cpEmail" id="cpEmail" placeholder="merchant email (optional)"/>
          <button class="cpBtn ghost" id="cpReset">Reset</button>
          <button class="cpBtn ghost" id="cpExport">Export</button>
        </div>
        <div style="font-size:11px;color:#9fb0c8">First items auto-start. Check to stop & start next. Skip preserves elapsed.</div>
      </div>
    </div>
  `;
  document.body.appendChild(cpCard);

  // populate principles column (right)
  const principlesArea = document.getElementById('cpPrinciples');
  PRINCIPLES.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'cpRow';
    row.id = 'p-row-' + idx;
    row.innerHTML = `
      <div class="cpLabel" id="p-label-${idx}" title="${p}">${p}</div>
      <input type="checkbox" id="p-done-${idx}" class="cpCheckbox" />
      <div class="cpTimer" id="p-timer-${idx}">00:00</div>
      <button class="cpSkip" id="p-skip-${idx}">Skip</button>
    `;
    principlesArea.appendChild(row);
  });

  // populate steps column (left)
  const stepsArea = document.getElementById('cpSteps');
  STEPS.forEach((s, idx) => {
    const safeLabel = s.length > 32 ? s.slice(0,32) + '…' : s;
    const row = document.createElement('div');
    row.className = 'cpRow';
    row.id = 's-row-' + idx;
    row.innerHTML = `
      <div class="cpLabel" id="s-label-${idx}" title="${s}">${safeLabel}</div>
      <input type="checkbox" id="s-done-${idx}" class="cpCheckbox" />
      <div class="cpTimer" id="s-timer-${idx}">00:00</div>
      <button class="cpSkip" id="s-skip-${idx}">Skip</button>
    `;
    stepsArea.appendChild(row);
  });

  /* =============
     HELPERS
     ============= */
  function nowMs(){ return Date.now(); }
  function fmt(sec){
    const m = Math.floor(sec/60);
    const s = sec % 60;
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  function computeScores(){
    let sp = 0, ss = 0;
    PRINCIPLES.forEach(p => { if (state.principles[p].done) sp += 1; });
    STEPS.forEach(s => { if (state.steps[s].done) ss += 1; });
    state.scorePrinciples = sp; state.scoreSteps = ss;
    document.getElementById('cpScorePrinciples').textContent = 'P: ' + sp;
    document.getElementById('cpScoreSteps').textContent = 'S: ' + ss;
  }

  /* =============
     SINGLE-LIST TIMER LOGIC
     - only one running timer PER LIST
     - auto-advance within same list
     ============= */

  // Principles
  function stopAllPrinciplesExcept(exceptIdx){
    PRINCIPLES.forEach((p, idx) => {
      if (idx === exceptIdx) return;
      const st = state.principles[p];
      if (st.running && st.startedAt){
        st.elapsed += Math.floor((nowMs() - st.startedAt)/1000);
        st.running = false; st.startedAt = null;
        const t = document.getElementById('p-timer-' + idx);
        if (t) t.textContent = fmt(st.elapsed);
      }
    });
  }

  function startPrincipleIdx(idx){
    const p = PRINCIPLES[idx];
    const st = state.principles[p];
    if (st.skipped) return;
    if (st.running) return;
    stopAllPrinciplesExcept(idx);
    st.startedAt = nowMs();
    st.running = true; st.done = false; st.skipped = false;
    const lbl = document.getElementById('p-label-' + idx); if (lbl) lbl.classList.remove('strike');
    const chk = document.getElementById('p-done-' + idx); if (chk) chk.checked = false;
    computeScores();
  }

  function stopAsDonePrincipleIdx(idx){
    const p = PRINCIPLES[idx]; const st = state.principles[p];
    if (st.running && st.startedAt) st.elapsed += Math.floor((nowMs() - st.startedAt)/1000);
    st.running = false; st.startedAt = null; st.done = true; st.skipped = false;
    const t = document.getElementById('p-timer-' + idx); if (t) t.textContent = fmt(st.elapsed);
    computeScores();
    const next = idx + 1;
    if (next < PRINCIPLES.length){
      const np = PRINCIPLES[next]; const nst = state.principles[np];
      if (!nst.done && !nst.skipped) startPrincipleIdx(next);
    }
  }

  function uncheckResetPrincipleIdx(idx){
    const p = PRINCIPLES[idx]; const st = state.principles[p];
    st.elapsed = 0; st.startedAt = nowMs(); st.running = true; st.done = false; st.skipped = false;
    const lbl = document.getElementById('p-label-' + idx); if (lbl) lbl.classList.remove('strike');
    const t = document.getElementById('p-timer-' + idx); if (t) t.textContent = '00:00';
    stopAllPrinciplesExcept(idx);
    computeScores();
  }

  function skipPrincipleIdx(idx){
    const p = PRINCIPLES[idx]; const st = state.principles[p];
    if (st.running && st.startedAt) st.elapsed += Math.floor((nowMs() - st.startedAt)/1000);
    st.running = false; st.startedAt = null; st.skipped = true; st.done = false;
    const lbl = document.getElementById('p-label-' + idx); if (lbl) lbl.classList.add('strike');
    const t = document.getElementById('p-timer-' + idx); if (t) t.textContent = fmt(st.elapsed);
    computeScores();
    const next = idx + 1;
    if (next < PRINCIPLES.length){
      const np = PRINCIPLES[next]; const nst = state.principles[np];
      if (!nst.done && !nst.skipped) startPrincipleIdx(next);
    }
  }

  // Steps (same logic but for steps)
  function stopAllStepsExcept(exceptIdx){
    STEPS.forEach((s, idx) => {
      if (idx === exceptIdx) return;
      const st = state.steps[s];
      if (st.running && st.startedAt){
        st.elapsed += Math.floor((nowMs() - st.startedAt)/1000);
        st.running = false; st.startedAt = null;
        const t = document.getElementById('s-timer-' + idx);
        if (t) t.textContent = fmt(st.elapsed);
      }
    });
  }

  function startStepIdx(idx){
    const s = STEPS[idx]; const st = state.steps[s];
    if (st.skipped) return;
    if (st.running) return;
    stopAllStepsExcept(idx);
    st.startedAt = nowMs(); st.running = true; st.done = false; st.skipped = false;
    const lbl = document.getElementById('s-label-' + idx); if (lbl) lbl.classList.remove('strike');
    const chk = document.getElementById('s-done-' + idx); if (chk) chk.checked = false;
    computeScores();
  }

  function stopAsDoneStepIdx(idx){
    const s = STEPS[idx]; const st = state.steps[s];
    if (st.running && st.startedAt) st.elapsed += Math.floor((nowMs() - st.startedAt)/1000);
    st.running = false; st.startedAt = null; st.done = true; st.skipped = false;
    const t = document.getElementById('s-timer-' + idx); if (t) t.textContent = fmt(st.elapsed);
    computeScores();
    const next = idx + 1;
    if (next < STEPS.length){
      const np = STEPS[next]; const nst = state.steps[np];
      if (!nst.done && !nst.skipped) startStepIdx(next);
    }
  }

  function uncheckResetStepIdx(idx){
    const s = STEPS[idx]; const st = state.steps[s];
    st.elapsed = 0; st.startedAt = nowMs(); st.running = true; st.done = false; st.skipped = false;
    const lbl = document.getElementById('s-label-' + idx); if (lbl) lbl.classList.remove('strike');
    const t = document.getElementById('s-timer-' + idx); if (t) t.textContent = '00:00';
    stopAllStepsExcept(idx);
    computeScores();
  }

  function skipStepIdx(idx){
    const s = STEPS[idx]; const st = state.steps[s];
    if (st.running && st.startedAt) st.elapsed += Math.floor((nowMs() - st.startedAt)/1000);
    st.running = false; st.startedAt = null; st.skipped = true; st.done = false;
    const lbl = document.getElementById('s-label-' + idx); if (lbl) lbl.classList.add('strike');
    const t = document.getElementById('s-timer-' + idx); if (t) t.textContent = fmt(st.elapsed);
    computeScores();
    const next = idx + 1;
    if (next < STEPS.length){
      const np = STEPS[next]; const nst = state.steps[np];
      if (!nst.done && !nst.skipped) startStepIdx(next);
    }
  }

  /* =============
     TIMER REFRESH (both lists)
     ============= */
  setInterval(() => {
    PRINCIPLES.forEach((p, idx) => {
      const st = state.principles[p];
      let val = st.elapsed;
      if (st.running && st.startedAt) val = st.elapsed + Math.floor((nowMs() - st.startedAt)/1000);
      const t = document.getElementById('p-timer-' + idx); if (t) t.textContent = fmt(val);
    });
    STEPS.forEach((s, idx) => {
      const st = state.steps[s];
      let val = st.elapsed;
      if (st.running && st.startedAt) val = st.elapsed + Math.floor((nowMs() - st.startedAt)/1000);
      const t = document.getElementById('s-timer-' + idx); if (t) t.textContent = fmt(val);
    });
  }, 1000);

  /* =============
     UI EVENTS
     ============= */
  PRINCIPLES.forEach((p, idx) => {
    const chk = document.getElementById('p-done-' + idx);
    const skipBtn = document.getElementById('p-skip-' + idx);
    chk.addEventListener('change', (ev) => {
      if (ev.target.checked) stopAsDonePrincipleIdx(idx);
      else uncheckResetPrincipleIdx(idx);
    });
    skipBtn.addEventListener('click', () => skipPrincipleIdx(idx));
  });

  STEPS.forEach((s, idx) => {
    const chk = document.getElementById('s-done-' + idx);
    const skipBtn = document.getElementById('s-skip-' + idx);
    chk.addEventListener('change', (ev) => {
      if (ev.target.checked) stopAsDoneStepIdx(idx);
      else uncheckResetStepIdx(idx);
    });
    skipBtn.addEventListener('click', () => skipStepIdx(idx));
  });

  /* =============
     SAVE / RESET / EXPORT (single CSV row contains both lists)
     ============= */
  function saveSessionIfValid(){
    const email = (document.getElementById('cpEmail') ? document.getElementById('cpEmail').value.trim() : '');
    // meaningful if any done/skipped/elapsed/running in either list
    let meaningful = false;
    PRINCIPLES.forEach(p => { const st = state.principles[p]; if (st.done || st.skipped || st.elapsed > 0 || st.running) meaningful = true; });
    STEPS.forEach(s => { const st = state.steps[s]; if (st.done || st.skipped || st.elapsed > 0 || st.running) meaningful = true; });
    if (!email || !meaningful) return false;
    const row = { email, timestamp: new Date().toISOString(), scorePrinciples: state.scorePrinciples, scoreSteps: state.scoreSteps, principles: {}, steps: {} };
    PRINCIPLES.forEach(p => {
      const st = state.principles[p];
      let finalElapsed = st.elapsed;
      if (st.running && st.startedAt) finalElapsed += Math.floor((nowMs() - st.startedAt)/1000);
      row.principles[p] = { used: !!st.done, skipped: !!st.skipped, elapsed: finalElapsed };
    });
    STEPS.forEach(s => {
      const st = state.steps[s];
      let finalElapsed = st.elapsed;
      if (st.running && st.startedAt) finalElapsed += Math.floor((nowMs() - st.startedAt)/1000);
      row.steps[s] = { used: !!st.done, skipped: !!st.skipped, elapsed: finalElapsed };
    });
    state.history.push(row);
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(state.history));
    return true;
  }

  function resetSession(){
    saveSessionIfValid();
    PRINCIPLES.forEach(p => { state.principles[p] = { startedAt:null, elapsed:0, running:false, skipped:false, done:false }; });
    STEPS.forEach(s => { state.steps[s] = { startedAt:null, elapsed:0, running:false, skipped:false, done:false }; });
    const emailEl = document.getElementById('cpEmail'); if (emailEl) emailEl.value = '';
    PRINCIPLES.forEach((p, idx) => { const t=document.getElementById('p-timer-'+idx); if(t) t.textContent='00:00'; const lbl=document.getElementById('p-label-'+idx); if(lbl) lbl.classList.remove('strike'); const chk=document.getElementById('p-done-'+idx); if(chk) chk.checked=false; });
    STEPS.forEach((s, idx) => { const t=document.getElementById('s-timer-'+idx); if(t) t.textContent='00:00'; const lbl=document.getElementById('s-label-'+idx); if(lbl) lbl.classList.remove('strike'); const chk=document.getElementById('s-done-'+idx); if(chk) chk.checked=false; });
    computeScores();
    // auto-start both first items
    startPrincipleIdx(0);
    startStepIdx(0);
  }

  const resetBtn = document.getElementById('cpReset');
  if (resetBtn) resetBtn.addEventListener('click', resetSession);

  function exportCSV(){
    const hist = JSON.parse(localStorage.getItem(STORAGE_HISTORY_KEY) || '[]');
    if (!hist.length) { alert('No history to export'); return; }
    // header
    let header = ['email','timestamp','scorePrinciples','scoreSteps'];
    PRINCIPLES.forEach(p => { header.push(`${p}_used`, `${p}_skipped`, `${p}_elapsed`); });
    STEPS.forEach(s => { header.push(`${s}_used`, `${s}_skipped`, `${s}_elapsed`); });
    const rows = [header.join(',')];
    hist.forEach(row => {
      const cols = [csvSafe(row.email), csvSafe(row.timestamp), row.scorePrinciples || 0, row.scoreSteps || 0];
      PRINCIPLES.forEach(p => {
        const r = row.principles[p] || { used:false, skipped:false, elapsed:0 };
        cols.push(r.used ? '1' : '0', r.skipped ? '1' : '0', r.elapsed || 0);
      });
      STEPS.forEach(s => {
        const r = row.steps[s] || { used:false, skipped:false, elapsed:0 };
        cols.push(r.used ? '1' : '0', r.skipped ? '1' : '0', r.elapsed || 0);
      });
      rows.push(cols.join(','));
    });
    const csv = rows.join('\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'chat_persuasion_history.csv'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  const exportBtn = document.getElementById('cpExport');
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);

  function csvSafe(s){ if (s === null || s === undefined) return ''; let str = String(s); if (str.includes(',') || str.includes('"') || str.includes('\\n')) str = '"' + str.replace(/"/g,'""') + '"'; return str; }

  /* =============
     COLLAPSE / DRAG / PERSIST
     ============= */
  const collapseBtn = document.getElementById('cpCollapseBtn');
  const collapsedSaved = localStorage.getItem(STORAGE_COLLAPSE_KEY);
  if (collapsedSaved === '1') cpCard.classList.add('collapsed'), collapseBtn.textContent = '▸';
  collapseBtn.addEventListener('click', () => {
    cpCard.classList.toggle('collapsed');
    const collapsed = cpCard.classList.contains('collapsed') ? '1' : '0';
    localStorage.setItem(STORAGE_COLLAPSE_KEY, collapsed);
    collapseBtn.textContent = collapsed === '1' ? '▸' : '▾';
  });

  let dragging = false, dragStartX = 0, initialLeftPct = 50;
  const header = document.getElementById('cpHeader');
  header.style.cursor = 'grab';
  const savedPct = parseFloat(localStorage.getItem(STORAGE_POS_KEY) || '50');
  if (!Number.isNaN(savedPct)) { cpCard.style.left = savedPct + '%'; cpCard.style.transform = 'translateX(-50%)'; }
  header.addEventListener('mousedown', e => { dragging = true; dragStartX = e.clientX; const rect = cpCard.getBoundingClientRect(), winW = window.innerWidth; initialLeftPct = (rect.left + rect.width/2)/winW*100; header.style.cursor = 'grabbing'; });
  window.addEventListener('mousemove', e => { if (!dragging) return; const dx = e.clientX - dragStartX; const winW = window.innerWidth; const newCenter = (initialLeftPct/100)*winW + dx; const newPct = Math.max(3, Math.min(97, (newCenter/winW)*100)); cpCard.style.left = newPct + '%'; cpCard.style.transform = 'translateX(-50%)'; });
  window.addEventListener('mouseup', () => { if (!dragging) return; dragging = false; header.style.cursor = 'grab'; const rect = cpCard.getBoundingClientRect(), winW = window.innerWidth; const centerPct = ((rect.left + rect.width/2)/winW)*100; localStorage.setItem(STORAGE_POS_KEY, String(centerPct)); });

  /* =============
     STARTUP
     ============= */
  // auto-start both first items
  startPrincipleIdx(0);
  startStepIdx(0);
  computeScores();

  window.__cpCard = { resetSession, exportCSV, getState: () => JSON.parse(JSON.stringify(state)) };

  window.addEventListener('beforeunload', () => { try { localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(state.history)); } catch(e) {} });

})();