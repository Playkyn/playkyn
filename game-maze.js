window.startMazeGame = function() {
  if (!window.PK_HUD || typeof window.getGameWords !== 'function') {
    alert("启动失败：找不到依赖。");
    return;
  }
  const HUD = window.PK_HUD;

  let rawWords = window.getGameWords(10, 'all');
  if (!rawWords || rawWords.length === 0) return alert("当前词库为空！");

  showMazeMenu(rawWords);
};

function showMazeMenu(words) {
  const menu = document.createElement('div');
  menu.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100vh;z-index:99999;background:#090a0f;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;font-family:system-ui,sans-serif; overflow-y:auto; padding: 20px; box-sizing: border-box;';
  
  menu.innerHTML = `
    <h2 style="margin-bottom:8px;font-size:32px;text-shadow:0 0 20px #fbbf24;color:#fff; text-align:center;">🧩 单词连阵</h2>
    <p style="color:#94a3b8;margin-bottom:24px;font-size:15px;text-align:center;">按住滑动，或依次点击字母连线！</p>
    
    <div style="display:flex;gap:12px;flex-direction:column;width:280px; padding-bottom: 40px;">
      <button id="btn-easy" style="padding:16px;border-radius:12px;border:2px solid #10b981;background:transparent;color:#10b981;font-size:16px;font-weight:bold;cursor:pointer;text-align:left;">🌱 轻松模式 (5x5 网格)</button>
      <button id="btn-normal" style="padding:16px;border-radius:12px;border:2px solid #3b82f6;background:transparent;color:#3b82f6;font-size:16px;font-weight:bold;cursor:pointer;text-align:left;">⚔️ 标准模式 (6x6 网格)</button>
      <button id="btn-cancel" style="padding:12px;border-radius:12px;border:0;background:transparent;color:#94a3b8;font-size:14px;margin-top:8px;cursor:pointer;">取消</button>
    </div>
  `;
  document.body.appendChild(menu);

  menu.querySelector('#btn-cancel').onclick = () => menu.remove();
  menu.querySelector('#btn-easy').onclick = () => { menu.remove(); initMaze(words, 5); };
  menu.querySelector('#btn-normal').onclick = () => { menu.remove(); initMaze(words, 6); };
}

