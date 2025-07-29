// @description  Speed read selected text or clipboard content with adjustable WPM
javascript:(async function(){
  if(document.getElementById('srOverlay')) return;

  // Try selection, then clipboard
  let sel = window.getSelection().toString().trim();
  if (!sel) {
    try {
      sel = await navigator.clipboard.readText();
    } catch (e) {
      alert("No text selected, and clipboard access was denied.");
      return;
    }
  }
  const words = sel.split(/\s+/), total = words.length;
  if (!words.length) return;

  let idx = 0, baseWPM = +sessionStorage.getItem('srWPM') || 300;
  let delay = 60000 / baseWPM, timer;

  const o = document.createElement('div');
  o.id = 'srOverlay';
  Object.assign(o.style, {
    position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
    background: '#222', color: '#fff', padding: '20px', borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 99999,
    fontFamily: 'sans-serif', textAlign: 'center', width: '400px'
  });
  setTimeout(() => document.addEventListener('click', outside), 0);
  function outside(e){ if (!o.contains(e.target)) cleanup(); }

  // Progress bar
  const pb = document.createElement('div');
  Object.assign(pb.style, {
    position: 'absolute', top: 0, left: 0, height: '4px',
    background: '#4caf50', width: '0%'
  });
  o.appendChild(pb);

  // Close button
  const x = document.createElement('span');
  x.textContent = '×';
  x.title = 'Close';
  Object.assign(x.style, {
    position: 'absolute', top: '6px', right: '10px',
    cursor: 'pointer', fontSize: '18px', color: '#aaa'
  });
  x.onclick = cleanup;
  o.appendChild(x);

  // Word display
  const disp = document.createElement('div');
  Object.assign(disp.style, {
    fontSize: '2em', minHeight: '1.2em',
    margin: '20px 0', whiteSpace: 'nowrap'
  });
  o.appendChild(disp);

  // Controls
  const ctr = document.createElement('div');
  ctr.style.margin = '10px 0';

  const minus = document.createElement('button');
  minus.textContent = '–';
  minus.style.marginRight = '8px';
  minus.onclick = () => updateWPM(baseWPM - 10);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 100; slider.max = 1000; slider.step = 10;
  slider.value = baseWPM;
  slider.oninput = function () { updateWPM(+this.value); };

  const plus = document.createElement('button');
  plus.textContent = '+';
  plus.style.marginLeft = '8px';
  plus.onclick = () => updateWPM(baseWPM + 10);

  const lbl = document.createElement('div');
  lbl.textContent = 'WPM: ' + baseWPM;
  lbl.style.marginTop = '6px';

  ctr.append(minus, slider, plus);
  o.append(ctr, lbl);
  document.body.append(o);

  function updateWPM(v) {
    baseWPM = Math.max(50, Math.min(2000, v));
    delay = 60000 / baseWPM;
    sessionStorage.setItem('srWPM', baseWPM);
    slider.value = baseWPM;
    lbl.textContent = 'WPM: ' + baseWPM;
  }

  function show() {
    if (idx < 0) idx = 0;
    if (idx >= total) return cleanup();

    const w = words[idx++];
    const orp = Math.floor((w.length - 1) / 2);

    const frag = document.createDocumentFragment();
    frag.appendChild(document.createTextNode(w.slice(0, orp)));

    const mid = document.createElement('span');
    mid.style.color = 'orange';
    mid.style.fontWeight = 'bold';
    mid.textContent = w[orp];
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

  show();

  function key(e) {
    if (e.key === 'Escape') cleanup();
    else if (e.key === 'ArrowLeft') { clearTimeout(timer); idx -= 2; show(); }
    else if (e.key === 'ArrowRight') { clearTimeout(timer); show(); }
  }

  function cleanup() {
    clearTimeout(timer);
    document.removeEventListener('keydown', key);
    document.removeEventListener('click', outside);
    const el = document.getElementById('srOverlay');
    if (el) document.body.removeChild(el);
  }

  document.addEventListener('keydown', key);
})();