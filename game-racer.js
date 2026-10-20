window.startRacerGame = function() {
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

  showRaceMenu(round1Words, round2Words, rawWords);
};

function showRaceMenu(round1, round2, allWords) {
  const menu = document.createElement('div');
  menu.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100vh;z-index:99999;background:#090a0f;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;font-family:system-ui,sans-serif; overflow-y:auto; padding: 20px; box-sizing: border-box;';
  
  menu.innerHTML = `
    <h2 style="margin-bottom:8px;font-size:32px;text-shadow:0 0 20px #ef4444, 0 0 40px #ef4444;color:#fff; text-align:center;">🏎️ 极速狂飙</h2>
    <p style="color:#94a3b8;margin-bottom:24px;font-size:15px;text-align:center;">俯瞰视角竞速 · 击败前方车队！</p>
    
    <div style="display:flex;gap:12px;flex-direction:column;width:280px; padding-bottom: 40px;">
      <button id="btn-himalaya" style="padding:16px;border-radius:12px;border:2px solid #10b981;background:transparent;color:#10b981;font-size:16px;font-weight:bold;cursor:pointer;text-align:left; display:flex; justify-content:space-between;"><span>🏔️ 喜马拉雅</span><span style="font-size:12px;opacity:0.8;">简单 (3名对手)</span></button>
      <button id="btn-london" style="padding:16px;border-radius:12px;border:2px solid #3b82f6;background:transparent;color:#3b82f6;font-size:16px;font-weight:bold;cursor:pointer;text-align:left; display:flex; justify-content:space-between;"><span>☂️ 伦敦街头</span><span style="font-size:12px;opacity:0.8;">普通 (4名对手)</span></button>
      <button id="btn-nyc" style="padding:16px;border-radius:12px;border:2px solid #8b5cf6;background:transparent;color:#8b5cf6;font-size:16px;font-weight:bold;cursor:pointer;text-align:left; display:flex; justify-content:space-between;"><span>🗽 纽约街头</span><span style="font-size:12px;opacity:0.8;">困难 (5名对手)</span></button>
      <button id="btn-fuji" style="padding:16px;border-radius:12px;border:2px solid #ec4899;background:transparent;color:#ec4899;font-size:16px;font-weight:bold;cursor:pointer;text-align:left; display:flex; justify-content:space-between;"><span>🗻 富士山</span><span style="font-size:12px;opacity:0.8;">极难 (6名对手)</span></button>
      <button id="btn-greatwall" style="padding:16px;border-radius:12px;border:2px solid #ef4444;background:transparent;color:#ef4444;font-size:16px;font-weight:bold;cursor:pointer;text-align:left; display:flex; justify-content:space-between;"><span>🐉 万里长城</span><span style="font-size:12px;opacity:0.8;">地狱 (8名对手)</span></button>
      <button id="btn-cancel" style="padding:12px;border-radius:12px;border:0;background:transparent;color:#94a3b8;font-size:14px;margin-top:8px;cursor:pointer;">取消</button>
    </div>
  `;
  document.body.appendChild(menu);

  menu.querySelector('#btn-cancel').onclick = () => menu.remove();
  
  menu.querySelector('#btn-himalaya').onclick = () => { menu.remove(); initRace(round1, round2, allWords, 'himalaya', { maxTime: 100, speed: 10, ghosts: [{ speed: 2.5 }, { speed: 3.0 }, { speed: 3.5 }] }); };
  menu.querySelector('#btn-london').onclick = () => { menu.remove(); initRace(round1, round2, allWords, 'london', { maxTime: 90, speed: 10, ghosts: [{ speed: 3.0 }, { speed: 3.5 }, { speed: 4.0 }, { speed: 4.5 }] }); };
  menu.querySelector('#btn-nyc').onclick = () => { menu.remove(); initRace(round1, round2, allWords, 'nyc', { maxTime: 80, speed: 10, ghosts: [{ speed: 3.5 }, { speed: 4.0 }, { speed: 4.5 }, { speed: 5.0 }, { speed: 5.5 }] }); };
  menu.querySelector('#btn-fuji').onclick = () => { menu.remove(); initRace(round1, round2, allWords, 'fuji', { maxTime: 70, speed: 10, ghosts: [{ speed: 4.0 }, { speed: 4.5 }, { speed: 5.0 }, { speed: 5.5 }, { speed: 6.0 }, { speed: 6.5 }] }); };
  menu.querySelector('#btn-greatwall').onclick = () => { menu.remove(); initRace(round1, round2, allWords, 'greatwall', { maxTime: 60, speed: 10, ghosts: [{ speed: 4.5 }, { speed: 5.0 }, { speed: 5.5 }, { speed: 6.0 }, { speed: 6.5 }, { speed: 7.0 }, { speed: 7.5 }, { speed: 8.0 }] }); };
}