function initMaze(words, gridSize) {
  const HUD = window.PK_HUD;

  const container = document.createElement('div');
  container.id = 'pk-maze-root';
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100vh;z-index:99999;background:#090a0f;display:flex;justify-content:center;overflow:hidden;';
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;max-width:500px;height:100%;position:relative;overflow:hidden;font-family:system-ui,sans-serif; display:flex; flex-direction:column; background:linear-gradient(180deg, #1e1b4b, #090a0f 80%); touch-action: none; user-select: none; -webkit-user-select: none;';
  container.appendChild(wrapper);
  document.body.appendChild(container);

  const CSS = `
    .pk-maze-game { display:flex; flex-direction:column; height:100%; padding: 12px; box-sizing:border-box; position:relative; justify-content:center; touch-action: none; }
    
    .pk-quit-btn{position:absolute;top:12px;right:12px;z-index:50;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:50%;width:36px;height:36px;font-size:20px;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;}
    
    .pk-maze-hud { text-align:center; margin-bottom:20px; pointer-events:none; }
    .pk-target-hint { font-size:32px; font-weight:900; color:#fff; text-shadow:0 0 20px #10b981; }
    .pk-target-word { font-size:16px; color:#94a3b8; letter-spacing:4px; margin-top:8px; font-weight:bold; min-height:24px;}
    
    .pk-grid-container { position:relative; margin: 0 auto; touch-action:none; }
    .pk-grid { 
      display:grid; gap:8px; padding:12px; background:rgba(0,0,0,0.5); border-radius:20px; 
      box-shadow: inset 0 5px 20px rgba(0,0,0,0.8); border: 1px solid #374151;
      touch-action: none;
    }
    
    .pk-tile { 
      width: 54px; height: 54px; border-radius: 12px; background: linear-gradient(180deg, #334155, #1e293b); 
      display:flex; align-items:center; justify-content:center; font-size: 26px; font-weight: 900; color:#fff;
      box-shadow: 0 4px 6px rgba(0,0,0,0.5), inset 0 2px 2px rgba(255,255,255,0.1);
      transition: transform 0.1s, background 0.1s; 
      border: 1px solid #475569; position:relative; z-index:1;
      cursor: pointer;
    }
    
    .pk-tile.selected { 
      background: linear-gradient(180deg, #10b981, #047857); border-color:#34d399; 
      box-shadow: 0 0 15px #10b981; z-index: 2; transform: scale(1.1);
    }
    .pk-tile.correct { 
      background: linear-gradient(180deg, #fbbf24, #b45309); border-color:#fcd34d; 
      transform: scale(1.2); z-index: 10; opacity: 0; transition: all 0.3s ease-out;
    }
    .pk-tile.fall { animation: drop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
    @keyframes drop-in { from { transform: translateY(-30px); opacity:0; } to { transform: translateY(0); opacity:1; } }

    .pk-svg-line { position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:0; }
  `;
  HUD.ensureStyle('pk-maze-style', CSS);

  const gameDiv = document.createElement('div');
  gameDiv.className = 'pk-maze-game';
  gameDiv.innerHTML = `
    <button class="pk-quit-btn" id="maze-quit">✖</button>
    <div class="pk-maze-hud">
      <div class="pk-target-hint" id="maze-hint">Loading</div>
      <div class="pk-target-word" id="maze-word"></div>
    </div>
    <div class="pk-grid-container" id="grid-container">
      <div class="pk-grid" id="grid"></div>
      <svg class="pk-svg-line" id="svg-line"></svg>
    </div>
  `;
  wrapper.appendChild(gameDiv);

  const gridEl = document.getElementById('grid');
  const svgEl = document.getElementById('svg-line');
  const hintEl = document.getElementById('maze-hint');
  const wordEl = document.getElementById('maze-word');
  const containerEl = document.getElementById('grid-container');

  const state = {
    queue: words.map(w => ({ 
      word: (w.en || w.word).toUpperCase().replace(/[^A-Z]/g, ''), 
      hint: w.zh || w.hint 
    })).filter(w => w.word.length > 0),
    currentItem: null,
    targetWord: '',
    gridSize: gridSize,
    gridData: [], 
    selected: [], 
    over: false
  };

  let isDragging = false;
  let isMoved = false;

  document.getElementById('maze-quit').onclick = () => { if(confirm('确定退出吗？')) quitGame(); };

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  function getRandomLetter() { return letters[Math.floor(Math.random() * 26)]; }

  // 修复后的注入算法：记录 visited，保证绝不走回头路覆盖
  function initGridWithWord(word) {
    const grid = [];
    for (let r = 0; r < state.gridSize; r++) {
      const row = [];
      for (let c = 0; c < state.gridSize; c++) { row.push(getRandomLetter()); }
      grid.push(row);
    }

    let cr = Math.floor(Math.random() * state.gridSize);
    let cc = Math.floor(Math.random() * state.gridSize);
    let visited = new Set();
    visited.add(`${cr},${cc}`);

    for (let i = 0; i < word.length; i++) {
      grid[cr][cc] = word[i];
      if (i === word.length - 1) break;

      let dirs = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]];
      dirs.sort(() => Math.random() - 0.5);
      
      let found = false;
      for (let d of dirs) {
        let nr = cr + d[0], nc = cc + d[1];
        if (nr >= 0 && nr < state.gridSize && nc >= 0 && nc < state.gridSize && !visited.has(`${nr},${nc}`)) {
          cr = nr; cc = nc; found = true; visited.add(`${cr},${cc}`); break;
        }
      }
      if (!found) return initGridWithWord(word);
    }
    return grid;
  }

  function renderGrid() {
    const maxBoardWidth = Math.min(window.innerWidth - 40, 400);
    const tileSize = Math.floor((maxBoardWidth - 24 - (state.gridSize - 1) * 8) / state.gridSize);
    
    gridEl.style.gridTemplateColumns = `repeat(${state.gridSize}, ${tileSize}px)`;
    gridEl.innerHTML = '';
    
    for (let r = 0; r < state.gridSize; r++) {
      for (let c = 0; c < state.gridSize; c++) {
        const tile = document.createElement('div');
        tile.className = 'pk-tile';
        tile.textContent = state.gridData[r][c];
        tile.dataset.r = r;
        tile.dataset.c = c;
        tile.style.width = tileSize + 'px';
        tile.style.height = tileSize + 'px';
        tile.style.fontSize = (tileSize * 0.5) + 'px';
        gridEl.appendChild(tile);
      }
    }
  }

  function nextQuestion() {
    if (state.queue.length === 0) { finishGame(); return; }

    state.currentItem = state.queue.shift();
    state.targetWord = state.currentItem.word;
    state.selected = [];
    isDragging = false;
    svgEl.innerHTML = '';

    hintEl.textContent = state.currentItem.hint;
    wordEl.textContent = Array(state.targetWord.length).fill('_').join(' ');

    state.gridData = initGridWithWord(state.targetWord);
    renderGrid();
  }

  function getTileCenter(el) {
    const rect = el.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    return {
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + rect.height / 2
    };
  }

  function updateLine() {
    svgEl.innerHTML = '';
    if (state.selected.length < 2) return;

    let pathStr = '';
    state.selected.forEach((p, i) => {
      const el = gridEl.querySelector(`.pk-tile[data-r="${p.r}"][data-c="${p.c}"]`);
      if (el) {
        const center = getTileCenter(el);
        if (i === 0) pathStr += `M ${center.x} ${center.y} `;
        else pathStr += `L ${center.x} ${center.y} `;
      }
    });

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathStr);
    path.setAttribute('stroke', '#10b981');
    path.setAttribute('stroke-width', '8');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svgEl.appendChild(path);
  }

  // 支持点击与滑动
  function handleStart(e) {
    if (state.over) return;
    e.preventDefault(); 
    isMoved = false;

    let target = e.target;
    if (!target.classList.contains('pk-tile')) {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      if (clientX !== undefined) target = document.elementFromPoint(clientX, clientY);
    }
    if (!target || !target.classList.contains('pk-tile')) return;

    const r = parseInt(target.dataset.r);
    const c = parseInt(target.dataset.c);
    const char = state.gridData[r][c];

    // 如果已经有选中的格子
    if (state.selected.length > 0) {
      const last = state.selected[state.selected.length - 1];
      
      // 点击已经选中的最后一个字母：撤销（取消选中）
      if (last.r === r && last.c === c) {
        state.selected.pop();
        target.classList.remove('selected');
        updateLine();
        return;
      }
      // 已经选过的不重复选
      if (state.selected.find(p => p.r === r && p.c === c)) return;
      
      // 判断是否相邻
      const dr = Math.abs(r - last.r);
      const dc = Math.abs(c - last.c);
      if (dr <= 1 && dc <= 1) {
        state.selected.push({ r, c, char });
        target.classList.add('selected');
        playSound('select');
        updateLine();
        checkMatch(); // 检查是否拼完了
        return;
      } else {
        // 如果点击了不相邻的，重置
        clearSelection();
      }
    }

    // 第一次点击（或重置后）
    isDragging = true;
    state.selected = [{ r, c, char }];
    target.classList.add('selected');
    playSound('select');
    updateLine();
  }

  function handleMove(e) {
    if (!isDragging || state.over) return;
    e.preventDefault();
    isMoved = true;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined) return;

    const target = document.elementFromPoint(clientX, clientY);
    if (!target || !target.classList.contains('pk-tile')) return;

    const r = parseInt(target.dataset.r);
    const c = parseInt(target.dataset.c);
    
    if (state.selected.length === 0) return;
    const last = state.selected[state.selected.length - 1];

    if (last.r !== r || last.c !== c) {
      const dr = Math.abs(r - last.r);
      const dc = Math.abs(c - last.c);
      if (dr <= 1 && dc <= 1 && !state.selected.find(p => p.r === r && p.c === c)) {
        state.selected.push({ r, c, char: state.gridData[r][c] });
        target.classList.add('selected');
        playSound('select');
        updateLine();
        checkMatch();
      }
    }
  }

  function handleEnd() {
    if (!isDragging) return;
    isDragging = false;
    
    // 如果是滑动结束，检查匹配并清空。如果是点击模式，保留连线等待继续点。
    if (isMoved) {
      checkMatch();
      if (state.selected.length < state.targetWord.length) {
         clearSelection();
      }
    }
  }

  // 检查是否拼写完整且正确
  function checkMatch() {
    if (state.selected.length === 0) return;
    const word = state.selected.map(p => p.char).join('');
    
    if (word.length === state.targetWord.length) {
      if (word === state.targetWord) {
        handleCorrectWord();
      } else {
        // 长度够了但拼错了
        playSound('wrong');
        clearSelection();
      }
    }
  }

  gridEl.addEventListener('pointerdown', handleStart);
  gridEl.addEventListener('touchstart', handleStart, {passive: false});
  window.addEventListener('pointermove', handleMove);
  window.addEventListener('touchmove', handleMove, {passive: false});
  window.addEventListener('pointerup', handleEnd);
  window.addEventListener('touchend', handleEnd);

  function clearSelection() {
    state.selected.forEach(p => {
      const el = gridEl.querySelector(`.pk-tile[data-r="${p.r}"][data-c="${p.c}"]`);
      if (el) el.classList.remove('selected');
    });
    state.selected = [];
    svgEl.innerHTML = '';
  }

  function handleCorrectWord() {
    playSound('win');
    isDragging = false;
    
    state.selected.forEach(p => {
      const el = gridEl.querySelector(`.pk-tile[data-r="${p.r}"][data-c="${p.c}"]`);
      if (el) {
        el.classList.remove('selected');
        el.classList.add('correct');
      }
    });

    setTimeout(() => {
      state.selected.forEach(p => {
        state.gridData[p.r][p.c] = getRandomLetter();
      });
      state.selected = [];
      svgEl.innerHTML = '';
      
      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          const el = gridEl.querySelector(`.pk-tile[data-r="${r}"][data-c="${c}"]`);
          if (el) {
            el.className = 'pk-tile fall';
            el.textContent = state.gridData[r][c];
          }
        }
      }
      setTimeout(nextQuestion, 300);
    }, 300);
  }

  let audioCtx = null;
  function playSound(type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;
      if (type === 'select') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600 + state.selected.length * 50, now);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
      } else if (type === 'win') {
        osc.type = 'square'; osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(600, now + 0.1); osc.frequency.setValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
      }
    } catch (e) {}
  }

  function quitGame() {
    state.over = true;
    container.remove();
  }

  function finishGame() {
    if (state.over) return;
    state.over = true;
    HUD.createHud(wrapper).showResult({
      win: true,
      title: '🎉 闯关成功！',
      rows: [['完成单词', words.length]],
      onRestart: () => { quitGame(); window.startMazeGame(); },
      onExit: () => { quitGame(); }
    });
  }

  nextQuestion();
}