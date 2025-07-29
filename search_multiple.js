javascript:(function(){
  if (document.getElementById('searchBoxBookmarklet')) return;

  const d = document;
  const b = d.createElement('div');
  b.id = 'searchBoxBookmarklet';
  Object.assign(b.style, {
    position: 'fixed', top: '20%', left: '50%',
    transform: 'translateX(-50%)', zIndex: 9999,
    background: '#222', color: '#fff',
    padding: '20px', borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    fontFamily: 'sans-serif', minWidth: '320px'
  });

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
  label.style.display = 'block';
  b.appendChild(label);

  // Input
  const input = d.createElement('input');
  input.type = 'text';
  input.placeholder = 'e.g. prompt injection';
  input.id = 'searchQuery';
  Object.assign(input.style, {
    fontSize: '16px', padding: '6px', width: '300px',
    margin: '8px 0', background: '#111', color: '#fff',
    border: '1px solid #444', borderRadius: '6px'
  });
  b.appendChild(input);

  // Checkboxes
  const engines = [
    { name: 'Google', value: 'google', checked: true },
    { name: 'YouTube', value: 'youtube' },
    { name: 'Shopify Help Center', value: 'shopify', checked: true },
    { name: 'Gmail', value: 'gmail' }
  ];

  engines.forEach(({ name, value, checked }) => {
    const wrap = d.createElement('label');
    wrap.style.display = 'block';
    const box = d.createElement('input');
    box.type = 'checkbox';
    box.value = value;
    if (checked) box.checked = true;
    wrap.appendChild(box);
    wrap.appendChild(d.createTextNode(' ' + name));
    b.appendChild(wrap);
  });

  // Button
  const btn = d.createElement('button');
  btn.textContent = 'Search';
  Object.assign(btn.style, {
    fontSize: '16px', padding: '6px 12px', marginTop: '10px',
    background: '#4caf50', color: '#fff', border: 'none',
    borderRadius: '6px', cursor: 'pointer'
  });
  btn.onmouseover = () => btn.style.background = '#45a049';
  btn.onmouseout = () => btn.style.background = '#4caf50';

  b.appendChild(btn);

  // Add to DOM
  d.body.appendChild(b);

  // Search logic
  function searchURLs(q) {
    return {
      google: "https://www.google.com/search?q=" + encodeURIComponent(q),
      youtube: "https://www.youtube.com/results?search_query=" + encodeURIComponent(q),
      shopify: "https://help.shopify.com/en/search?q=" + encodeURIComponent(q),
      gmail: "https://mail.google.com/mail/u/0/#search/" + encodeURIComponent(q)
    };
  }

  function doSearch() {
    const q = input.value.trim();
    if (!q) return;
    const boxes = b.querySelectorAll('input[type="checkbox"]:checked');
    const engines = [...boxes].map(e => e.value);
    const urls = searchURLs(q);
    engines.forEach(e => window.open(urls[e], '_blank'));
    d.body.removeChild(b);
  }

  // Attach handlers
  btn.onclick = doSearch;
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && d.getElementById('searchBoxBookmarklet')) {
      d.body.removeChild(b);
    }
  });
})();


