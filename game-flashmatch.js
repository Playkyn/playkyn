// game-flashmatch.js
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

  const DEFAULT_PAIRS = 6;
  const MATCH_DELAY = 320;
  const MISMATCH_DELAY = 850;
  let instance = null;

  function injectStyle() {
    if (document.getElementById('wg-fm-style')) return;
    const s = document.createElement('style');
    s.id = 'wg-fm-style';
    s.textContent = `
      .wg-fm{position:relative;display:flex;flex-direction:column;gap:14px;padding:16px;max-width:760px;margin:0 auto;min-height:100%;box-sizing:border-box;font-family:inherit;color:#3d2463;user-select:none;-webkit-tap-highlight-color:transparent}
      .wg-fm-hud{display:flex;gap:8px}
      .wg-stat{flex:1;background:rgba(255,255,255,.92);border:2px solid rgba(255,255,255,.95);border-radius:14px;padding:8px 10px;text-align:center;line-height:1.2;box-shadow:0 4px 12px rgba(255,107,157,.1)}
      .wg-stat-label{display:block;font-size:11px;opacity:.65;letter-spacing:.06em;font-weight:800}
      .wg-stat b{font-size:20px;font-variant-numeric:tabular-nums;color:var(--pink)}
      .wg-combo.hot{color:#ffb84d}
      
      .wg-board{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      @media(min-width:560px){.wg-board{grid-template-columns:repeat(4,1fr);gap:12px}}
      
      .wg-card{position:relative;perspective:900px;aspect-ratio:3/4;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .wg-card-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform 420ms cubic-bezier(.22,1,.36,1)}
      .wg-card.flipped .wg-card-inner{transform:rotateY(180deg)}
      
      .wg-card-face{position:absolute;inset:0;border-radius:14px;display:grid;place-items:center;padding:8px;text-align:center;-webkit-backface-visibility:hidden;backface-visibility:hidden;box-sizing:border-box;overflow:hidden;word-break:break-word;line-height:1.2}
      .wg-card-front{background:linear-gradient(160deg,#3a4b8f,#26315e);border:2px solid rgba(255,255,255,.2);box-shadow:0 6px 0 rgba(0,0,0,.2),0 2px 0 rgba(255,255,255,.2) inset}
      .wg-card-front::before{content:'✦';font-size:32px;color:rgba(255,255,255,.4);opacity:0.8}
      .wg-card-back{transform:rotateY(180deg);background:linear-gradient(160deg,#fff,#f0f4ff);color:#1e2b58;font-weight:900;font-size:clamp(14px,3.6vw,18px);border:2px solid #fff;box-shadow:0 6px 0 rgba(0,0,0,.1)}
      .wg-card-back[data-type="def"]{font-weight:800;font-size:clamp(12px,3.2vw,16px)}
      
      .wg-card.matched{cursor:default;pointer-events:none;}
      .wg-card.matched .wg-card-back{background:linear-gradient(160deg,#d8ffe0,#a8f0bd);box-shadow:0 0 0 3px #41c66b,0 0 24px rgba(65,198,107,.6);animation:fmMatchPulse 420ms ease-out}
      @keyframes fmMatchPulse{
        0%{transform:rotateY(180deg) scale(1)}
        50%{transform:rotateY(180deg) scale(1.08)}
        100%{transform:rotateY(180deg) scale(1)}
      }
      
      .wg-card.shake .wg-card-inner{animation:fmShake 380ms ease-in-out}
      @keyframes fmShake{
        0%,100%{transform:rotateY(180deg) translateX(0)}
        20%{transform:rotateY(180deg) translateX(-6px)}
        40%{transform:rotateY(180deg) translateX(6px)}
        60%{transform:rotateY(180deg) translateX(-4px)}
        80%{transform:rotateY(180deg) translateX(4px)}
      }
      
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
    if (out.length < DEFAULT_PAIRS) {
      for (const w of DEFAULT_WORDS) {
        if (out.length >= DEFAULT_PAIRS) break;
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

  function buildDeck(words, pairCount) {
    const picked = shuffle([...words]).slice(0, pairCount);
    const cards = [];
    picked.forEach((w, i) => {
      cards.push({ pairId: i, type: 'word', text: w.en });
      cards.push({ pairId: i, type: 'def', text: w.zh });
    });
    return shuffle(cards);
  }

  function createGame(container, options = {}) {
    unlockAudio();
    injectStyle();

    // 🌟 修改点 1：动态获取用户当前选中的词库
    let rawWords = options.words;
    if (!rawWords || rawWords.length === 0) {
      if (typeof window.getGameWords === 'function') {
        rawWords = window.getGameWords(15, 'all'); // 取15个词供随机配对
      } else if (window.WORDS && Array.isArray(window.WORDS)) {
        rawWords = window.WORDS;
      }
    }
    const words = normalizeWords(rawWords);
    
    // 如果词库太少，动态减少对子数
    const pairCount = Math.min(DEFAULT_PAIRS, words.length);

    const root = document.createElement('div');
    root.className = 'wg-fm';
    root.innerHTML = `
      <div class="wg-fm-hud">
        <div class="wg-stat"><span class="wg-stat-label">用时</span><b class="fm-time">0.0s</b></div>
        <div class="wg-stat"><span class="wg-stat-label">步数</span><b class="fm-moves">0</b></div>
        <div class="wg-stat"><span class="wg-stat-label">连击</span><b class="fm-combo">x1</b></div>
      </div>
      <div class="wg-board"></div>
      <div class="wg-overlay" hidden></div>
    `;
    container.appendChild(root);

    const els = {
      time: root.querySelector('.fm-time'),
      moves: root.querySelector('.fm-moves'),
      combo: root.querySelector('.fm-combo'),
      board: root.querySelector('.wg-board'),
      overlay: root.querySelector('.wg-overlay')
    };

    const state = {
      running: false, paused: false, destroyed: false, locked: false,
      cards: [], cardEls: [], flipped: [],
      moves: 0, score: 0, combo: new ComboTracker(1200), maxCombo: 0,
      elapsed: 0, timerStarted: false, resolveAt: 0, pendingResolve: null,
      raf: 0, lastTick: 0, lastShownTenth: -1, lastHud: { moves: -1, combo: -1 }
    };

    function updateMovesHud(force = false) {
      if (force || state.lastHud.moves !== state.moves) {
        state.lastHud.moves = state.moves;
        els.moves.textContent = String(state.moves);
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
      const tenth = Math.floor(state.elapsed / 100);
      if (tenth !== state.lastShownTenth) {
        state.lastShownTenth = tenth;
        els.time.textContent = (state.elapsed / 1000).toFixed(1) + 's';
      }
    }

    function renderCard(idx) {
      const el = state.cardEls[idx];
      const card = state.cards[idx];
      el.classList.toggle('flipped', card.flipped || card.matched);
      el.classList.toggle('matched', !!card.matched);
    }

    function buildBoard() {
      els.board.innerHTML = '';
      state.cardEls = [];
      state.cards = buildDeck(words, pairCount);

      state.cards.forEach((card, idx) => {
        const el = document.createElement('div');
        el.className = 'wg-card';
        el.innerHTML = `
          <div class="wg-card-inner">
            <div class="wg-card-face wg-card-front"></div>
            <div class="wg-card-face wg-card-back" data-type="${card.type}">${card.text}</div>
          </div>
        `;
        el.addEventListener('click', () => onCardClick(idx));
        els.board.appendChild(el);
        state.cardEls.push(el);
      });
    }

    function onCardClick(idx) {
      if (!state.running || state.paused || state.destroyed || state.locked) return;
      const card = state.cards[idx];
      if (card.matched || card.flipped) return;

      if (!state.timerStarted) {
        state.timerStarted = true;
        state.lastTick = performance.now();
      }

      card.flipped = true;
      renderCard(idx);
      state.flipped.push(idx);

      // 播放单词发音
      if (card.type === 'word' && window.Speaker && typeof window.Speaker.speak === 'function') {
        window.Speaker.speak(card.text);
      }

      if (state.flipped.length === 2) {
        state.locked = true;
        state.moves++;
        updateMovesHud();
        const [a, b] = state.flipped;
        const isMatch = state.cards[a].pairId === state.cards[b].pairId;
        state.pendingResolve = { a, b, isMatch };
        state.resolveAt = performance.now() + (isMatch ? MATCH_DELAY : MISMATCH_DELAY);
      }
    }

    function applyResolve() {
      const pending = state.pendingResolve;
      if (!pending) return;
      state.pendingResolve = null;
      const { a, b, isMatch } = pending;

      if (isMatch) {
        state.cards[a].matched = true;
        state.cards[b].matched = true;
        renderCard(a);
        renderCard(b);

        state.combo.hit();
        state.maxCombo = Math.max(state.maxCombo, state.combo.count);
        const gained = Math.round(20 * state.combo.mult);
        state.score += gained;
        updateComboHud();

        const rect = state.cardEls[b].getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        popup('+' + gained, cx, cy, { color: '#9ff0a8' });
        if (state.combo.count >= 2) {
          popup('COMBO x' + state.combo.count, cx, cy - 36, { color: '#ff9f43', size: 15 });
        }
        burst(cx, cy, 12);
        sfx('match');
        if (state.combo.count >= 3) sfx('combo', { combo: state.combo.count });

        const allMatched = state.cards.every(c => c.matched);
        state.flipped = [];
        state.locked = false;
        
        if (allMatched) { win(); return; }
      } else {
        state.cards[a].flipped = false;
        state.cards[b].flipped = false;
        renderCard(a);
        renderCard(b);

        state.cardEls[a].classList.add('shake');
        state.cardEls[b].classList.add('shake');
        setTimeout(() => {
          if (state.cardEls[a]) state.cardEls[a].classList.remove('shake');
          if (state.cardEls[b]) state.cardEls[b].classList.remove('shake');
        }, 400);

        state.combo.miss();
        updateComboHud();
        sfx('miss');

        state.flipped = [];
        state.locked = false;
      }
    }

    function tick(now) {
      if (state.destroyed) return;
      state.raf = requestAnimationFrame(tick);
      if (!state.running || state.paused) { state.lastTick = now; return; }

      const dt = Math.min(now - state.lastTick, 250);
      state.lastTick = now;

      if (state.timerStarted) {
        state.elapsed += dt;
        updateTimeHud();
      }

      if (state.resolveAt && now >= state.resolveAt) {
        state.resolveAt = 0;
        applyResolve();
      }
    }

    function renderOverlay(html) {
      els.overlay.innerHTML = `<div class="wg-panel">${html}</div>`;
      els.overlay.hidden = false;
    }

    function showStart() {
      renderOverlay(`
        <h3>🎴 记忆闪配</h3>
        <p>翻开单词卡和释义卡，把 ${pairCount} 对全部配对。<br>连续配对成功可延续连击，步数越少评级越高。</p>
        <button class="wg-btn" data-action="start">开始游戏</button>
      `);
    }

    function showResult() {
      const sec = (state.elapsed / 1000).toFixed(1);
      const perfect = state.moves === pairCount;
      renderOverlay(`
        <h3>${perfect ? '完美通关！' : '全部配对完成！'}</h3>
        <div class="wg-result">
          <div><b>${sec}s</b><span>用时</span></div>
          <div><b>${state.moves}</b><span>步数</span></div>
          <div><b>x${Math.max(1, state.maxCombo)}</b><span>最高连击</span></div>
        </div>
        <button class="wg-btn" data-action="start">再来一局</button>
      `);
    }

    function startGame() {
      state.running = true;
      state.paused = false;
      state.locked = false;
      state.flipped = [];
      state.moves = 0;
      state.score = 0;
      state.maxCombo = 0;
      state.elapsed = 0;
      state.timerStarted = false;
      state.resolveAt = 0;
      state.pendingResolve = null;
      state.combo.reset();
      state.lastShownTenth = -1;
      state.lastTick = performance.now();
      updateMovesHud(true);
      updateComboHud(true);
      updateTimeHud();
      els.overlay.hidden = true;
      buildBoard();
    }

    function win() {
      state.running = false;
      state.timerStarted = false;
      sfx('win');
      const rect = root.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 40);
      setTimeout(showResult, 260);
    }

    els.overlay.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'start') { unlockAudio(); startGame(); }
    });

    const onVisibility = () => {
      if (document.hidden && state.running) {
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
        root.remove();
      }
    };
  }

  // 全局入口
  window.startFlashMatchGame = function() {
    showScreen('s-game-flashmatch');
    
    const container = document.getElementById('flashmatch-container');
    if (!container) return;

    if (instance) {
      try { instance.destroy(); } catch(e){}
      instance = null;
    }
    container.innerHTML = '';
    
    // 🌟 修改点 2：全局入口传入动态获取的词库
    let gameWords = null;
    if (typeof window.getGameWords === 'function') {
      gameWords = window.getGameWords(15, 'all');
    } else {
      gameWords = window.WORDS;
    }
    
    instance = createGame(container, { words: gameWords });

    const backBtn = document.getElementById('btnFlashmatchBack');
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
          console.error('goHome 失败，切备用：', err);
          if (typeof showScreen === 'function') showScreen('s-home');
        }
      };
    }
  };
})();