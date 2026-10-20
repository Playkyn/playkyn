window.startShooterGame = function() {
  if (!window.PK_HUD || typeof window.getGameWords !== 'function') {
    alert("启动失败：找不到依赖。");
    return;
  }
  const HUD = window.PK_HUD;

  let rawWords = window.getGameWords(20, 'all');
  if (!rawWords || rawWords.length === 0) return alert("当前词库为空！");

  rawWords.sort(() => Math.random() - 0.5);
  const mid = Math.ceil(rawWords.length / 2);
  const round1Words = rawWords.slice(0, mid);
  const round2Words = rawWords.slice(mid);

  showDifficultyMenu(round1Words, round2Words);
};

function showDifficultyMenu(round1, round2) {
  const menu = document.createElement('div');
  menu.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100vh;z-index:99999;background:#090a0f;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;font-family:system-ui,sans-serif;';
  
  menu.innerHTML = `
    <h2 style="margin-bottom:8px;font-size:32px;text-shadow:0 0 20px #3b82f6, 0 0 40px #3b82f6;color:#fff;">🎯 单词射击</h2>
    <p style="color:#94a3b8;margin-bottom:24px;font-size:15px;">本次复习词汇量：${round1.length + round2.length} 个（分 2 轮）</p>
    <div style="display:flex;gap:12px;flex-direction:column;width:260px;">
      <button id="btn-easy" style="padding:16px;border-radius:12px;border:2px solid #10b981;background:transparent;color:#10b981;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 0 10px rgba(16,185,129,0.3);transition:0.2s;">🌱 轻松模式 (90s/5命)</button>
      <button id="btn-normal" style="padding:16px;border-radius:12px;border:2px solid #3b82f6;background:transparent;color:#3b82f6;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 0 10px rgba(59,130,246,0.3);transition:0.2s;">⚔️ 标准模式 (75s/3命)</button>
      <button id="btn-hard" style="padding:16px;border-radius:12px;border:2px solid #ef4444;background:transparent;color:#ef4444;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 0 10px rgba(239,68,68,0.3);transition:0.2s;">🔥 挑战模式 (60s/2命)</button>
      <button id="btn-cancel" style="padding:12px;border-radius:12px;border:0;background:transparent;color:#94a3b8;font-size:14px;margin-top:8px;cursor:pointer;">取消</button>
    </div>
  `;
  document.body.appendChild(menu);

  menu.querySelector('#btn-cancel').onclick = () => menu.remove();
  menu.querySelector('#btn-easy').onclick = () => { menu.remove(); initGame(round1, round2, { maxTime: 90, lives: 5, speed: 0.08, spawnInterval: 3200, maxTargets: 2 }); };
  menu.querySelector('#btn-normal').onclick = () => { menu.remove(); initGame(round1, round2, { maxTime: 75, lives: 3, speed: 0.12, spawnInterval: 2600, maxTargets: 3 }); };
  menu.querySelector('#btn-hard').onclick = () => { menu.remove(); initGame(round1, round2, { maxTime: 60, lives: 2, speed: 0.18, spawnInterval: 2000, maxTargets: 4 }); };
}

