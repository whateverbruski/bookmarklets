javascript:(function(){
  if (document.getElementById('sbb-container')) return;

  const d = document;
  const selectedText = window.getSelection().toString().trim();
  const STORAGE_KEY = 'searchBookmarkletPrefs';
  const defaultPrefs = { google: true, youtube: false, shopify: true, gmail: false };
  const savedPrefs = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaultPrefs;

  const b = d.createElement('div');
  b.id = 'sbb-container';
  Object.assign(b.style, {
    position: 'fixed', top: '20%', left: '50%',
    transform: 'translateX(-50%)', zIndex: 9999999,
    background: '#222', color: '#fff',
    padding: '20px', borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    fontFamily: 'sans-serif', minWidth: '320px',
    cursor: 'move'
  });

  // Drag logic
  let isDragging = false;
  let offsetX = 0, offsetY = 0;
  b.addEventListener('mousedown', function(e) {
    if (e.target.closest('.sbb-nodrag')) return;
    isDragging = true;
    const rect = b.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    b.style.transition = 'none';
  });
  d.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    e.preventDefault();
    b.style.left = e.clientX - offsetX + 'px';
    b.style.top = e.clientY - offsetY + 'px';
    b.style.transform = 'none';
  });
  d.addEventListener('mouseup', () => { isDragging = false; });

  // Close button
  const close = d.createElement('span');
  close.textContent = '×';
  Object.assign(close.style, {
    position: 'absolute', top: '6px', right: '10px',
    fontSize: '18px', cursor: 'pointer', color: '#aaa'
  });
  close.onclick = () => d.body.removeChild(b);
  b.appendChild(close);

  // Label
  const label = d.createElement('label');
  label.textContent = '🔍 Search query:';
  label.className = 'sbb-nodrag';
  label.style.display = 'block';
  b.appendChild(label);

  // Input
  const input = d.createElement('input');
  input.className = 'sbb-nodrag';
  input.type = 'text';
  input.value = selectedText;
  input.setAttribute('tabindex', '0');
  input.setAttribute('autocomplete', 'off');
  Object.assign(input.style, {
    all: 'unset',
    fontSize: '16px',
    padding: '6px',
    width: '300px',
    margin: '8px 0',
    background: '#111',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '6px',
    display: 'block',
    pointerEvents: 'auto'
  });
  b.appendChild(input);

  const engines = [
    { name: 'Google', value: 'google' },
    { name: 'YouTube', value: 'youtube' },
    { name: 'Help Center', value: 'shopify' },
    { name: 'Gmail', value: 'gmail' }
  ];

  const engineState = {};

  engines.forEach(({ name, value }) => {
    const wrap = d.createElement('label');
    wrap.className = 'sbb-nodrag';
    wrap.style.display = 'block';
    wrap.style.cursor = 'auto';

    const box = d.createElement('input');
    box.type = 'checkbox';
    box.value = value;
    box.checked = !!savedPrefs[value];
    box.style.pointerEvents = 'auto';
    engineState[value] = box.checked;

    box.addEventListener('change', () => {
      engineState[value] = box.checked;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(engineState));
    });

    wrap.appendChild(box);
    wrap.appendChild(d.createTextNode(' ' + name));
    b.appendChild(wrap);
  });

  const btn = d.createElement('button');
  btn.textContent = 'Search';
  btn.className = 'sbb-nodrag';
  Object.assign(btn.style, {
    fontSize: '16px', padding: '6px 12px', marginTop: '10px',
    background: '#4caf50', color: '#fff', border: 'none',
    borderRadius: '6px', cursor: 'pointer',
    pointerEvents: 'auto'
  });
  btn.onmouseover = () => btn.style.background = '#45a049';
  btn.onmouseout = () => btn.style.background = '#4caf50';
  b.appendChild(btn);

  d.body.appendChild(b);
  input.focus();
  input.select();

  function searchURLs(q) {
    return {
      google: "https://www.google.com/search?q=" + encodeURIComponent(q),
      youtube: "https://www.youtube.com/results?search_query=" + encodeURIComponent(q),
      shopify: "https://help.shopify.com/en/search?q=" + encodeURIComponent(q),
      gmail: "https://mail.google.com/mail/u/1/#search/" + encodeURIComponent(q)
    };
  }

  function doSearch() {
    const q = input.value.trim();
    if (!q) return;
    const boxes = b.querySelectorAll('input[type="checkbox"]:checked');
    const engines = [...boxes].map(e => e.value);
    engines.forEach(e => engineState[e] = true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(engineState));

    const urls = searchURLs(q);
    engines.forEach(e => window.open(urls[e], '_blank'));
    d.body.removeChild(b);
  }

  btn.onclick = doSearch;
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && d.getElementById('sbb-container')) {
      d.body.removeChild(b);
    }
  });
})();
