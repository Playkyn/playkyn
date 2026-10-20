window.PK_HUD = (function() {
  let injected = new Set();
  function ensureStyle(id, css) {
    if (injected.has(id) || document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id; s.textContent = css;
    document.head.appendChild(s);
    injected.add(id);
  }
  function speak(text) {
    if (typeof window.playkynSpeak === 'function') {
      try { window.playkynSpeak(text); return; } catch {}
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.9;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch {}
  }
  const HUD_CSS = `
    .pk-hud{display:flex;justify-content:space-around;align-items:center;padding:10px 8px;font:600 15px/1 system-ui,sans-serif;color:#e8f0ff;background:rgba(255,255,255,.06);border-radius:12px;margin-bottom:10px}
    .pk-hud-item{display:flex;flex-direction:column;align-items:center;gap:4px}
    .pk-hud-label{font-size:11px;opacity:.6;font-weight:500}
    .pk-hud-item b{font-size:18px;font-variant-numeric:tabular-nums}
    .pk-toast{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);padding:8px 18px;border-radius:20px;background:rgba(0,0,0,.75);color:#fff;font:600 16px/1.4 system-ui,sans-serif;pointer-events:none;opacity:0;transition:opacity .25s}
    .pk-toast.show{opacity:1}
    .pk-result{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(8,12,24,.82);backdrop-filter:blur(4px);z-index:20}
    .pk-result-card{width:78%;max-width:320px;padding:24px 20px;border-radius:18px;background:#1b2233;color:#e8f0ff;text-align:center;font:400 14px/1.6 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.5)}
    .pk-result-card h3{margin:0 0 6px;font-size:22px}
    .pk-result-card .pk-result-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.08)}
    .pk-result-card button{margin-top:18px;width:100%;padding:12px;border:0;border-radius:12px;background:#3b82f6;color:#fff;font:600 16px system-ui,sans-serif;cursor:pointer;touch-action:manipulation}
    .pk-result-card button.ghost{background:rgba(255,255,255,.12);margin-top:8px}
  `;
  function createHud(host) {
    ensureStyle('pk-hud-style', HUD_CSS);
    const bar = document.createElement('div'); bar.className = 'pk-hud';
    bar.innerHTML = '<div class="pk-hud-item"><span class="pk-hud-label">分数</span><b data-k="score">0</b></div><div class="pk-hud-item"><span class="pk-hud-label">连击</span><b data-k="combo">0</b></div><div class="pk-hud-item"><span class="pk-hud-label">时间</span><b data-k="time">--</b></div>';
    host.appendChild(bar);
    const ref = { score: bar.querySelector('[data-k="score"]'), combo: bar.querySelector('[data-k="combo"]'), time: bar.querySelector('[data-k="time"]') };
    const toast = document.createElement('div'); toast.className = 'pk-toast'; host.appendChild(toast);
    let toastTimer = 0;
    function setScore(v) { ref.score.textContent = v; }
    function setCombo(v) { ref.combo.textContent = v; }
    function setTime(v) { ref.time.textContent = v; }
    function showToast(msg, ms = 900) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), ms); }
    function showResult({ win, title, rows = [], onRestart, onExit }) {
      const mask = document.createElement('div'); mask.className = 'pk-result';
      const card = document.createElement('div'); card.className = 'pk-result-card';
      card.innerHTML = `<h3>${title || (win ? '通关！' : '再来一次')}</h3>` + rows.map(r => `<div class="pk-result-row"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
      const btn = document.createElement('button'); btn.textContent = '再玩一局';
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); mask.remove(); onRestart?.(); });
      card.appendChild(btn);
      if (onExit) { const g = document.createElement('button'); g.className = 'ghost'; g.textContent = '返回'; g.addEventListener('pointerdown', (e) => { e.preventDefault(); mask.remove(); onExit(); }); card.appendChild(g); }
      mask.appendChild(card); host.appendChild(mask); return mask;
    }
    function destroy() { clearTimeout(toastTimer); bar.remove(); toast.remove(); }
    return { el: bar, setScore, setCombo, setTime, showToast, showResult, destroy };
  }
  return { ensureStyle, speak, createHud };
})();