function initRace(round1Words, round2Words, allWords, theme, config) {
  const HUD = window.PK_HUD;
  
  let audioCtx = null;
  function playSound(type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;
      if (type === 'correct') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      } else if (type === 'win') {
        osc.type = 'square'; osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(600, now + 0.1); osc.frequency.setValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
      }
    } catch (e) {}
  }

  const container = document.createElement('div');
  container.id = 'pk-racer-root';
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100vh;z-index:99999;background:#090a0f;display:flex;justify-content:center;overflow:hidden;';
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;max-width:500px;height:100%;position:relative;overflow:hidden;font-family:system-ui,sans-serif; display:flex; flex-direction:column;';
  container.appendChild(wrapper);
  document.body.appendChild(container);

  const CSS = `
    .pk-racer{position:relative;display:flex;flex-direction:column;height:100%;padding:12px;box-sizing:border-box;background:linear-gradient(180deg, #1e1b4b, #090a0f 80%);color:#e8f0ff;overflow:hidden;}
    
    .pk-quit-btn{position:absolute;top:0px;right:0px;z-index:50;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:50%;width:36px;height:36px;font-size:20px;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}
    .pk-quit-btn:active{transform:scale(0.9); background:rgba(239,68,68,0.5);}

    /* 俯视赛道全景 */
    .pk-pov-scene{position:relative;height:380px;margin:20px 0 10px;border-radius:16px;border:2px solid #374151;overflow:hidden; background:#111827; box-shadow:inset 0 10px 30px rgba(0,0,0,0.8);}
    
    /* 两侧风景带 */
    .pk-scenery { position: absolute; top: 0; bottom: 0; width: 12%; z-index: 1; overflow: hidden; }
    .pk-scenery.left { left: 0; border-right: 2px solid #000; }
    .pk-scenery.right { right: 0; border-left: 2px solid #000; }
    .pk-scenery-item { position: absolute; width: 100%; height: 200%; animation: scroll-bg 2s linear infinite; }
    @keyframes scroll-bg { from{transform: translateY(-50%);} to{transform: translateY(0);} }

    /* 风景配色 */
    .theme-himalaya .pk-scenery { background: #bfdbfe; }
    .theme-himalaya .pk-scenery-item { background-image: linear-gradient(135deg, #fff 25%, transparent 25%), linear-gradient(225deg, #fff 25%, transparent 25%); background-position: 0 0, 50% 0; background-size: 40px 40px; background-color: #64748b;}
    .theme-london .pk-scenery { background: #475569; }
    .theme-london .pk-scenery-item { background-image: linear-gradient(to right, #1e293b 40%, #0f172a 40%, #0f172a 60%, #1e293b 60%); background-size: 30px 60px; }
    .theme-nyc .pk-scenery { background: #1f2937; }
    .theme-nyc .pk-scenery-item { background-image: linear-gradient(to right, #111827 30%, transparent 30%, transparent 70%, #111827 70%); background-size: 20px 50px; background-color: #374151;}
    .theme-fuji .pk-scenery { background: #fbcfe8; }
    .theme-fuji .pk-scenery-item { background-image: radial-gradient(circle, #db2777 15%, transparent 16%); background-size: 30px 30px; background-color: #f472b6;}
    .theme-greatwall .pk-scenery { background: #064e3b; }
    .theme-greatwall .pk-scenery-item { background-image: linear-gradient(to bottom, #4b5563 50%, transparent 50%), linear-gradient(to right, #374151 50%, transparent 50%); background-size: 20px 20px; background-color: #047857;}

    /* 路面 */
    .pk-road { position: absolute; top: 0; bottom: 0; left: 12%; right: 12%; background: #1f2937; transition: background 1s; z-index: 2;}
    .theme-himalaya .pk-road { background: #334155; }
    .theme-london .pk-road { background: #1f2937; }
    .theme-nyc .pk-road { background: #111827; }
    .theme-fuji .pk-road { background: #374151; }
    .theme-greatwall .pk-road { background: #4b5563; }

    /* 5条车道线 (加粗，高亮) */
    .pk-lane-line { position: absolute; top: 0; bottom: 0; width: 4px; background: repeating-linear-gradient(to bottom, rgba(255,255,255,0.7) 0 20px, transparent 20px 40px); z-index: 3; animation: scroll-lane 0.4s linear infinite; border-radius: 2px;}
    .pk-lane-line.l1 { left: 29.6%; }
    .pk-lane-line.l2 { left: 44.8%; }
    .pk-lane-line.l3 { left: 50%; }
    .pk-lane-line.l4 { left: 55.2%; }
    .pk-lane-line.l5 { left: 70.4%; }
    @keyframes scroll-lane { from{background-position: 0 -40px;} to{background-position: 0 0;} }

    /* 冲刺摇晃 */
    @keyframes sway { 0%,100%{transform:translateX(-2px)} 50%{transform:translateX(2px)} }
    .pk-road-wrap.sway { animation: sway 0.5s infinite ease-in-out; }

    /* 车辆外壳 (去掉层叠上下文，确保 z-index 有效) */
    .pk-car-wrapper { position: absolute; width: 32px; height: 60px; will-change: top, left, transform; }
    
    /* 玩家车固定在最底部的正中央 */
    .pk-player-car { bottom: 15px; left: 50%; transform: translateX(-50%); z-index: 20; }
    
    /* 玩家专属高亮光环 */
    .pk-player-aura {
      position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%);
      width: 45px; height: 20px; border-radius: 50%;
      background: radial-gradient(ellipse at center, rgba(16,185,129,0.6) 0%, transparent 70%);
      box-shadow: 0 0 15px #10b981; z-index: -1; pointer-events: none;
      animation: pulse-aura 1s infinite alternate;
    }
    @keyframes pulse-aura { from { transform: translateX(-50%) scale(1); opacity: 0.6;} to { transform: translateX(-50%) scale(1.2); opacity: 1;} }

    /* 玩家专属 YOU 标识 */
    .pk-player-tag {
      position: absolute; top: -26px; left: 50%; transform: translateX(-50%);
      color: #10b981; font-size: 13px; font-weight: 900; letter-spacing: 2px;
      text-shadow: 0 0 10px #10b981, 0 0 20px #10b981; z-index: 15; white-space: nowrap;
      animation: bounce-tag 1s infinite alternate;
    }
    @keyframes bounce-tag { from{ transform: translate(-50%, 0); } to{ transform: translate(-50%, -5px); } }

    /* 车辆本体 */
    .pk-car-body { 
      position: absolute; inset: 0; border-radius: 12px 12px 8px 8px; box-shadow: 0 10px 20px rgba(0,0,0,0.8); 
    }

    .pk-car-front-glass { position: absolute; top: 15%; left: 10%; right: 10%; height: 15%; background: #111; border-radius: 6px; }
    .pk-car-rear-glass { position: absolute; bottom: 15%; left: 10%; right: 10%; height: 12%; background: #111; border-radius: 4px; }
    .pk-car-roof { position: absolute; top: 32%; left: 10%; right: 10%; height: 35%; background: rgba(255,255,255,0.15); border-radius: 2px; }
    .pk-car-mirror { position: absolute; top: 32%; width: 6px; height: 8px; background: #222; border-radius: 2px; }
    .pk-car-mirror.left { left: -6px; }
    .pk-car-mirror.right { right: -6px; }
    .pk-car-spoiler { position: absolute; bottom: -2px; left: -4px; right: -4px; height: 6px; background: #111; border-radius: 2px; box-shadow: 0 4px 6px rgba(0,0,0,0.5); }
    .pk-car-wheel { position: absolute; width: 6px; height: 12px; background: #000; border-radius: 2px; }
    .pk-car-wheel.fl { top: 20%; left: -4px; }
    .pk-car-wheel.fr { top: 20%; right: -4px; }
    .pk-car-wheel.rl { bottom: 20%; left: -4px; }
    .pk-car-wheel.rr { bottom: 20%; right: -4px; }
    
    .pk-ghost-light { position:absolute; bottom:8%; width:6px; height:4px; border-radius:2px; box-shadow: 0 0 8px currentColor; background:currentColor; }
    .pk-ghost-light.left { left: 12%; }
    .pk-ghost-light.right { right: 12%; }

    /* 喷射尾焰 */
    .pk-exhaust-flame { 
      position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);
      width: 12px; height: 20px; 
      background: radial-gradient(ellipse at top, #fff 0%, #fbbf24 30%, #ef4444 70%, transparent 100%);
      border-radius: 50% 50% 10% 10%; filter: blur(2px); opacity: 0.6;
      animation: flame-flicker 0.1s infinite alternate;
    }
    @keyframes flame-flicker { from{ transform: translateX(-50%) scale(1) } to{ transform: translateX(-50%) scale(1.2, 0.8) } }

    /* 加速冲刺特效 */
    .pk-car-body.boosting {
      filter: brightness(1.3);
      box-shadow: 0 0 30px #10b981;
    }
    .pk-car-body.boosting .pk-exhaust-flame {
      height: 40px; opacity: 1; background: radial-gradient(ellipse at top, #fff 0%, #3b82f6 30%, #10b981 70%, transparent 100%);
    }
    
    /* 刹车打滑特效 */
    .pk-car-body.braking {
      filter: brightness(0.7) drop-shadow(0 0 10px red);
    }

    /* 小地图 */
    .pk-minimap{position:absolute; top: 10px; right: 10px; width: 80px; height: 80px; z-index: 20; background:rgba(0,0,0,0.6); border-radius:12px; padding:5px; box-sizing:border-box; backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.2);}
    .pk-minimap svg{width:100%; height:100%; overflow:visible;}
    .pk-map-path{fill:none; stroke:rgba(255,255,255,0.2); stroke-width:4; stroke-linecap:round;}
    .pk-map-dot{position:absolute; width:10px; height:10px; border-radius:50%; transform:translate(-50%, -50%); box-shadow:0 0 5px currentColor;}

    .pk-question-box{flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px; z-index: 15; margin-top:10px;}
    .pk-hint{text-align:center;font-size:32px;font-weight:900;color:#fff;text-shadow:0 0 20px rgba(255,255,255,0.4);letter-spacing:2px;}
    .pk-options{display:flex;flex-direction:column;gap:10px;}
    .pk-opt{padding:16px;border-radius:14px;background:rgba(255,255,255,0.05);border:2px solid rgba(255,255,255,0.1);color:#fff;font:700 20px/1 system-ui;cursor:pointer;touch-action:manipulation;transition:all 0.2s;}
    .pk-opt:active{transform:scale(0.97);}
    .pk-opt.correct{background:rgba(16,185,129,0.2);border-color:#10b981;box-shadow:0 0 20px rgba(16,185,129,0.4);}
    .pk-opt.wrong{background:rgba(239,68,68,0.2);border-color:#ef4444;box-shadow:0 0 20px rgba(239,68,68,0.4);}
    .pk-opt[disabled]{pointer-events:none;opacity:0.6;}

    .pk-float-text{position:absolute;font-size:24px;font-weight:900;color:#fbbf24;text-shadow:0 0 10px #fbbf24;pointer-events:none;z-index:100;animation:pk-float-up 0.8s forwards}
    @keyframes pk-float-up{0%{transform:translate(-50%,0) scale(0.5);opacity:0}30%{transform:translate(-50%,-30px) scale(1.2);opacity:1}100%{transform:translate(-50%,-80px) scale(1);opacity:0}}
    
    .pk-round-mask{position:absolute;inset:0;background:rgba(9,10,15,0.95);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:20;color:#fff;}
    .pk-round-mask h2{font-size:42px;margin-bottom:10px;color:#3b82f6;text-shadow:0 0 20px #3b82f6;}
    @keyframes pk-cam-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(5px); } 50% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
  `;
  
  HUD.ensureStyle('pk-racer-style', CSS);

  const root = document.createElement('div');
  root.className = 'pk-racer';
  
  const quitBtn = document.createElement('button');
  quitBtn.className = 'pk-quit-btn';
  quitBtn.innerHTML = '✖';
  quitBtn.onclick = () => { if(confirm('确定要退出本局游戏吗？')) quitGame(); };
  root.appendChild(quitBtn);

  const hud = HUD.createHud(root);

  const povScene = document.createElement('div');
  povScene.className = `pk-pov-scene theme-${theme}`;
  
  let sceneryHTML = '';
  for(let i=0; i<4; i++) {
    sceneryHTML += `<div class="pk-scenery-item" style="animation-delay: ${i*0.5}s"></div>`;
  }

  povScene.innerHTML = `
    <div class="pk-scenery left">${sceneryHTML}</div>
    <div class="pk-scenery right">${sceneryHTML}</div>
    <div class="pk-road-wrap" style="position:absolute;inset:0;z-index:2;">
      <div class="pk-road"></div>
      <div class="pk-lane-line l1"></div>
      <div class="pk-lane-line l2"></div>
      <div class="pk-lane-line l3"></div>
      <div class="pk-lane-line l4"></div>
      <div class="pk-lane-line l5"></div>
    </div>
    
    <div class="pk-car-wrapper pk-player-car" id="player-car">
      <div class="pk-player-aura"></div>
      <div class="pk-player-tag">YOU</div>
      <div class="pk-car-body" id="player-body">
        <div class="pk-car-front-glass"></div>
        <div class="pk-car-roof"></div>
        <div class="pk-car-rear-glass"></div>
        <div class="pk-car-mirror left"></div>
        <div class="pk-car-mirror right"></div>
        <div class="pk-car-spoiler"></div>
        <div class="pk-car-wheel fl"></div>
        <div class="pk-car-wheel fr"></div>
        <div class="pk-car-wheel rl"></div>
        <div class="pk-car-wheel rr"></div>
        <div class="pk-exhaust-flame"></div>
      </div>
    </div>
  `;
  const roadWrap = povScene.querySelector('.pk-road-wrap');
  const playerBody = povScene.querySelector('#player-body');
  
  playerBody.style.background = 'linear-gradient(180deg, #ef4444, #991b1b)';
  playerBody.style.border = '1px solid #fca5a5';

  root.appendChild(povScene);

  const mapPathD = "M 45 45 C 15 15, 85 15, 85 45 C 85 75, 15 75, 45 45 C 75 15, 85 15, 85 45 C 85 75, 15 75, 45 45 C 15 15, 45 15, 45 45 Z";
  const minimap = document.createElement('div');
  minimap.className = 'pk-minimap';
  minimap.innerHTML = `<svg viewBox="0 0 100 100"><path id="map-track-path" class="pk-map-path" d="${mapPathD}" /></svg>`;
  
  let ghostMapHTML = '';
  let ghostSceneHTML = '';
  
  const lanesX = [19.6, 34.4, 50, 65.6, 80.4];
  const carColors = [
    { body: '#3b82f6', light: '#ef4444' }, { body: '#fbbf24', light: '#ef4444' }, 
    { body: '#10b981', light: '#fbbf24' }, { body: '#8b5cf6', light: '#ef4444' }, 
    { body: '#f97316', light: '#fbbf24' }, { body: '#ec4899', light: '#ef4444' }, 
    { body: '#64748b', light: '#ef4444' }, { body: '#ef4444', light: '#fbbf24' }  
  ];

  config.ghosts.forEach((g, i) => {
    ghostMapHTML += `<div class="pk-map-dot" id="map-ghost-${i}" style="background:${carColors[i].body}; color:${carColors[i].body};"></div>`;
    ghostSceneHTML += `
      <div class="pk-car-wrapper pk-ghost-car" id="scene-ghost-${i}" style="opacity:0;">
        <div class="pk-car-body" style="background:${carColors[i].body}; color:${carColors[i].light};">
          <div class="pk-car-front-glass"></div>
          <div class="pk-car-roof"></div>
          <div class="pk-car-rear-glass"></div>
          <div class="pk-car-mirror left"></div>
          <div class="pk-car-mirror right"></div>
          <div class="pk-car-spoiler"></div>
          <div class="pk-car-wheel fl"></div>
          <div class="pk-car-wheel fr"></div>
          <div class="pk-car-wheel rl"></div>
          <div class="pk-car-wheel rr"></div>
          <div class="pk-ghost-light left"></div>
          <div class="pk-ghost-light right"></div>
          <div class="pk-exhaust-flame" style="opacity:0.3"></div>
        </div>
      </div>
    `;
  });
  minimap.innerHTML += ghostMapHTML;
  minimap.innerHTML += `<div class="pk-map-dot" id="map-player" style="background:#10b981; color:#10b981; width:12px; height:12px; z-index:2;"></div>`;
  root.appendChild(minimap);

  // 直接插在 povScene 中，与玩家车平级，避免受到 roadWrap 的层级限制
  povScene.insertAdjacentHTML('beforeend', ghostSceneHTML);

  const qBox = document.createElement('div');
  qBox.className = 'pk-question-box';
  qBox.innerHTML = `<div class="pk-hint"></div><div class="pk-options"></div>`;
  root.appendChild(qBox);
  const hintEl = qBox.querySelector('.pk-hint');
  const optBox = qBox.querySelector('.pk-options');
  wrapper.appendChild(root);

  const pathEl = document.getElementById('map-track-path');
  const pathLength = pathEl.getTotalLength();
  const playerDot = document.getElementById('map-player');
  
  const ghostDots = config.ghosts.map((g, i) => document.getElementById(`map-ghost-${i}`));
  const ghostScenes = config.ghosts.map((g, i) => document.getElementById(`scene-ghost-${i}`));

  const state = {
    round: 1, queue: [], 
    playerProgress: 0, 
    ghosts: config.ghosts.map((g, i) => ({ 
      ...g, 
      // 开局拉开差距，让车出现在屏幕中上部
      progress: 15 + Math.random() * 30,
      targetLaneX: lanesX[i % 5],
      currentLaneX: lanesX[i % 5] 
    })),
    combo: 0, score: 0, timeLeft: config.maxTime,
    over: false, locked: false, correctWord: '', currentItem: null
  };

  let tickTimer = 0, stepTimer = 0, rafId = 0, lastTime = 0;

  function quitGame() {
    state.over = true;
    clearInterval(tickTimer);
    clearTimeout(stepTimer);
    cancelAnimationFrame(rafId);
    container.remove();
  }

  function updateHUD() {
    hud.setScore(state.score);
    hud.setCombo(state.combo);
    hud.setTime(`R${state.round} | ${state.timeLeft}s`);
  }

  function updateGhostViews() {
    const pPoint = pathEl.getPointAtLength((state.playerProgress / 100) * pathLength);
    playerDot.style.left = pPoint.x + '%';
    playerDot.style.top = pPoint.y + '%';

    state.ghosts.forEach((g, i) => {
      const gPoint = pathEl.getPointAtLength((g.progress / 100) * pathLength);
      ghostDots[i].style.left = gPoint.x + '%';
      ghostDots[i].style.top = gPoint.y + '%';

      const delta = g.progress - state.playerProgress;
      
      // 如果被甩开太远，或者跑到视野外，直接隐藏
      if (delta < -5 || delta > 50) {
        ghostScenes[i].style.opacity = '0';
        g.currentLaneX = g.targetLaneX; 
      } else {
        ghostScenes[i].style.opacity = '1';
        g.currentLaneX += (g.targetLaneX - g.currentLaneX) * 0.1;

        // 当 delta 为 50（最远）时，在 top 10%，缩放 0.3
        // 当 delta 为 -5（最近，快被追上）时，在 top 85%，缩放 1.2
        const ratio = (delta + 5) / 55; // 0 (最近) 到 1 (最远)
        
        const topPercent = 85 - ratio * 75; 
        const scale = 1.2 - ratio * 0.9; 

        // 设置动态 z-index，确保近的车盖住远的车，但都不超过玩家车的 20
        ghostScenes[i].style.zIndex = 10 - Math.floor(ratio * 10);

        ghostScenes[i].style.top = topPercent + '%';
        ghostScenes[i].style.left = g.currentLaneX + '%';
        
        const tilt = (g.targetLaneX - g.currentLaneX) * 0.5;
        ghostScenes[i].style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${tilt}deg)`;
      }
    });
  }

  function showFloatText(text, color = '#fbbf24') {
    const el = document.createElement('div');
    el.className = 'pk-float-text';
    el.textContent = text;
    el.style.left = '50%'; el.style.top = '40%'; el.style.color = color;
    wrapper.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  function raceLoop(now) {
    if (state.over) return;
    if (!lastTime) lastTime = now;
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    state.ghosts.forEach(g => {
      g.progress = Math.min(100, g.progress + g.speed * dt);
      if (Math.random() < 0.01) {
        g.targetLaneX = lanesX[Math.floor(Math.random() * lanesX.length)];
      }
    });
    
    updateGhostViews();

    const winner = state.ghosts.find(g => g.progress >= 100);
    if (winner) {
      finishGame(false, `被对手超车了！`);
      return;
    }

    rafId = requestAnimationFrame(raceLoop);
  }

  function startRound(rNum, words) {
    state.round = rNum;
    state.queue = words.map(w => ({ word: w.en || w.word, hint: w.zh || w.hint }));
    state.playerProgress = 0;
    
    state.ghosts.forEach(g => { 
      g.progress = 15 + Math.random() * 30; 
      g.currentLaneX = g.targetLaneX;
    });
    
    updateGhostViews();
    updateHUD();
    
    if (rNum > 1) {
      const mask = document.createElement('div');
      mask.className = 'pk-round-mask';
      mask.innerHTML = `<h2>ROUND ${rNum}</h2><p style="color:#ef4444;font-size:18px;">对手车队重新出发！</p>`;
      wrapper.appendChild(mask);
      setTimeout(() => { mask.remove(); nextQuestion(); }, 1500);
    } else {
      nextQuestion();
    }

    lastTime = 0;
    rafId = requestAnimationFrame(raceLoop);
  }

  function nextQuestion() {
    if (state.over) return;
    if (state.queue.length === 0) {
      finishRound();
      return;
    }

    state.currentItem = state.queue.shift();
    state.correctWord = state.currentItem.word;
    state.locked = false;

    hintEl.textContent = state.currentItem.hint;

    let distractors = [];
    const used = new Set([state.correctWord]);
    while(distractors.length < 2 && allWords.length > 0) {
      const rand = allWords[Math.floor(Math.random() * allWords.length)];
      const w = rand.en || rand.word;
      if (!used.has(w)) { used.add(w); distractors.push(w); }
    }
    while(distractors.length < 2) {
      distractors.push(Math.random().toString(36).substring(2, 6));
    }

    const opts = [state.correctWord, ...distractors].sort(() => Math.random() - 0.5);

    optBox.innerHTML = '';
    opts.forEach(w => {
      const b = document.createElement('button');
      b.className = 'pk-opt';
      b.textContent = w;
      b.dataset.word = w;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); onPick(b); });
      optBox.appendChild(b);
    });
  }

  function onPick(btn) {
    if (state.locked || state.over) return;
    const picked = btn.dataset.word;

    if (picked === state.correctWord) {
      state.locked = true;
      btn.classList.add('correct');
      Array.from(optBox.children).forEach(b => b.disabled = true);
      
      state.combo += 1;
      const gain = config.speed + state.combo * 1.5;
      state.playerProgress = Math.min(100, state.playerProgress + gain);
      
      roadWrap.classList.add('sway');
      playerBody.classList.add('boosting');
      setTimeout(() => { 
        roadWrap.classList.remove('sway'); 
        playerBody.classList.remove('boosting');
      }, 600);

      playSound('correct');
      state.score += 100 + state.combo * 20;
      updateHUD();
      showFloatText('加速 +' + Math.floor(gain) + '%', '#10b981');
      HUD.speak(state.correctWord);

      wrapper.style.animation = 'pk-cam-shake 0.3s';
      setTimeout(() => wrapper.style.animation = '', 300);

      stepTimer = setTimeout(() => {
        if (state.playerProgress >= 100) finishRound();
        else nextQuestion();
      }, 600);

    } else {
      btn.classList.add('wrong');
      btn.disabled = true;
      state.combo = 0;
      state.playerProgress = Math.max(0, state.playerProgress - 5);
      
      playerBody.classList.add('braking');
      setTimeout(() => playerBody.classList.remove('braking'), 300);

      playSound('wrong');
      updateHUD();
      showFloatText('打滑 -5%', '#ef4444');

      const allWrong = Array.from(optBox.children).every(b => b.disabled);
      if (allWrong) {
        Array.from(optBox.children).forEach(b => {
          if (b.dataset.word === state.correctWord) b.classList.add('correct');
        });
        stepTimer = setTimeout(() => {
          if (state.playerProgress >= 100) finishRound();
          else nextQuestion();
        }, 1000);
      }
    }
  }

  function finishRound() {
    if (state.round === 1 && round2Words.length > 0) {
      cancelAnimationFrame(rafId);
      startRound(2, round2Words);
    } else {
      finishGame(true, '🏁 冲线成功！');
    }
  }

  function finishGame(win, titleStr) {
    if (state.over) return;
    state.over = true;
    clearInterval(tickTimer);
    clearTimeout(stepTimer);
    cancelAnimationFrame(rafId);

    if (win) playSound('win');

    hud.showResult({
      win,
      title: titleStr,
      rows: [['总得分', state.score], ['最高连击', state.combo], ['剩余时间', Math.max(0, state.timeLeft) + 's']],
      onRestart: () => { quitGame(); window.startRacerGame(); },
      onExit: () => { quitGame(); }
    });
  }

  tickTimer = setInterval(() => {
    if (state.over) return;
    state.timeLeft -= 1;
    updateHUD();
    if (state.timeLeft <= 0) finishGame(false, '时间耗尽，被追上了！');
  }, 1000);

  updateGhostViews();
  startRound(1, round1Words);
}