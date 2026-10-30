// game-feedback.js
(function() {
  const FX_LAYER_ID = 'fx-layer';
  let fxLayer = null;
  let styleInjected = false;
  let popupCount = 0;
  const MAX_POPUPS = 12;

  function ensureStyle() {
    if (styleInjected) return;
    styleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      #${FX_LAYER_ID}{position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden}
      .fx-popup{position:absolute;transform:translate(-50%,-50%);font-weight:800;font-size:18px;color:#fff;white-space:nowrap;text-shadow:0 2px 8px rgba(0,0,0,.45);animation:fxFloatUp 620ms cubic-bezier(.22,1,.36,1) forwards;will-change:transform,opacity;}
      @keyframes fxFloatUp{0%{transform:translate(-50%,-50%) scale(.6);opacity:0}18%{transform:translate(-50%,-50%) scale(1.15);opacity:1}40%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-140%) scale(.85);opacity:0}}
      .fx-particle{position:absolute;width:8px;height:8px;border-radius:2px;transform:translate(-50%,-50%);will-change:transform,opacity;}
    `;
    document.head.appendChild(style);
  }

  function ensureFxLayer() {
    if (fxLayer && document.body.contains(fxLayer)) return fxLayer;
    fxLayer = document.getElementById(FX_LAYER_ID);
    if (!fxLayer) {
      fxLayer = document.createElement('div');
      fxLayer.id = FX_LAYER_ID;
      document.body.appendChild(fxLayer);
    }
    return fxLayer;
  }

  class ComboTracker {
    constructor(windowMs = 800) { this.windowMs = windowMs; this.count = 0; this.lastHit = 0; }
    hit() {
      const now = performance.now();
      this.count = (this.lastHit && now - this.lastHit <= this.windowMs) ? this.count + 1 : 1;
      this.lastHit = now;
      return this.count;
    }
    miss() { this.count = 0; this.lastHit = 0; }
    reset() { this.count = 0; this.lastHit = 0; }
    get mult() { if (this.count >= 5) return 2; if (this.count >= 3) return 1.5; return 1; }
  }

  function popup(text, x, y, opts = {}) {
    ensureStyle();
    const layer = ensureFxLayer();
    if (popupCount >= MAX_POPUPS) {
      const oldest = layer.querySelector('.fx-popup');
      if (oldest) oldest.remove();
      popupCount = Math.max(0, popupCount - 1);
    }
    const el = document.createElement('span');
    el.className = 'fx-popup';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (opts.color) el.style.color = opts.color;
    if (opts.size) el.style.fontSize = opts.size + 'px';
    layer.appendChild(el);
    popupCount++;
    el.addEventListener('animationend', () => { el.remove(); popupCount--; }, { once: true });
  }

  const DEFAULT_COLORS = ['#ffd93d', '#ff6b6b', '#6bcbff', '#6bd88a', '#c792ff'];
  function burst(x, y, count = 10, colors = DEFAULT_COLORS) {
    ensureStyle();
    const layer = ensureFxLayer();
    for (let i = 0; i < count; i++) {
      const el = document.createElement('i');
      el.className = 'fx-particle';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.background = colors[i % colors.length];
      layer.appendChild(el);
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 70;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const rot = (Math.random() * 2 - 1) * 360;
      const anim = el.animate([
        { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0) rotate(${rot}deg)`, opacity: 0 }
      ], { duration: 420 + Math.random() * 180, easing: 'cubic-bezier(.22,1,.36,1)' });
      anim.onfinish = () => el.remove();
    }
  }

  let audioCtx = null;
  function getCtx() {
    if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; audioCtx = new AC(); }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function unlockAudio() { getCtx(); }
  function tone(ctx, { freq, start, dur, type = 'square', vol = 0.1, endFreq = null }) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(start); osc.stop(start + dur + 0.02);
  }
  function sfx(type, opts = {}) {
    const ctx = getCtx(); if (!ctx) return;
    const t = ctx.currentTime;
    switch (type) {
      case 'hit': tone(ctx, { freq: 880, endFreq: 440, start: t, dur: 0.07, type: 'square', vol: 0.12 }); break;
      case 'match': tone(ctx, { freq: 660, start: t, dur: 0.08, type: 'triangle', vol: 0.13 }); tone(ctx, { freq: 990, start: t + 0.07, dur: 0.1, type: 'triangle', vol: 0.13 }); break;
      case 'combo': {
        const n = Math.min(opts.combo || 1, 12);
        const base = 620 * (1 + n * 0.07);
        tone(ctx, { freq: base, start: t, dur: 0.06, type: 'square', vol: 0.09 });
        tone(ctx, { freq: base * 1.5, start: t + 0.05, dur: 0.07, type: 'square', vol: 0.08 });
        break;
      }
      case 'miss': tone(ctx, { freq: 150, endFreq: 90, start: t, dur: 0.12, type: 'sawtooth', vol: 0.1 }); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => tone(ctx, { freq: f, start: t + i * 0.09, dur: 0.14, type: 'triangle', vol: 0.12 })); break;
    }
  }

  // 挂载到全局对象
  window.GameFX = { ComboTracker, popup, burst, sfx, unlockAudio };
})();