function initGame(round1Words, round2Words, config) {
  const HUD = window.PK_HUD;
  
  // --- 高级合成音效 ---
  let audioCtx = null;
  function playSound(type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;

      if (type === 'click') {
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(800, now); 
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(150, now); 
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
      } else if (type === 'boom') {
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(100, now); 
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        gain.gain.setValueAtTime(0.6, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      } else if (type === 'combo') {
        // 类似马里奥金币的升调音效
        osc.type = 'square'; 
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(1320, now + 0.08); // E6
        gain.gain.setValueAtTime(0.15, now); 
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
      }
    } catch (e) {}
  }

  // 容器
  const container = document.createElement('div');
  container.id = 'pk-shooter-root';
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100vh;z-index:99999;background:#090a0f;display:flex;justify-content:center;overflow:hidden;';
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;max-width:500px;height:100%;position:relative;overflow:hidden;font-family:system-ui,sans-serif;';
  container.appendChild(wrapper);
  document.body.appendChild(container);

  const CSS = `
    .pk-shooter{position:relative;display:flex;flex-direction:column;height:100%;min-height:520px;padding:12px;box-sizing:border-box;background:radial-gradient(circle at 50% 10%,#1e1b4b,#090a0f 70%);color:#e8f0ff;overflow:hidden;transition: background 0.5s;}
    .pk-battlefield{position:relative;flex:1;margin-top:10px;border-bottom:2px dashed rgba(255,255,255,0.1)}
    
    /* 连击发光边框 */
    .pk-combo-glow { box-shadow: inset 0 0 30px rgba(251, 191, 36, 0.4); }
    .pk-danger-glow { box-shadow: inset 0 0 50px rgba(239, 68, 68, 0.6); animation: pk-danger-pulse 0.5s infinite alternate; }
    @keyframes pk-danger-pulse { from { box-shadow: inset 0 0 20px rgba(239,68,68,0.3); } to { box-shadow: inset 0 0 60px rgba(239,68,68,0.8); } }

    /* 靶子整体 */
    .pk-target{position:absolute;width:130px;display:flex;flex-direction:column;align-items:center;transition:top 0.1s linear;will-change:top;transform:translateX(-50%)}
    
    /* 中文牌子：霓虹发光风 */
    .pk-target-hint{
      background: rgba(15,22,38,0.8); 
      color: #fff; 
      border: 2px solid #fbbf24; 
      border-radius: 8px; 
      padding: 6px 14px; 
      font-size: 20px; 
      font-weight: 900; 
      white-space: nowrap; 
      margin-bottom: 12px; 
      box-shadow: 0 0 12px rgba(251, 191, 36, 0.5), inset 0 0 8px rgba(251,191,36,0.3);
      text-shadow: 0 0 8px #fbbf24;
      transition: all 0.2s;
    }
    
    .pk-target.danger .pk-target-hint {
      border-color: #ef4444; color: #fff;
      box-shadow: 0 0 20px rgba(239,68,68,0.8), inset 0 0 10px rgba(239,68,68,0.5);
      text-shadow: 0 0 10px #ef4444;
      animation: pk-target-panic 0.3s infinite alternate;
    }
    @keyframes pk-target-panic { from { transform: scale(1); } to { transform: scale(1.05); } }

    .pk-target-letters{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;max-width:130px; position:relative;}
    
    /* 霓虹字母块 */
    .pk-letter{
      width:36px;height:36px;border-radius:8px;color:#fff;display:flex;align-items:center;justify-content:center;
      font-weight:800;font-size:18px;cursor:pointer;touch-action:manipulation;user-select:none;
      transition:all 0.1s; position:relative; overflow:hidden;
      border: 1px solid rgba(255,255,255,0.3);
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    }
    
    .pk-letter:active{transform:scale(0.9)}
    .pk-letter.clicked{transform: scale(1.5); opacity:0; pointer-events:none; filter:brightness(2);}
    .pk-letter.wrong{background:#ef4444 !important; box-shadow: 0 0 15px #ef4444; animation:pk-shake 0.3s}
    @keyframes pk-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
    
    .pk-locked{border:2px dashed rgba(255,255,255,0.6); padding:6px; border-radius:14px; margin:-6px; box-shadow: 0 0 15px rgba(255,255,255,0.1);}
    
    /* 点击水波纹 */
    .pk-ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,0.6);transform:scale(0);animation:ripple 0.4s linear;pointer-events:none;}
    @keyframes ripple{to{transform:scale(4);opacity:0}}

    /* 爆炸粒子 */
    .pk-particle{position:absolute;width:8px;height:8px;border-radius:50%;pointer-events:none;z-index:99;}
    
    /* 情绪飘字 */
    .pk-float-text{position:absolute;font-size:32px;font-weight:900;color:#fbbf24;text-shadow:0 0 15px #fbbf24,0 4px 8px #000;pointer-events:none;z-index:100;animation:pk-float-up 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards}
    @keyframes pk-float-up{0%{transform:translate(-50%,0) scale(0.2);opacity:0}30%{transform:translate(-50%,-30px) scale(1.2);opacity:1}100%{transform:translate(-50%,-100px) scale(1);opacity:0}}
    
    .pk-round-mask{position:absolute;inset:0;background:rgba(9,10,15,0.9);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:10;color:#fff;backdrop-filter:blur(4px);}
    .pk-round-mask h2{font-size:42px;margin-bottom:10px;color:#fbbf24;text-shadow:0 0 20px #fbbf24;}
  `;
  HUD.ensureStyle('pk-shooter-style', CSS);

  const root = document.createElement('div');
  root.className = 'pk-shooter';
  const hud = HUD.createHud(root);
  const battlefield = document.createElement('div');
  battlefield.className = 'pk-battlefield';
  root.appendChild(battlefield);
  wrapper.appendChild(root);

  const state = {
    round: 1, queue: [], lives: config.lives, score: 0, combo: 0, timeLeft: config.maxTime, over: false, targets: []
  };

  let tickTimer = 0, spawnTimer = 0, rafId = 0, lastTs = 0;

  // 霓虹渐变色盘
  const COLOR_PALETTES = [
    'linear-gradient(135deg, #ec4899, #8b5cf6)', // 粉紫
    'linear-gradient(135deg, #06b6d4, #3b82f6)', // 青蓝
    'linear-gradient(135deg, #f59e0b, #ef4444)', // 橙红
    'linear-gradient(135deg, #10b981, #06b6d4)', // 翠绿
    'linear-gradient(135deg, #8b5cf6, #3b82f6)'  // 紫蓝
  ];

  function updateHUD() {
    hud.setScore(state.score);
    hud.setCombo(state.combo);
    hud.setTime(`R${state.round} | ` + ('❤️'.repeat(state.lives) || '0'));
    
    // 动态改变边框光效
    if (state.combo >= 5) root.classList.add('pk-combo-glow');
    else root.classList.remove('pk-combo-glow');
  }

  function showFloatText(text, x, y, color = '#fbbf24') {
    const el = document.createElement('div');
    el.className = 'pk-float-text';
    el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = color;
    wrapper.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  function createParticles(x, y, color1, color2) {
    for(let i=0; i<12; i++) {
      const p = document.createElement('div');
      p.className = 'pk-particle';
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.background = Math.random() > 0.5 ? color1 : color2;
      p.style.boxShadow = `0 0 8px ${p.style.background}`;
      wrapper.appendChild(p);
      
      const angle = Math.random() * Math.PI * 2;
      const velocity = 50 + Math.random() * 100;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;
      
      p.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
      ], { duration: 600 + Math.random()*400, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }).onfinish = () => p.remove();
    }
  }

  function startRound(rNum, words) {
    state.round = rNum;
    state.queue = words.map(w => ({ word: w.en || w.word, hint: w.zh || w.hint }));
    state.targets.forEach(t => t.el.remove());
    state.targets = [];
    updateHUD();
    
    if (rNum > 1) {
      const mask = document.createElement('div');
      mask.className = 'pk-round-mask';
      mask.innerHTML = `<h2>ROUND ${rNum}</h2><p style="color:#94a3b8;font-size:18px;">剩余单词：${state.queue.length} 个</p>`;
      wrapper.appendChild(mask);
      playSound('combo');
      setTimeout(() => mask.remove(), 1500);
    }
    spawnTarget();
    setTimeout(spawnTarget, 1000);
  }

  function spawnTarget() {
    if (state.over || state.queue.length === 0) return;
    if (state.targets.length >= config.maxTargets) return; 

    const item = state.queue.shift();
    const id = 't_' + Date.now() + Math.random().toString(36).slice(2, 6);
    const letters = item.word.split('').sort(() => Math.random() - 0.5);
    
    const laneWidth = 100 / config.maxTargets;
    const usedLanes = state.targets.map(t => t.lane);
    const freeLanes = Array.from({length: config.maxTargets}, (_, i) => i).filter(l => !usedLanes.includes(l));
    if (freeLanes.length === 0) return; 

    const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    const leftPercent = (lane + 0.5) * laneWidth; 

    const el = document.createElement('div');
    el.className = 'pk-target';
    el.dataset.id = id;
    el.style.left = leftPercent + '%'; 
    el.style.top = '-80px';

    const hintEl = document.createElement('div');
    hintEl.className = 'pk-target-hint';
    hintEl.textContent = item.hint;

    const lettersEl = document.createElement('div');
    lettersEl.className = 'pk-target-letters';

    // 整个单词共享一个随机渐变
    const colorStyle = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];

    letters.forEach(char => {
      const l = document.createElement('div');
      l.className = 'pk-letter';
      l.style.background = colorStyle;
      l.textContent = char.toUpperCase();
      l.dataset.char = char;
      
      l.addEventListener('pointerdown', (e) => { 
        e.preventDefault(); 
        // 生成点击水波纹
        const rect = l.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'pk-ripple';
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
        l.appendChild(ripple);
        setTimeout(() => ripple.remove(), 400);

        onLetterClick(id, char, l); 
      });
      lettersEl.appendChild(l);
    });

    el.appendChild(hintEl);
    el.appendChild(lettersEl);
    battlefield.appendChild(el);

    state.targets.push({ id, word: item.word, el, lettersEl, y: -80, speed: config.speed + (Math.random() * 0.03), collected: [], lane, colorStyle });
    updateLock();
  }

  function onLetterClick(targetId, char, letterEl) {
    if (state.over) return;
    const target = state.targets.find(t => t.id === targetId);
    if (!target || letterEl.classList.contains('clicked') || letterEl.classList.contains('wrong')) return;

    const nextChar = target.word[target.collected.length];
    if (char.toLowerCase() === nextChar.toLowerCase()) {
      letterEl.classList.add('clicked');
      target.collected.push(char);
      playSound('click');
      
      if (target.collected.length === target.word.length) {
        const rect = target.el.getBoundingClientRect();
        showFloatText('+ ' + target.word, rect.left + rect.width/2, rect.top, '#4ade80');
        destroyTarget(target, true);
        HUD.speak(target.word);
      }
    } else {
      letterEl.classList.add('wrong');
      playSound('wrong');
      root.classList.add('pk-screen-shake');
      setTimeout(() => {
        letterEl.classList.remove('wrong');
        root.classList.remove('pk-screen-shake');
      }, 300);
      
      state.combo = 0;
      updateHUD();
    }
  }

  function destroyTarget(target, isHit) {
    const rect = target.el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (isHit) {
      target.el.style.opacity = '0'; 
      target.el.style.transform = 'translateX(-50%) scale(1.5)';
      target.el.style.transition = 'all 0.2s ease-out';
      
      playSound('boom');
      // 提取渐变中的颜色作为粒子颜色 (简单估算)
      const pColor1 = target.colorStyle.includes('#ec4899') ? '#ec4899' : target.colorStyle.includes('#06b6d4') ? '#06b6d4' : '#fbbf24';
      const pColor2 = target.colorStyle.includes('#8b5cf6') ? '#8b5cf6' : '#fff';
      createParticles(cx, cy, pColor1, pColor2);

      setTimeout(() => { 
        target.el.remove(); 
        state.targets = state.targets.filter(t => t.id !== target.id); 
        updateLock(); 
      }, 200);
      
      state.combo += 1;
      
      if (state.combo === 3) { showFloatText('NICE!', wrapper.clientWidth/2, wrapper.clientHeight/2, '#60a5fa'); playSound('combo'); }
      if (state.combo === 5) { showFloatText('EXCELLENT!', wrapper.clientWidth/2, wrapper.clientHeight/2, '#a78bfa'); playSound('combo'); }
      if (state.combo >= 10) { showFloatText('UNSTOPPABLE!', wrapper.clientWidth/2, wrapper.clientHeight/2, '#fbbf24'); playSound('combo'); }

      state.score += 100 + state.combo * 20;
      updateHUD();
      setTimeout(spawnTarget, 300); 
    } else {
      target.el.remove();
      state.targets = state.targets.filter(t => t.id !== target.id);
      state.lives -= 1;
      state.combo = 0;
      updateHUD();
      playSound('wrong');
      createParticles(cx, cy, '#ef4444', '#7f1d1d');
      
      root.style.animation = 'pk-screen 0.3s'; 
      setTimeout(() => root.style.animation = '', 300);
      
      if (state.lives <= 0) finishGame(false);
    }
  }

  function updateLock() {
    if (state.targets.length === 0) {
      root.classList.remove('pk-danger-glow');
      return;
    }
    let lowest = state.targets[0];
    for (let t of state.targets) { if (t.y > lowest.y) lowest = t; }
    state.targets.forEach(t => { 
      t.id === lowest.id ? t.el.classList.add('pk-locked') : t.el.classList.remove('pk-locked'); 
    });
  }

  function loop(ts) {
    if (state.over) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(64, ts - lastTs) / 1000; 
    lastTs = ts;

    let needUpdateLock = false;
    let isDanger = false;
    const threshold = battlefield.clientHeight - 60;

    for (let i = state.targets.length - 1; i >= 0; i--) {
      const t = state.targets[i];
      t.y += (t.speed * dt * 100); 
      t.el.style.top = t.y + 'px';
      
      if (t.y > threshold - 150) {
        t.el.classList.add('danger');
        if (t.y > threshold - 50) isDanger = true; // 快触底了，全屏红边
      }

      if (t.y > threshold) { 
        destroyTarget(t, false); 
        needUpdateLock = true; 
      }
    }
    
    // 全屏红色警告光效
    if (isDanger) root.classList.add('pk-danger-glow');
    else root.classList.remove('pk-danger-glow');

    if (needUpdateLock) updateLock();
    rafId = requestAnimationFrame(loop);
  }

  function checkRoundProgress() {
    if (state.over) return;
    if (state.queue.length === 0 && state.targets.length === 0) {
      if (state.round === 1 && round2Words.length > 0) {
        clearInterval(spawnTimer);
        setTimeout(() => {
          startRound(2, round2Words);
          spawnTimer = setInterval(gameTick, config.spawnInterval);
        }, 1000);
      } else {
        finishGame(true);
      }
    }
  }

  function gameTick() {
    if (state.over) return;
    if (state.targets.length < config.maxTargets && state.queue.length > 0) {
      spawnTarget();
    } else {
      checkRoundProgress();
    }
  }

  function startTimers() {
    tickTimer = setInterval(() => { 
      if (state.over) return; 
      state.timeLeft -= 1; 
      if (state.timeLeft <= 0) finishGame(false); 
    }, 1000);
    
    spawnTimer = setInterval(gameTick, config.spawnInterval);
    lastTs = 0; 
    rafId = requestAnimationFrame(loop);
  }

  function finishGame(win) {
    if (state.over) return;
    state.over = true;
    clearInterval(tickTimer); clearInterval(spawnTimer); cancelAnimationFrame(rafId);

    hud.showResult({
      win,
      title: win ? '🎉 完美通关！' : '游戏结束',
      rows: [['总得分', state.score], ['最高连击', state.combo], ['剩余时间', Math.max(0, state.timeLeft) + 's']],
      onRestart: () => { container.remove(); window.startShooterGame(); },
      onExit: () => { container.remove(); }
    });
  }

  updateHUD();
  startTimers();
  startRound(1, round1Words);
}