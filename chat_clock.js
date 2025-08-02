javascript:(function() {
  const STYLE_ID = '__beacon_timer_bar';
  if (document.getElementById(STYLE_ID)) return alert("Timer already running!");

  // === CONFIG ===
  const config = {
    merchantSelector: '.merchant-msg', // placeholder - update this
    agentSelector: '.agent-msg',       // placeholder - update this
    timeFormat: 'HH:MM',               // assume visible timestamps for now
    alertThresholds: [180, 300, 420],  // in seconds
  };

  // === UTILS ===
  function parseTime(str) {
    const [h, m] = str.trim().split(':').map(Number);
    const now = new Date();
    const msgTime = new Date(now);
    msgTime.setHours(h, m, 0, 0);
    if (msgTime > now) msgTime.setHours(h - 12, m); // crude AM/PM guard
    return msgTime;
  }

  function getLastMessageTime(selector) {
    const messages = [...document.querySelectorAll(selector)];
    if (messages.length === 0) return null;
    const last = messages[messages.length - 1];
    const timeStr = last.querySelector('.timestamp')?.innerText || ''; // placeholder
    return parseTime(timeStr);
  }

  // === UI ELEMENTS ===
  const bar = document.createElement('div');
  bar.id = STYLE_ID;
  bar.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0;
    background: #111;
    color: #0f0;
    font-family: monospace;
    font-size: 14px;
    padding: 4px 8px;
    display: flex;
    justify-content: space-between;
    z-index: 999999;
  `;
  document.body.appendChild(bar);

  const merchantTimer = document.createElement('span');
  const agentTimer = document.createElement('span');
  bar.append(merchantTimer, agentTimer);

  // === ALERT SOUND ===
  const beep = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  beep.volume = 0.3;

  let lastMerchantTime = getLastMessageTime(config.merchantSelector);
  let lastAgentTime = getLastMessageTime(config.agentSelector);

  // === TIMER LOOP ===
  setInterval(() => {
    const now = new Date();
    const merchDiff = lastMerchantTime ? Math.floor((now - lastMerchantTime) / 1000) : '-';
    const agentDiff = lastAgentTime ? Math.floor((now - lastAgentTime) / 1000) : '-';

    merchantTimer.textContent = `🧑‍💼 Merchant: ${formatDuration(merchDiff)}`;
    agentTimer.textContent = `👤 You: ${formatDuration(agentDiff)}`;

    config.alertThresholds.forEach(threshold => {
      if (merchDiff === threshold || agentDiff === threshold) {
        bar.style.background = '#500';
        beep.play().catch(() => {});
      }
    });

  }, 1000);

  function formatDuration(s) {
    if (typeof s !== 'number') return '--:--';
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  }
})();