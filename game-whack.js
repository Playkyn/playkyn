// game-whack.js
(function() {
  const { ComboTracker, popup, burst, sfx, unlockAudio } = window.GameFX || {};

  const DEFAULT_WORDS = [
    { en: 'apple', zh: '苹果' }, { en: 'banana', zh: '香蕉' }, { en: 'orange', zh: '橙子' },
    { en: 'grape', zh: '葡萄' }, { en: 'water', zh: '水' }, { en: 'fire', zh: '火' },
    { en: 'earth', zh: '地球' }, { en: 'wind', zh: '风' }, { en: 'cloud', zh: '云' },
    { en: 'rain', zh: '雨' }, { en: 'snow', zh: '雪' }, { en: 'sun', zh: '太阳' },
    { en: 'moon', zh: '月亮' }, { en: 'star', zh: '星星' }, { en: 'sky', zh: '天空' },
    { en: 'sea', zh: '海' }, { en: 'river', zh: '河流' }, { en: 'mountain', zh: '山' },
    { en: 'forest', zh: '森林' }, { en: 'flower', zh: '花' }, { en: 'tree', zh: '树' },
    { en: 'bird', zh: '鸟' }, { en: 'fish', zh: '鱼' }, { en: 'tiger', zh: '老虎' },
    { en: 'rabbit', zh: '兔子' }, { en: 'horse', zh: '马' }, { en: 'monkey', zh: '猴子' },
    { en: 'elephant', zh: '大象' }, { en: 'dragon', zh: '龙' }, { en: 'castle', zh: '城堡' }
  ];

  const HOLE_COUNT = 6;
  const ROUND_SECONDS = 60;
  let instance = null;

  function injectStyle() {
    if (document.getElementById('wg-whack-style')) return;
    const s = document.createElement('style');
    s.id = 'wg-whack-style';
    s.textContent = `
      .wg-whack{position:relative;display:flex;flex-direction:column;gap:14px;padding:16px;max-width:720px;margin:0 auto;min-height:100%;box-sizing:border-box;font-family:inherit;color:#3d2463;user-select:none;-webkit-tap-highlight-color:transparent}
      .wg-whack-hud{display:flex;gap:8px}
      .wg-stat{flex:1;background:rgba(255,255,255,.92);border:2px solid rgba(255,255,255,.95);border-radius:14px;padding:8px 10px;text-align:center;line-height:1.2;box-shadow:0 4px 12px rgba(255,107,157,.1)}
      .wg-stat-label{display:block;font-size:11px;opacity:.65;letter-spacing:.06em;font-weight:800}
      .wg-stat b{font-size:20px;font-variant-numeric:tabular-nums;color:var(--pink)}
      .wg-time.urgent{color:#ff6b6b}
      .wg-combo.hot{color:#ffb84d}
      .wg-prompt{display:flex;justify-content:center}
      .wg-speak{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:999px;border:2px solid rgba(255,107,157,.3);background:rgba(255,255,255,.9);color:var(--pink);font-size:15px;font-weight:900;cursor:pointer;transition:transform .15s,background .15s;box-shadow:0 4px 12px rgba(255,107,157,.1)}
      .wg-speak:active{transform:scale(.96);background:rgba(255,107,157,.1)}
      
      /* 洞与地鼠结构 */
      .wg-holes{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding-bottom:20px;}
      @media(max-width:520px){.wg-holes{grid-template-columns:repeat(2,1fr);gap:10px}}
      .wg-hole{position:relative;aspect-ratio:1/1.1;border:none;padding:0;background:transparent;cursor:pointer;overflow:hidden;border-radius:18px;-webkit-tap-highlight-color:transparent}
      
      /* 土坑 */
      .wg-hole::after{
        content:'';position:absolute;left:5%;right:5%;bottom:0;height:35%;
        border-radius:50%;
        background:radial-gradient(ellipse at center, #4a2f1d 0%, #2a1a10 70%, transparent 100%);
        box-shadow:inset 0 8px 12px rgba(0,0,0,.8), 0 2px 0 rgba(255,255,255,.2);
        z-index:1;
      }

      /* 地鼠和牌子整体包裹 */
      .wg-mole-wrap{
        position:absolute;left:0;right:0;bottom:10%;height:90%;
        display:flex;flex-direction:column;align-items:center;justify-content:flex-end;
        transform:translateY(120%);
        transition:transform 300ms cubic-bezier(.34,1.56,.64,1);
        will-change:transform;z-index:2;
      }
      .wg-hole.active .wg-mole-wrap{transform:translateY(0)}
      
      /* 地鼠身体 */
      .wg-mole-body{
        font-size:clamp(40px, 10vw, 56px);
        line-height:1;margin-bottom:-5px;
        animation:wgBob 1.5s ease-in-out infinite alternate;
        text-shadow:0 4px 6px rgba(0,0,0,.2);
      }
      @keyframes wgBob{ from{transform:translateY(0) rotate(-5deg);} to{transform:translateY(-5px) rotate(5deg);} }

      /* 举着的牌子 */
      .wg-sign{
        background:linear-gradient(180deg,#fff5e1,#e6cca3);
        border:3px solid #8b5a2b;
        border-radius:10px;
        padding:8px 12px;
        box-shadow:0 6px 0 #5c3a1e, 0 10px 15px rgba(0,0,0,.3);
        position:relative;
        min-width:70%;
        text-align:center;
        transition:transform .15s, background .15s, border-color .15s;
      }
      /* 牌子上的木纹点缀 */
      .wg-sign::before{
        content:'';position:absolute;top:6px;left:6px;right:6px;bottom:6px;
        border:1px dashed rgba(139, 90, 43, 0.3);border-radius:6px;pointer-events:none;
      }
      /* 钉子 */
      .wg-sign::after{
        content:'';position:absolute;top:-6px;left:50%;transform:translateX(-50%);
        width:10px;height:10px;border-radius:50%;background:#a0a0a0;
        box-shadow:inset -2px -2px 4px rgba(0,0,0,.4), 0 2px 2px rgba(0,0,0,.3);
      }

      .wg-sign-text{
        display:block;font-weight:900;font-size:clamp(14px,3.5vw,18px);color:#5c3a1e;
        word-break:break-word;line-height:1.2;
      }

      /* 敲打状态 */
      .wg-hole.hit .wg-sign { background:linear-gradient(180deg,#d1fae5,#6ee7b7); border-color:#059669; box-shadow:0 6px 0 #046c4e, 0 10px 15px rgba(0,0,0,.3); }
      .wg-hole.hit .wg-sign-text { color:#064e3b; }
      
      .wg-hole.wrong .wg-sign { background:linear-gradient(180deg,#fee2e2,#fca5a5); border-color:#dc2626; box-shadow:0 6px 0 #991b1b, 0 10px 15px rgba(0,0,0,.3); }
      .wg-hole.wrong .wg-sign-text { color:#7f1d1d; }

      .wg-hole.used{pointer-events:none}
      .wg-hole.used .wg-mole-wrap{opacity:.5;filter:grayscale(.8)}
      
      /* 弹窗 */
      .wg-overlay{position:absolute;inset:0;display:grid;place-items:center;padding:20px;background:rgba(255,255,255,.95);backdrop-filter:blur(6px);z-index:20;border-radius:16px}
      .wg-overlay[hidden]{display:none}
      .wg-panel{max-width:360px;width:100%;text-align:center;display:flex;flex-direction:column;gap:14px}
      .wg-panel h3{margin:0;font-size:24px;color:var(--pink)}
      .wg-panel p{margin:0;font-size:14px;line-height:1.6;opacity:.8;font-weight:700}
      .wg-panel .wg-result{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
      .wg-panel .wg-result div{background:rgba(255,107,157,.1);border-radius:12px;padding:10px 16px;min-width:84px}
      .wg-panel .wg-result b{display:block;font-size:22px;color:var(--pink)}
      .wg-panel .wg-result span{font-size:11px;opacity:.65;font-weight:800}
      .wg-btn{appearance:none;border:none;border-radius:14px;padding:14px 18px;font-size:16px;font-weight:900;cursor:pointer;color:#fff;background:linear-gradient(120deg,var(--pink),var(--orange));box-shadow:0 6px 0 rgba(0,0,0,.1);transition:transform .1s,box-shadow .1s}
      .wg-btn:active{transform:translateY(3px);box-shadow:0 3px 0 rgba(0,0,0,.1)}
    `;
    document.head.appendChild(s);
  }

  function normalizeWords(input) {
    const out = [];
    const seen = new Set();
    const src = Array.isArray(input) && input.length ? input : DEFAULT_WORDS;
    for (const w of src) {
      if (!w || !w.en || !w.zh) continue;
      const zh = String(w.zh).trim();
      if (!zh || seen.has(zh)) continue;
      seen.add(zh);
      out.push({ en: String(w.en).trim(), zh });
    }
    if (out.length < HOLE_COUNT) {
      for (const w of DEFAULT_WORDS) {
        if (out.length >= HOLE_COUNT) break;
        if (seen.has(w.zh)) continue;
        seen.add(w.zh);
        out.push(w);
      }
    }
    return out;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildOptions(target, words, count) {
    const used = new Set([target.zh]);
    const pool = [];
    for (const w of shuffle([...words])) {
      if (pool.length >= count - 1) break;
      if (used.has(w.zh)) continue;
      used.add(w.zh);
      pool.push(w.zh);
    }
    return shuffle([target.zh, ...pool]);
  }

  function speak(text) {
    if (window.Speaker && typeof window.Speaker.speak === 'function') {
      window.Speaker.speak(text);
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.75;
      window.speechSynthesis.speak(u);
    }
  }

  function createGame(container, options = {}) {
    unlockAudio();
    injectStyle();

    let rawWords = options.words;
    if (!rawWords || rawWords.length === 0) {
      // 优先使用页面提供的动态词库（取 30 个词以便地鼠游戏随机抽取）
      if (typeof window.getGameWords === 'function') {
        rawWords = window.getGameWords(30, 'all');
      } else if (window.WORDS && Array.isArray(window.WORDS)) {
        rawWords = window.WORDS;
      }
    }
    const words = normalizeWords(rawWords);

    const root = document.createElement('div');
    root.className = 'wg-whack';
    root.innerHTML = `
      <div class="wg-whack-hud">
        <div class="wg-stat"><span class="wg-stat-label">得分</span><b class="wg-score">0</b></div>
        <div class="wg-stat"><span class="wg-stat-label">时间</span><b class="wg-time">${ROUND_SECONDS}</b></div>
        <div class="wg-stat"><span class="wg-stat-label">连击</span><b class="wg-combo">x1</b></div>
      </div>
      <div class="wg-prompt">
        <button class="wg-speak" type="button">🔊 <span class="wg-speak-text">点击听发音</span></button>
      </div>
      <div class="wg-holes"></div>
      <div class="wg-overlay" hidden></div>
    `;
    container.appendChild(root);

    const els = {
      score: root.querySelector('.wg-score'),
      time: root.querySelector('.wg-time'),
      combo: root.querySelector('.wg-combo'),
      speak: root.querySelector('.wg-speak'),
      speakText: root.querySelector('.wg-speak-text'),
      holes: root.querySelector('.wg-holes'),
      overlay: root.querySelector('.wg-overlay')
    };

    const state = {
      running: false, paused: false, destroyed: false,
      score: 0, timeLeft: ROUND_SECONDS * 1000, round: 0,
      target: null, combo: new ComboTracker(800), maxCombo: 0, correct: 0,
      holes: [], raf: 0, lastTick: 0, roundTimeoutAt: 0, nextRoundAt: 0,
      lastShownSec: -1, lastHud: { score: -1, combo: -1 }
    };

    for (let i = 0; i < HOLE_COUNT; i++) {
      const hole = document.createElement('button');
      hole.type = 'button';
      hole.className = 'wg-hole';
      hole.innerHTML = `
        <div class="wg-mole-wrap">
          <div class="wg-sign"><span class="wg-sign-text"></span></div>
          <div class="wg-mole-body">🐹</div>
        </div>
      `;
      hole.addEventListener('click', () => onHoleClick(i));
      els.holes.appendChild(hole);
      state.holes.push(hole);
    }

    function updateScoreHud(force = false) {
      if (force || state.lastHud.score !== state.score) {
        state.lastHud.score = state.score;
        els.score.textContent = String(state.score);
      }
    }
    function updateComboHud(force = false) {
      const c = state.combo.count;
      if (force || state.lastHud.combo !== c) {
        state.lastHud.combo = c;
        els.combo.textContent = 'x' + Math.max(1, c);
        els.combo.classList.toggle('hot', c >= 3);
      }
    }
    function updateTimeHud() {
      const sec = Math.ceil(state.timeLeft / 1000);
      if (sec !== state.lastShownSec) {
        state.lastShownSec = sec;
        els.time.textContent = String(sec);
        els.time.classList.toggle('urgent', sec <= 10);
      }
    }

    function collapseHoles() {
      state.roundTimeoutAt = 0;
      state.holes.forEach(h => {
        h.querySelector('.wg-mole-wrap').style.transitionDelay = '0ms';
        h.classList.remove('active');
      });
    }

    function clearHoleContent() {
      state.holes.forEach(h => {
        h.classList.remove('active', 'used', 'wrong', 'hit');
        h.dataset.zh = '';
        h.querySelector('.wg-sign-text').textContent = '';
        h.querySelector('.wg-mole-body').textContent = '🐹'; // 重置表情
      });
    }

    function pickTarget(exclude) {
      let pool = words.filter(w => w !== exclude);
      if (!pool.length) pool = words;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function nextRound() {
      if (!state.running || state.paused || state.destroyed) return;
      state.round++;
      clearHoleContent();

      const target = pickTarget(state.target);
      state.target = target;
      els.speakText.textContent = '再听一次';
      speak(target.en);

      const options = buildOptions(target, words, HOLE_COUNT);
      const order = shuffle([...state.holes]);
      order.forEach((hole, idx) => {
        const zh = options[idx];
        hole.dataset.zh = zh;
        hole.querySelector('.wg-sign-text').textContent = zh;
        hole.querySelector('.wg-mole-wrap').style.transitionDelay = (idx * 55) + 'ms';
      });
      
      requestAnimationFrame(() => {
        if (!state.running || state.destroyed) return;
        order.forEach(h => h.classList.add('active'));
      });

      const holdMs = Math.max(1400, 2400 - state.round * 60);
      state.roundTimeoutAt = performance.now() + holdMs;
      state.nextRoundAt = 0;
    }

    function onRoundTimeout() {
      state.combo.miss();
      updateComboHud();
      sfx('miss');
      collapseHoles();
      state.nextRoundAt = performance.now() + 360;
    }

    function onHoleClick(i) {
      if (!state.running || state.paused || state.destroyed) return;
      const hole = state.holes[i];
      if (!hole.classList.contains('active') || hole.classList.contains('used')) return;
      const zh = hole.dataset.zh;
      if (!zh) return;

      const rect = hole.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      if (zh === state.target.zh) {
        state.combo.hit();
        state.maxCombo = Math.max(state.maxCombo, state.combo.count);
        const gained = Math.round(10 * state.combo.mult);
        state.score += gained;
        state.correct++;
        updateScoreHud();
        updateComboHud();

        popup('+' + gained, cx, cy, { color: '#ffe066' });
        if (state.combo.count >= 2) popup('COMBO x' + state.combo.count, cx, cy - 36, { color: '#ff9f43', size: 15 });
        burst(cx, cy, 10);
        sfx('hit');
        if (state.combo.count >= 3) sfx('combo', { combo: state.combo.count });

        hole.classList.add('hit');
        hole.querySelector('.wg-mole-body').textContent = '😵'; // 地鼠被打晕
        collapseHoles();
        state.nextRoundAt = performance.now() + 380;
      } else {
        state.combo.miss();
        state.timeLeft = Math.max(0, state.timeLeft - 2000);
        updateComboHud();
        updateTimeHud();

        hole.classList.add('used', 'wrong');
        hole.querySelector('.wg-mole-body').textContent = '😡'; // 地鼠生气了
        popup('-2s', cx, cy, { color: '#ff6b6b' });
        burst(cx, cy, 6, ['#ff6b6b', '#ff9f43']);
        sfx('miss');
      }
    }

    function tick(now) {
      if (state.destroyed) return;
      state.raf = requestAnimationFrame(tick);
      if (!state.running || state.paused) { state.lastTick = now; return; }

      const dt = Math.min(now - state.lastTick, 250);
      state.lastTick = now;
      state.timeLeft = Math.max(0, state.timeLeft - dt);
      updateTimeHud();

      if (state.timeLeft <= 0) { endGame(); return; }
      if (state.roundTimeoutAt && now >= state.roundTimeoutAt) { state.roundTimeoutAt = 0; onRoundTimeout(); }
      if (state.nextRoundAt && now >= state.nextRoundAt) { state.nextRoundAt = 0; nextRound(); }
    }

    function renderOverlay(html) {
      els.overlay.innerHTML = `<div class="wg-panel">${html}</div>`;
      els.overlay.hidden = false;
    }

    function showStart() {
      renderOverlay(`<h3>🔨 单词地鼠</h3><p>听发音，从钻出的地鼠手里敲出正确的中文释义。<br>60 秒限时，连击越高得分倍率越高。</p><button class="wg-btn" data-action="start">开始游戏</button>`);
    }

    function showResult() {
      renderOverlay(`<h3>时间到！</h3><div class="wg-result"><div><b>${state.score}</b><span>得分</span></div><div><b>${state.correct}</b><span>答对</span></div><div><b>x${Math.max(1, state.maxCombo)}</b><span>最高连击</span></div></div><button class="wg-btn" data-action="start">再来一局</button>`);
    }

    function startGame() {
      state.running = true;
      state.paused = false;
      state.score = 0;
      state.timeLeft = ROUND_SECONDS * 1000;
      state.round = 0;
      state.correct = 0;
      state.maxCombo = 0;
      state.target = null;
      state.combo.reset();
      state.lastShownSec = -1;
      state.roundTimeoutAt = 0;
      state.nextRoundAt = 0;
      state.lastTick = performance.now();
      updateScoreHud(true);
      updateComboHud(true);
      updateTimeHud();
      els.overlay.hidden = true;
      clearHoleContent();
      nextRound();
    }

    function endGame() {
      state.running = false;
      state.roundTimeoutAt = 0;
      state.nextRoundAt = 0;
      collapseHoles();
      if (window.Speaker && typeof window.Speaker.stop === 'function') window.Speaker.stop();
      else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      sfx('win');
      showResult();
    }

    els.overlay.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'start') { unlockAudio(); startGame(); }
    });

    els.speak.addEventListener('click', () => { if (state.target) speak(state.target.en); });
    
    const onVisibility = () => {
      if (document.hidden && state.running && !state.paused) {
        state.paused = true;
        renderOverlay(`<h3>已暂停</h3><p>离开页面时自动暂停。</p><button class="wg-btn" id="wg-btn-resume">继续游戏</button>`);
        document.getElementById('wg-btn-resume').onclick = () => {
          state.paused = false;
          state.lastTick = performance.now();
          els.overlay.hidden = true;
        };
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    showStart();
    state.raf = requestAnimationFrame(tick);

    return {
      destroy() {
        if (state.destroyed) return;
        state.destroyed = true;
        state.running = false;
        cancelAnimationFrame(state.raf);
        document.removeEventListener('visibilitychange', onVisibility);
        if (window.Speaker && typeof window.Speaker.stop === 'function') window.Speaker.stop();
        else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        root.remove();
      }
    };
  }

  // 全局入口
  window.startWhackGame = function() {
    showScreen('s-game-whack');
    
    const container = document.getElementById('whack-container');
    if (!container) return;

    if (instance) {
      try { instance.destroy(); } catch(e){}
      instance = null;
    }
    container.innerHTML = '';
    
      // 在这里调用动态取词
    let gameWords = null;
    if (typeof window.getGameWords === 'function') {
      gameWords = window.getGameWords(30, 'all');
    } else {
      gameWords = window.WORDS;
    }
    
    instance = createGame(container, { words: gameWords });

    const backBtn = document.getElementById('btnWhackBack');
    if (backBtn) {
      backBtn.onclick = (e) => {
        if (e) e.preventDefault();
        try { if (typeof Sfx !== 'undefined') Sfx.click(); } catch(err){}
        try {
          if (instance) {
            instance.destroy();
            instance = null;
          }
        } catch (err) {
          console.warn('销毁实例报错：', err);
        }
        container.innerHTML = '';
        try {
          goHome();
        } catch (err) {
          if (typeof showScreen === 'function') showScreen('s-home');
        }
      };
    }
  };
})();