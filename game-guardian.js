/* game-guardian.js — 守护王国 */
(function () {
  'use strict';

  // ========== 动态注入 CSS ==========
  if (!document.getElementById('guardian-styles')) {
    const style = document.createElement('style');
    style.id = 'guardian-styles';
    style.textContent = `
      /* --- 放大整体布局 --- */
      .guardian-root { position: relative; overflow: hidden; width: 100%; max-width: 900px; margin: 20px auto; font-family: sans-serif; background: #fff; padding: 24px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); min-height: 400px; }
      .guardian-hud { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; font-size: 16px; }
      .combo-track { flex: 1; }
      .combo-bar { height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden; margin-top: 6px; }
      #gComboFill { height: 100%; width: 0; background: linear-gradient(90deg,#4ea1ff,#ffc83d); transition: width .2s; }
      
      /* --- 战场与堡垒 --- */
      .guardian-lane { position: relative; height: 220px; border-radius: 16px; background: linear-gradient(180deg,#eef5ff,#dbe8fb); overflow: hidden; border: 2px solid #cbd5e1; margin-bottom: 24px; transition: box-shadow 0.3s; }
      .guardian-lane.combo-flash { box-shadow: 0 0 30px 10px #ffc83d, inset 0 0 30px #ffc83d; }
      .g-base { position: absolute; top: 0; bottom: 0; width: 60px; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .g-base-player { left: 0; background: linear-gradient(90deg, #4ea1ff44, transparent); }
      .g-base-enemy  { right: 0; background: linear-gradient(-90deg, #ff6b6b44, transparent); }
      
      .g-castle { font-size: 56px; filter: drop-shadow(0 6px 6px rgba(0,0,0,0.2)); margin-bottom: 12px; transition: transform 0.1s; }
      .g-base-hp { width: 44px; height: 8px; background: #0004; border-radius: 4px; overflow: hidden; }
      .g-base-hp > div { height: 100%; background: #2ecc71; border-radius: 4px; transition: width 0.2s; }
      .g-base-enemy .g-base-hp > div { background: #e74c3c; float: right; }

      .castle-hit { animation: castleShake 0.3s; }
      @keyframes castleShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }

      /* --- 火柴人单位 --- */
      .g-unit { position: absolute !important; top: 50% !important; left: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 2 !important; }
      .g-unit .unit-hp { position: absolute; top: -10px; left: 10%; right: 10%; height: 6px; background: #0004; border-radius: 3px; z-index: 10;}
      .g-unit .unit-hp > div { height: 100%; background: #fff; border-radius: 3px; transition: width .15s; }
      
      .g-unit.hero { filter: drop-shadow(0 0 16px #ffc83d); animation: gHeroPulse 1s infinite alternate; z-index: 10 !important; }
      .g-unit.enemy svg { transform: scaleX(-1); }
      
      .g-unit.attacking.player svg { animation: gAttackRight 0.2s ease-out; }
      .g-unit.attacking.enemy svg { animation: gAttackLeft 0.2s ease-out; }
      
      .g-unit.dying {
        opacity: 0;
        transform: translate(var(--x), -50%) rotate(90deg) scale(0.7) !important;
        transition: all 0.3s ease-in !important;
        pointer-events: none;
        z-index: 0 !important;
      }

      .g-unit.player.small, .g-unit.player.mid { animation: gWalk 0.6s infinite alternate ease-in-out; }
      .g-unit.hit svg { filter: brightness(0.5) sepia(1) hue-rotate(-50deg); animation: gHitShake 0.15s; }
      .guardian-root.shake { animation: gShake .15s; }
      
      /* --- 答题区域 --- */
      .guardian-quiz { margin-top: 10px; }
      .quiz-prompt { font-size: 28px; font-weight: 700; text-align: center; margin: 12px 0 24px; color: #333; }
      .quiz-options { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .quiz-option { padding: 18px; border-radius: 12px; border: 2px solid #d1d5db; background: #fff; font-size: 20px; cursor: pointer; color: #333; transition: all 0.1s; font-weight: 500; }
      .quiz-option:hover:not(:disabled) { border-color: #4ea1ff; background: #f0f7ff; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.05); }
      .quiz-option.correct { background: #d1fae5; border-color: #10b981; color: #065f46; }
      .quiz-option.wrong   { background: #fee2e2; border-color: #ef4444; color: #991b1b; }
      .quiz-option:disabled { cursor: default; opacity: .85; transform: none; box-shadow: none; }
      
      .g-banner { position: absolute; left: 50%; top: 30%; transform: translate(-50%,0); background: #000c; color: #fff; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 18px; pointer-events: none; animation: gBannerIn .25s ease-out; white-space: nowrap; z-index: 20; }
      .g-banner.danger { background: #c0392bcc; }
      
      .g-float-text { position: absolute; font-weight: 900; font-size: 24px; color: #ff4757; text-shadow: 1px 1px 3px #000; pointer-events: none; z-index: 50; animation: floatUp 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      @keyframes floatUp { 0% { opacity: 0; transform: translateY(0) scale(0.5); } 20% { opacity: 1; transform: translateY(-15px) scale(1.3); } 100% { opacity: 0; transform: translateY(-60px) scale(1); } }

      /* --- 缩小且精致的结算面板 --- */
      .g-result-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.85); z-index: 999; display: flex; align-items: center; justify-content: center; perspective: 1000px; }
      .g-result-card { background: linear-gradient(135deg, #ffffff, #f0f5ff); padding: 24px; border-radius: 16px; text-align: center; width: 280px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); animation: cardFlipIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; transform-origin: center; position: relative; overflow: hidden; }
      .g-result-card::before { content:''; position:absolute; inset:0; border-radius:16px; padding:2px; background:linear-gradient(45deg,#f1c40f,#e74c3c,#4ea1ff); -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events:none; }
      
      .g-result-title { font-size: 28px; font-weight: 900; margin: 0 0 10px 0; }
      .g-result-title.win { color: #f1c40f; text-shadow: 0 2px 8px rgba(241,196,15,0.5); animation: titlePulse 1s infinite alternate; }
      .g-result-title.lose { color: #7f8c8d; }
      .g-result-stars { font-size: 32px; margin-bottom: 15px; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
      .g-result-stats { font-size: 14px; color: #555; margin-bottom: 20px; line-height: 1.6; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .g-result-btn { display: block; width: 100%; box-sizing: border-box; padding: 12px; border-radius: 8px; border: none; background: #4ea1ff; color: #fff; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(78,161,255,0.4); text-decoration: none; text-align: center; }
      .g-result-btn:hover { background: #3b82f6; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(78,161,255,0.6); }
      
      .confetti { position: absolute; width: 10px; height: 10px; background: #f00; z-index: 1000; top: -20px; pointer-events: none; }
      @keyframes fallDown { to { transform: translateY(500px) rotate(720deg); opacity: 0; } }
      @keyframes cardFlipIn { 0% { opacity: 0; transform: rotateX(90deg) scale(0.5); } 100% { opacity: 1; transform: rotateX(0) scale(1); } }
      @keyframes titlePulse { from { transform: scale(1); } to { transform: scale(1.05); } }

      @keyframes gWalk { from { margin-top: 0; } to { margin-top: -5px; } }
      @keyframes gAttackRight { 0% { transform: translateX(0); } 50% { transform: translateX(20px) scale(1.1); } 100% { transform: translateX(0); } }
      @keyframes gAttackLeft { 0% { transform: scaleX(-1) translateX(0); } 50% { transform: scaleX(-1) translateX(20px) scale(1.1); } 100% { transform: scaleX(-1) translateX(0); } }
      @keyframes gHitShake { 0% { transform: translateX(0); } 50% { transform: translateX(8px); } 100% { transform: translateX(0); } }
      @keyframes gShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
      @keyframes gHeroPulse { from{filter:drop-shadow(0 0 6px #ffc83d)} to{filter:drop-shadow(0 0 20px #ffc83d)} }
      @keyframes gBannerIn { from{opacity:0; transform:translate(-50%,-10px)} to{opacity:1; transform:translate(-50%,0)} }
    `;
    document.head.appendChild(style);
  }

  // ========== 音效系统（带安全防范） ==========
  let audioCtx;
  let soundEnabled = false;

  function initAudio() {
    soundEnabled = true;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playSound(type) {
    if (!soundEnabled) return; // 如果没解锁音频，直接静音跳过
    try {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode); gainNode.connect(audioCtx.destination);
      const now = audioCtx.currentTime;

      if (type === 'hit') {
        osc.type = 'square'; osc.frequency.setValueAtTime(800 + Math.random()*200, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.05); gainNode.gain.setValueAtTime(0.03, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05); osc.start(now); osc.stop(now + 0.05);
      } else if (type === 'die') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(30, now + 0.15); gainNode.gain.setValueAtTime(0.08, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15); osc.start(now); osc.stop(now + 0.15);
      } else if (type === 'correct') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.setValueAtTime(1200, now + 0.08); gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(100, now + 0.3); gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3);
      } else if (type === 'hero') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5); gainNode.gain.setValueAtTime(0.1, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.6); osc.start(now); osc.stop(now + 0.6);
      } else if (type === 'victory') {
        [400, 500, 600, 800].forEach((freq, i) => {
          const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination);
          o.type = 'square'; o.frequency.setValueAtTime(freq, now + i * 0.15); g.gain.setValueAtTime(0.05, now + i * 0.15); g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.3);
          o.start(now + i * 0.15); o.stop(now + i * 0.15 + 0.3);
        });
      }
    } catch (e) {}
  }

  const DIFFICULTIES = {
    easy:   { name: '简单', enemySmallEvery: 3500, enemyMidEvery: 20000, baseHp: 10 },
    normal: { name: '普通', enemySmallEvery: 2000, enemyMidEvery: 12000, baseHp: 10 },
    hard:   { name: '困难', enemySmallEvery: 1200, enemyMidEvery: 8000,  baseHp: 8 }
  };

  const BASE_CONFIG = {
    questions: 20, tickMs: 100, atkInterval: 1500, unitSpeed: 60, engageRange: 40, 
    frontLineSize: 3, maxHeroesPerGame: 1, heroCombo: 10, midBonusCombo: 5, wrongSpawnEnemy: true
  };

  const UNIT_STATS = {
    small: { atk: 1, hp: 3,  speed: 1.00, color: '#4ea1ff', size: 48 },
    mid:   { atk: 2, hp: 8,  speed: 0.90, color: '#2f6fd0', size: 64 },
    hero:  { atk: 3, hp: 10, speed: 1.10, color: '#ffc83d', size: 80 },
  };
  const ENEMY_COLORS = { small: '#ff4757', mid: '#c0392b', hero: '#ff2d55' };

  function createGuardianGame(hostEl, opts) {
    let WORDS = opts.getWords(BASE_CONFIG.questions) || [];
    if (WORDS.length < 4) WORDS = [{en: 'apple', zh: '苹果'}, {en: 'banana', zh: '香蕉'}, {en: 'cat', zh: '猫'}, {en: 'dog', zh: '狗'}];
    while (WORDS.length < BASE_CONFIG.questions) WORDS = WORDS.concat(WORDS);
    WORDS = WORDS.slice(0, BASE_CONFIG.questions);

    let cfg = { ...BASE_CONFIG };
    let state = { timeouts: [] };

    buildSetup();

    // 清理所有挂起的定时器和延时任务
    function killTimers() {
      if (state.timers) {
        clearInterval(state.timers.tick);
        clearInterval(state.timers.enemySmall);
        clearInterval(state.timers.enemyMid);
      }
      if (state.timeouts) {
        state.timeouts.forEach(clearTimeout);
        state.timeouts = [];
      }
      state.running = false;
      state.phase = 'over';
    }

    // 终极安全退出
    function safeExit() {
      killTimers();
      
      // 1. 尝试调用外部引擎
      if (opts && typeof opts.onExit === 'function') {
        try { opts.onExit(); } catch (e) { console.error(e); }
      }

      // 2. 物理兜底：无论外部引擎成不成功，我们都在原位置放一个极其显眼的返回链接
      setTimeout(() => {
        // 如果游戏区域还在，且没有被外层框架替换掉
        if (document.body.contains(hostEl)) {
          hostEl.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:400px; background:#fff; border-radius:16px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); margin:20px auto; max-width:900px;">
              <h2 style="color:#333; margin-bottom:20px; font-size:28px;">游戏已结束</h2>
              <p style="color:#666; margin-bottom:30px; font-size:16px;">如果页面未能自动跳转，请点击下方按钮。</p>
              <a href="wordgame.html" style="display:inline-block; padding:16px 40px; background:#4ea1ff; color:#fff; text-decoration:none; border-radius:12px; font-size:18px; font-weight:bold; box-shadow:0 6px 15px rgba(78,161,255,0.4); transition:transform 0.2s;">返回大厅主页</a>
            </div>
          `;
        }
      }, 50); // 延迟50ms，给外层引擎一点时间去销毁或切换屏幕
    }

    function buildSetup() {
      hostEl.innerHTML = `
        <div class="guardian-root" style="padding: 30px; text-align: center;">
          <h2 style="margin: 10px 0; color: #333; font-size: 36px; font-weight: 900; text-shadow: 0 3px 6px rgba(0,0,0,0.1);">守护王国</h2>
          <p style="margin: 0 0 40px 0; color: #666; font-size: 18px;">答题召唤士兵，抵御敌军入侵！</p>
          <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
            <button class="g-diff-btn easy" data-diff="easy" style="padding: 16px 40px; border-radius: 12px; border: none; font-size: 20px; font-weight: bold; cursor: pointer; color: #fff; background: #10b981; box-shadow: 0 6px 12px rgba(16,185,129,0.3); transition:transform 0.1s;">简单</button>
            <button class="g-diff-btn normal" data-diff="normal" style="padding: 16px 40px; border-radius: 12px; border: none; font-size: 20px; font-weight: bold; cursor: pointer; color: #fff; background: #3b82f6; box-shadow: 0 6px 12px rgba(59,130,246,0.3); transition:transform 0.1s;">普通</button>
            <button class="g-diff-btn hard" data-diff="hard" style="padding: 16px 40px; border-radius: 12px; border: none; font-size: 20px; font-weight: bold; cursor: pointer; color: #fff; background: #ef4444; box-shadow: 0 6px 12px rgba(239,68,68,0.3); transition:transform 0.1s;">困难</button>
          </div>
        </div>`;
      
      hostEl.querySelectorAll('.g-diff-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          initAudio();
          cfg = { ...BASE_CONFIG, ...DIFFICULTIES[btn.dataset.diff] };
          initGame();
        };
      });
    }

    function initGame() {
      state = {
        running: true, phase: 'quiz', qIndex: 0, correct: 0, wrong: 0, combo: 0, maxCombo: 0,
        heroCount: 0, heroSpawned: false, perfectCombo20: false,
        playerUnits: [], enemyUnits: [],
        playerBaseHp: cfg.baseHp, enemyBaseHp: cfg.baseHp,
        timers: { tick: null, enemySmall: null, enemyMid: null },
        timeouts: [],
        root: null, laneEl: null
      };

      buildLayout();
      startEnemySpawning();
      state.timers.tick = setInterval(tick, cfg.tickMs);
      renderQuestion();
    }

    function buildLayout() {
      hostEl.innerHTML = `
        <div class="guardian-root">
          <div class="guardian-hud">
            <div class="combo-track">
              <span id="gComboText">连对 0 / ${cfg.heroCombo}</span>
              <div class="combo-bar"><div id="gComboFill"></div></div>
            </div>
            <div class="guardian-score" style="display:flex; align-items:center; gap:24px;">
              <div><span>✔ <b id="gCorrect">0</b></span> <span>✘ <b id="gWrong">0</b></span></div>
              <button id="gExitBtn" style="padding: 8px 16px; border: 2px solid #cbd5e1; background: #f8fafc; border-radius: 8px; cursor: pointer; font-size: 16px; color: #64748b; font-weight: bold;">退出</button>
            </div>
          </div>

          <div class="guardian-lane" id="gLane">
            <div class="g-base g-base-player">
              <div class="g-castle" id="pCastle">🏰</div>
              <div class="g-base-hp"><div id="gPlayerBaseHp"></div></div>
            </div>
            <div class="g-base g-base-enemy">
              <div class="g-castle" id="eCastle">🏰</div>
              <div class="g-base-hp"><div id="gEnemyBaseHp"></div></div>
            </div>
          </div>

          <div class="guardian-quiz" id="gQuiz">
            <div class="quiz-prompt" id="gPrompt">—</div>
            <div class="quiz-options" id="gOptions"></div>
          </div>
        </div>`;
      state.root = hostEl.querySelector('.guardian-root');
      state.laneEl = hostEl.querySelector('#gLane');
      updateBaseHpUI();
      updateComboUI();

      hostEl.querySelector('#gExitBtn').onclick = safeExit;
    }

    function renderQuestion() {
      if (state.phase !== 'quiz') return;
      if (state.qIndex >= WORDS.length) { enterShowdown(); return; }

      const q = WORDS[state.qIndex];
      const pool = WORDS.filter(w => w.en !== q.en);
      const options = shuffle([q, ...shuffle(pool).slice(0, Math.min(3, pool.length))]);

      hostEl.querySelector('#gPrompt').textContent = q.zh;
      const box = hostEl.querySelector('#gOptions');
      box.innerHTML = '';
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt.en;
        btn.onclick = () => submitAnswer(opt.en === q.en, btn);
        box.appendChild(btn);
      });
    }

    function submitAnswer(isCorrect, btn) {
      if (state.phase !== 'quiz' || !state.running) return;
      hostEl.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);
      btn.classList.add(isCorrect ? 'correct' : 'wrong');

      if (isCorrect) {
        state.correct++; onCorrect(); playSound('correct');
      } else {
        state.wrong++; onWrong(); playSound('wrong'); shake(8);
      }
      state.qIndex++;
      updateComboUI();
      hostEl.querySelector('#gCorrect').textContent = state.correct;
      hostEl.querySelector('#gWrong').textContent = state.wrong;

      const t = setTimeout(() => {
        if (state.qIndex >= cfg.questions) enterShowdown();
        else renderQuestion();
      }, 450);
      state.timeouts.push(t);
    }

    function onCorrect() {
      state.combo++;
      state.maxCombo = Math.max(state.maxCombo, state.combo);

      if (state.combo % 5 === 0) {
        state.laneEl.classList.add('combo-flash');
        const t = setTimeout(() => state.laneEl.classList.remove('combo-flash'), 500);
        state.timeouts.push(t);
      }

      if (state.combo === cfg.heroCombo) {
        if (state.heroCount < cfg.maxHeroesPerGame) {
          spawnPlayerUnit('hero'); state.heroCount++; state.heroSpawned = true; showHeroBanner(); playSound('hero');
        } else {
          spawnPlayerUnit('mid'); spawnPlayerUnit('mid'); state.perfectCombo20 = true; showBanner('连对 20！双倍中级兵');
        }
        state.combo = 0; return;
      }
      if (state.combo === cfg.midBonusCombo) spawnPlayerUnit('mid');
      spawnPlayerUnit(state.combo % 2 === 0 ? 'mid' : 'small');
    }

    function onWrong() {
      state.combo = 0;
      if (cfg.wrongSpawnEnemy) spawnEnemyUnit('small');
      showBanner(cfg.wrongSpawnEnemy ? '答错！敌方增援' : '答错！连击中断', 'danger');
    }

    function spawnPlayerUnit(type) {
      const s = UNIT_STATS[type];
      const el = makeUnitEl(type, s.color, s.size, 'player');
      const unit = { side: 'player', type, atk: s.atk, hp: s.hp, maxHp: s.hp, x: 60, cd: cfg.atkInterval, el };
      state.laneEl.appendChild(el); state.playerUnits.push(unit); placeUnit(unit); updateUnitHp(unit);
    }

    function spawnEnemyUnit(type) {
      try {
        const s = UNIT_STATS[type];
        const el = makeUnitEl(type, ENEMY_COLORS[type], s.size, 'enemy');
        let laneW = state.laneEl.clientWidth || 600;
        const unit = { side: 'enemy', type, atk: s.atk, hp: s.hp, maxHp: s.hp, x: laneW - 60 - s.size, cd: cfg.atkInterval, el };
        state.laneEl.appendChild(el); state.enemyUnits.push(unit); placeUnit(unit); updateUnitHp(unit);
      } catch (err) {}
    }

    function startEnemySpawning() {
      state.timers.enemySmall = setInterval(() => { if (state.running && state.phase === 'quiz') spawnEnemyUnit('small'); }, cfg.enemySmallEvery);
      state.timers.enemyMid = setInterval(() => { if (state.running && state.phase === 'quiz') spawnEnemyUnit('mid'); }, cfg.enemyMidEvery);
    }

    function tick() {
      if (!state.running || state.phase === 'over') return;
      try {
        moveSide(state.playerUnits, state.enemyUnits, +1, cfg.tickMs / 1000);
        moveSide(state.enemyUnits, state.playerUnits, -1, cfg.tickMs / 1000);
        resolveCombat();
        checkBases();
        
        if (state.phase === 'showdown' && state.playerUnits.length === 0 && state.enemyUnits.length === 0) {
          triggerVictory(state.playerBaseHp >= state.enemyBaseHp);
        }
      } catch (e) {}
    }

    function moveSide(units, enemyUnits, dir, dt) {
      if (!units.length) return;
      let laneW = state.laneEl.clientWidth || 600;
      const sorted = units.slice().sort((a, b) => dir > 0 ? b.x - a.x : a.x - b.x);
      const enemyFront = frontUnit(enemyUnits, -dir);
      const speedMultiplier = state.phase === 'showdown' ? 2 : 1;

      for (let i = 0; i < sorted.length; i++) {
        const u = sorted[i], s = UNIT_STATS[u.type];
        if (!s) continue;
        
        let target = u.x + dir * cfg.unitSpeed * s.speed * dt * speedMultiplier;
        
        if (dir > 0) {
          let maxX = laneW - 60 - s.size;
          if (enemyFront) maxX = Math.min(maxX, enemyFront.x - s.size - cfg.engageRange + 5);
          if (i > 0) maxX = Math.min(maxX, sorted[i - 1].x - s.size - 8);
          u.x = Math.max(u.x, Math.min(target, maxX));
        } else {
          let minX = 60;
          if (enemyFront) minX = Math.max(minX, enemyFront.x + UNIT_STATS[enemyFront.type].size + cfg.engageRange - 5);
          if (i > 0) minX = Math.max(minX, sorted[i - 1].x + UNIT_STATS[sorted[i - 1].type].size + 8);
          u.x = Math.min(u.x, Math.max(target, minX));
        }
        
        if (isNaN(u.x) || !isFinite(u.x)) u.x = dir > 0 ? 60 : laneW - 60 - s.size;
        placeUnit(u);
      }
    }

    function resolveCombat() {
      const pFront = frontUnit(state.playerUnits, 1), eFront = frontUnit(state.enemyUnits, -1);
      if (!pFront || !eFront) return;
      const gap = eFront.x - (pFront.x + UNIT_STATS[pFront.type].size);
      if (gap > cfg.engageRange + 15) return;

      const pAttackers = topUnits(state.playerUnits, 1, cfg.frontLineSize);
      const eAttackers = topUnits(state.enemyUnits, -1, cfg.frontLineSize);
      const currentAtkInterval = state.phase === 'showdown' ? 400 : cfg.atkInterval;

      for (const p of pAttackers) {
        if (eFront.hp <= 0) break;
        p.cd -= cfg.tickMs;
        if (p.cd <= 0) { eFront.hp -= p.atk; p.cd = currentAtkInterval; flashHit(eFront); triggerAttack(p); }
      }
      for (const e of eAttackers) {
        if (pFront.hp <= 0) break;
        e.cd -= cfg.tickMs;
        if (e.cd <= 0) { pFront.hp -= e.atk; e.cd = currentAtkInterval; flashHit(pFront); triggerAttack(e); }
      }

      if (eFront.hp <= 0) { removeUnit(state.enemyUnits, eFront); showFloatText(eFront.x, "⚔️"); } 
      else updateUnitHp(eFront);
      
      if (pFront.hp <= 0) { removeUnit(state.playerUnits, pFront); showFloatText(pFront.x, "💥"); } 
      else updateUnitHp(pFront);
    }

    function triggerAttack(unit) {
      if (!unit.el) return;
      unit.el.classList.remove('attacking');
      void unit.el.offsetWidth; 
      unit.el.classList.add('attacking');
      playSound('hit');
      const t = setTimeout(() => { if (unit.el) unit.el.classList.remove('attacking'); }, 200);
      state.timeouts.push(t);
    }

    function checkBases() {
      let laneW = state.laneEl.clientWidth || 600;
      let pCastleHit = false;
      let eCastleHit = false;

      for (const e of state.enemyUnits.slice()) {
        if (e.x <= 60) {
          state.playerBaseHp = Math.max(0, state.playerBaseHp - e.atk);
          removeUnit(state.enemyUnits, e);
          updateBaseHpUI();
          shake(10);
          pCastleHit = true;
        }
      }
      for (const p of state.playerUnits.slice()) {
        if (p.x + UNIT_STATS[p.type].size >= laneW - 60) {
          state.enemyBaseHp = Math.max(0, state.enemyBaseHp - p.atk);
          removeUnit(state.playerUnits, p);
          updateBaseHpUI();
          shake(10);
          eCastleHit = true;
        }
      }

      if (pCastleHit) {
        const c = hostEl.querySelector('#pCastle');
        c.classList.remove('castle-hit'); void c.offsetWidth; c.classList.add('castle-hit');
      }
      if (eCastleHit) {
        const c = hostEl.querySelector('#eCastle');
        c.classList.remove('castle-hit'); void c.offsetWidth; c.classList.add('castle-hit');
      }

      if (state.playerBaseHp <= 0) triggerVictory(false);
      else if (state.enemyBaseHp <= 0) triggerVictory(true);
    }

    function enterShowdown() {
      if (state.phase !== 'quiz') return;
      state.phase = 'showdown';
      clearInterval(state.timers.enemySmall); clearInterval(state.timers.enemyMid);
      const qz = hostEl.querySelector('#gQuiz'); if (qz) qz.remove();
      showBanner('决战阶段！');
      if (state.playerUnits.length === 0 && state.enemyUnits.length === 0) triggerVictory(state.playerBaseHp >= state.enemyBaseHp);
    }

    // ====== 结算 ======
    function triggerVictory(win) {
      if (state.phase === 'over') return;
      state.phase = 'over';
      state.running = false;
      clearInterval(state.timers.tick); clearInterval(state.timers.enemySmall); clearInterval(state.timers.enemyMid);

      if (win) playSound('victory');

      const t = setTimeout(() => {
        let stars = 0;
        if (win) {
          const accuracy = state.correct / cfg.questions;
          if (accuracy === 1) stars = 3;
          else if (accuracy >= 0.8) stars = 2;
          else stars = 1;
        }

        showResultModal(win, stars);
        
        opts.onComplete?.({
          gameId: 'guardian', win, stars, correct: state.correct, wrong: state.wrong, maxCombo: state.maxCombo,
          remainingUnits: state.playerUnits.length, heroSpawned: state.heroSpawned, heroSurvived: state.playerUnits.some(u => u.type === 'hero'), perfectCombo20: state.perfectCombo20
        });
      }, 800);
      state.timeouts.push(t);
    }

    function showResultModal(win, stars) {
      const overlay = document.createElement('div');
      overlay.className = 'g-result-overlay';
      overlay.innerHTML = `
        <div class="g-result-card">
          <h2 class="g-result-title ${win ? 'win' : 'lose'}">${win ? '🏆 胜利 🏆' : '💀 失败 💀'}</h2>
          <div class="g-result-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3-stars)}</div>
          <div class="g-result-stats">
            答对：<b>${state.correct}</b> 题<br>
            最高连对：<b>${state.maxCombo}</b><br>
            ${win ? '敌军堡垒已被摧毁！' : '我方堡垒已沦陷...'}
          </div>
          <button class="g-result-btn" id="gResultBackBtn">返回大厅</button>
        </div>
      `;
      state.root.appendChild(overlay);

      if (win) createConfetti(overlay);

      overlay.querySelector('#gResultBackBtn').onclick = safeExit;
    }

    function createConfetti(container) {
      const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
      for (let i = 0; i < 40; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = (Math.random() * 8 + 6) + 'px';
        confetti.style.height = (Math.random() * 8 + 6) + 'px';
        confetti.style.animation = `fallDown ${Math.random() * 1.5 + 1}s linear forwards`;
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        container.appendChild(confetti);
      }
    }

    function showFloatText(x, text) {
      const el = document.createElement('div');
      el.className = 'g-float-text';
      el.textContent = text;
      el.style.left = (x + 15) + 'px';
      el.style.top = '40%';
      state.laneEl.appendChild(el);
      const t = setTimeout(() => el.remove(), 800);
      state.timeouts.push(t);
    }

    function makeUnitEl(type, color, size, side) {
      const el = document.createElement('div');
      el.className = `g-unit ${side} ${type}`;
      el.style.width = el.style.height = size + 'px';
      const mainColor = side === 'player' ? color : '#e74c3c';
      let svgContent = '';

      if (type === 'small') {
        svgContent = `<svg viewBox="0 0 40 40" width="100%" height="100%" style="color: ${mainColor}; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.2));"><circle cx="18" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="3.5"/><line x1="18" y1="16" x2="18" y2="28" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="18" y1="28" x2="12" y2="38" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="18" y1="28" x2="24" y2="38" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="18" y1="20" x2="26" y2="18" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="26" y1="18" x2="38" y2="16" stroke="#fff" stroke-width="4" stroke-linecap="round"/><line x1="26" y1="18" x2="38" y2="16" stroke="#333" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1 1"/><line x1="25" y1="15" x2="27" y2="21" stroke="#f1c40f" stroke-width="2.5"/></svg>`;
      } else if (type === 'mid') {
        svgContent = `<svg viewBox="0 0 40 40" width="100%" height="100%" style="color: ${mainColor}; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.2));"><circle cx="18" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="4"/><line x1="18" y1="17" x2="18" y2="28" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/><line x1="18" y1="28" x2="11" y2="38" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><line x1="18" y1="28" x2="25" y2="38" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><line x1="18" y1="20" x2="10" y2="22" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M 2 17 L 10 15 L 13 25 L 6 32 Z" fill="currentColor" stroke="#333" stroke-width="1.5"/><line x1="18" y1="20" x2="26" y2="15" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="26" y1="15" x2="39" y2="11" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><line x1="26" y1="15" x2="39" y2="11" stroke="#333" stroke-width="1.5" stroke-linecap="round"/><line x1="25" y1="11" x2="28" y2="19" stroke="#f1c40f" stroke-width="2.5"/></svg>`;
      } else if (type === 'hero') {
        svgContent = `<svg viewBox="0 0 40 40" width="100%" height="100%" style="color: ${mainColor}; filter: drop-shadow(3px 3px 3px rgba(0,0,0,0.3));"><polygon points="11,7 14,1 18,5 22,1 25,7" fill="#f1c40f" stroke="#333" stroke-width="1"/><circle cx="18" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="4"/><line x1="18" y1="18" x2="18" y2="28" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><line x1="18" y1="28" x2="10" y2="39" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/><line x1="18" y1="28" x2="26" y2="39" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/><line x1="18" y1="18" x2="26" y2="10" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="18" y1="20" x2="24" y2="13" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="25" y1="11" x2="38" y2="2" stroke="#fff" stroke-width="6" stroke-linecap="round"/><line x1="25" y1="11" x2="38" y2="2" stroke="#333" stroke-width="2" stroke-linecap="round"/><line x1="23" y1="7" x2="29" y2="12" stroke="#f1c40f" stroke-width="3" stroke-linecap="round"/></svg>`;
      }
      el.innerHTML = `${svgContent}<div class="unit-hp"><div></div></div>`;
      return el;
    }

    function placeUnit(u) { if (!u.el) return; u.el.style.setProperty('--x', `${u.x}px`); u.el.style.transform = `translate(${u.x}px, -50%)`; }
    function updateUnitHp(u) { if (!u.el) return; const bar = u.el.querySelector('.unit-hp > div'); if (bar) bar.style.width = Math.max(0, (u.hp / u.maxHp) * 100) + '%'; }
    function removeUnit(arr, u) {
      const i = arr.indexOf(u); if (i >= 0) arr.splice(i, 1);
      if (!u.el) return;
      playSound('die'); u.el.classList.add('dying');
      const t = setTimeout(() => { if (u.el) u.el.remove(); }, 300);
      state.timeouts.push(t);
    }

    function frontUnit(units, dir) {
      if (!units.length) return null;
      return units.reduce((best, u) => !best ? u : (dir > 0 ? (u.x > best.x ? u : best) : (u.x < best.x ? u : best)), null);
    }
    function topUnits(units, dir, n) { return units.slice().sort((a, b) => dir > 0 ? b.x - a.x : a.x - b.x).slice(0, n); }
    function flashHit(u) { if (!u.el) return; u.el.classList.add('hit'); const t = setTimeout(() => { if (u.el) u.el.classList.remove('hit'); }, 150); state.timeouts.push(t); }

    function updateBaseHpUI() {
      const p = hostEl.querySelector('#gPlayerBaseHp'), e = hostEl.querySelector('#gEnemyBaseHp');
      if (p) p.style.width = (state.playerBaseHp / cfg.baseHp * 100) + '%';
      if (e) e.style.width = (state.enemyBaseHp / cfg.baseHp * 100) + '%';
    }

    function updateComboUI() {
      const txt = hostEl.querySelector('#gComboText'), fill = hostEl.querySelector('#gComboFill');
      const need = cfg.heroCombo, left = Math.max(0, need - state.combo);
      if (txt) {
        if (state.heroCount >= cfg.maxHeroesPerGame && state.combo < need) txt.textContent = '英雄已出战';
        else if (left === 0) txt.textContent = '英雄降临！';
        else txt.textContent = `连对 ${state.combo} / ${need}　还差 ${left} 题出英雄`;
      }
      if (fill) fill.style.width = Math.min(100, state.combo / need * 100) + '%';
    }

    function showBanner(text, kind) {
      const b = document.createElement('div');
      b.className = 'g-banner' + (kind === 'danger' ? ' danger' : '');
      b.textContent = text; state.root?.appendChild(b);
      const t = setTimeout(() => { if (b) b.remove(); }, 1200);
      state.timeouts.push(t);
    }
    function showHeroBanner() { state.root?.classList.add('hero-time'); showBanner('⚡ 英雄降临！'); const t = setTimeout(() => state.root?.classList.remove('hero-time'), 1000); state.timeouts.push(t); }
    function shake(px) { state.root?.classList.add('shake'); const t = setTimeout(() => state.root?.classList.remove('shake'), 150); state.timeouts.push(t); }

    return function destroy() {
      killTimers();
      hostEl.innerHTML = '';
    };
  }

  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  }

  window.PlaykynGames = window.PlaykynGames || {};
  window.PlaykynGames.guardian = {
    meta: { id: 'guardian', name: '守护王国', category: 'strategy', minTier: 'free', perks: { heroHpBonus: 0, heroComboThreshold: 10 } },
    mount(hostEl, opts) { return createGuardianGame(hostEl, opts); }
  };

})();

/* ---------------- 兼容现有引擎的入口 ---------------- */
window.startGuardianGame = function() {
  const hostEl = document.getElementById('game-container') || document.getElementById('gameArea') || document.body; 
  
  const opts = {
    getWords: (n) => window.getGameWords ? window.getGameWords(n) : [{en: 'apple', zh: '苹果'}, {en: 'banana', zh: '香蕉'}, {en: 'cat', zh: '猫'}, {en: 'dog', zh: '狗'}], 
    onComplete: (result) => {
      console.log('守护王国结算:', result);
      if (typeof addCoins === 'function') {
        let c = result.correct * 3 + result.maxCombo * 2;
        if (result.win) c += 40 + result.stars * 20;
        if (result.heroSurvived) c += 50;
        if (result.perfectCombo20) c += 30;
        addCoins(c);
      }
      if (typeof trackGamePlayed === 'function') trackGamePlayed('guardian', result); 
      if (typeof showGameResult === 'function') showGameResult(result);
    },
    onExit: () => {
      if (typeof showScreen === 'function') showScreen('lobby');
    }
  };

  if (window.currentGuardianDestroy) window.currentGuardianDestroy();
  window.currentGuardianDestroy = window.PlaykynGames.guardian.mount(hostEl, opts);
};