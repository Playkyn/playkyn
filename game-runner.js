/* ═══════════════════════════════════════════════════════════
   游戏 7 · 单词跑酷 (终极进化版)
   ═══════════════════════════════════════════════════════════ */
let runnerGame = null;

function startRunnerGame() {
  const words = getGameWords(30);
  if (!words.length) { alert('没有可用单词'); return; }

  runnerGame = {
    words: words,
    idx: 0,
    score: 0,
    life: 3,
    combo: 0,          // ★ 必须加这个，否则连击算分会报错卡死
    timeLeft: 60,
    timer: null,
    locked: false,
    ended: false
  };

  showScreen('s-game-runner');
  $('#runnerScore').textContent = '0';
  $('#runnerLife').textContent = '3';
  $('#runnerTimer').textContent = '60';
  
  nextRunnerQuestion();

  // 倒计时
  if (runnerGame.timer) clearInterval(runnerGame.timer);
  runnerGame.timer = setInterval(() => {
    if (!runnerGame || runnerGame.ended) return;
    runnerGame.timeLeft--;
    $('#runnerTimer').textContent = Math.max(0, runnerGame.timeLeft);
    if (runnerGame.timeLeft <= 0) endRunnerGame();
  }, 1000);
}

function nextRunnerQuestion() {
  if (!runnerGame || runnerGame.ended) return;
  if (runnerGame.idx >= runnerGame.words.length) runnerGame.idx = 0; // 循环

  const w = runnerGame.words[runnerGame.idx];
  const obstacle = $('#runnerObstacle');
  const char = $('#runnerChar');
  
  // ★ 核心修复：瞬间取消动画、隐藏到屏幕右侧，强制浏览器重绘
  obstacle.style.transition = 'none';
  obstacle.className = 'runner-obstacle';
  obstacle.style.right = '-200px'; 
  void obstacle.offsetWidth; // 强制浏览器重绘，确保它真的瞬移回去了
  
  // 恢复动画过渡，准备滑入
  obstacle.style.transition = 'right 0.3s ease-out';
   $('#runnerQZh').textContent = w.zh;

  // 生成选项
  const dists = shuffle(runnerGame.words.filter(x => x.en !== w.en)).slice(0, 2);
  const options = shuffle([w, ...dists]);
  
  const optBox = $('#runnerOptions');
  optBox.innerHTML = options.map(o => `
    <button class="option runner-opt" data-en="${esc(o.en)}" style="padding:12px 15px; font-size:15px;">
      ${esc(o.en)}
    </button>
  `).join('');

  // 障碍物滑入并停在中间
  setTimeout(() => {
    if (!runnerGame || runnerGame.ended) return;
    obstacle.style.right = '35%'; // 👈 新代码：直接控制右偏移，从右向左滑入
  }, 50);

  // 绑定选项事件
  optBox.querySelectorAll('.runner-opt').forEach(btn => {
    btn.onclick = () => {
      if (runnerGame.locked || runnerGame.ended) return;
      runnerGame.locked = true;
      const ok = btn.dataset.en === w.en;

      if (ok) {
        // 答对反馈：跳跃、连击、金币雨
        runnerGame.combo++;
        Sfx.correct();
        
        // 播放连击动画
        if (runnerGame.combo >= 2) {
          const comboEl = $('#runnerCombo');
          comboEl.textContent = `Combo x${runnerGame.combo}!`;
          comboEl.classList.remove('show');
          void comboEl.offsetWidth; // 强制重绘，重新触发动画
          comboEl.classList.add('show');
        }

        spawnStars(3, innerWidth/2, innerHeight*0.5, ['⭐', '✨', '💰']);
        
        // 跳跃
        char.classList.add('jump');
        setTimeout(() => char.classList.remove('jump'), 600); 
        
        obstacle.classList.add('pass');
        
        // 连击加分
        runnerGame.score += 10 + (runnerGame.combo * 2); 
        $('#runnerScore').textContent = runnerGame.score;
        
        btn.style.background = 'var(--green)';
        btn.style.color = '#fff';
      } else {
        // 答错反馈：撞击、震屏、清零连击
        runnerGame.combo = 0;
        Sfx.wrong();
        
        // 屏幕震动
        const stage = $('#runnerStage');
        stage.classList.add('screen-shake');
        setTimeout(() => stage.classList.remove('screen-shake'), 400);

        obstacle.classList.add('hit');
        $('#runnerHitEffect').classList.add('show');
        setTimeout(() => $('#runnerHitEffect').classList.remove('show'), 500);
        
        runnerGame.life--;
        $('#runnerLife').textContent = runnerGame.life;
        btn.style.background = 'var(--red)';
        btn.style.color = '#fff';
        
        if (runnerGame.life <= 0) {
          setTimeout(() => endRunnerGame(), 800);
          return;
        }
      }

      // 锁住所有选项
      optBox.querySelectorAll('button').forEach(b => {
        b.disabled = true;
        if (b.dataset.en === w.en && !ok) b.style.border = '2px solid var(--green)';
      });

      // 进入下一题
      runnerGame.idx++;
      setTimeout(() => {
        if (!runnerGame || runnerGame.ended) return;
        runnerGame.locked = false;
        nextRunnerQuestion();
      }, ok ? 600 : 1200);
    };
  });
}

function endRunnerGame() {
  if (!runnerGame || runnerGame.ended) return;
  runnerGame.ended = true;
  clearInterval(runnerGame.timer);

  const score = runnerGame.score;
  const win = runnerGame.life > 0;
  
  let coins = Math.floor(score / 2);
  let xp = Math.floor(score / 3);
  if (win) {
    coins += 15;
    xp += 10;
    Sfx.finish();
    celebrateBig();
  }

  addCoins(coins);
  addXp(xp);
  save();

  openModal(`
    <div style="text-align:center">
      <div style="font-size:60px">${win ? '🏅' : '💥'}</div>
      <div style="font-size:20px;font-weight:900;margin:10px 0">
        ${win ? '跑酷结束！' : '哎呀，撞晕了！'}
      </div>
      <div style="font-size:32px;font-weight:900;color:var(--pink)">${score} 分</div>
      <div class="muted small" style="font-weight:700;margin-top:6px">
        剩余生命：${runnerGame.life} · 用时：${60 - runnerGame.timeLeft} 秒
      </div>
      <div style="color:var(--orange);font-weight:900;margin-top:10px">🎁 +${coins} 金币 · +${xp} 经验</div>
      
      <button class="btn primary" id="btnRunnerAgain" style="margin-top:20px">🔄 再跑一次</button>
      <button class="btn ghost small" id="btnRunnerExit" style="margin-top:10px">返回游戏乐园</button>
    </div>
  `);

  $('#btnRunnerAgain').onclick = () => { Sfx.click(); closeModal(); startRunnerGame(); };
  $('#btnRunnerExit').onclick = () => { Sfx.click(); closeModal(); showGamesScreen(); };
}

$('#btnRunnerBack').onclick = () => {
  if (!confirm('确定要退出跑酷吗？')) return;
  Sfx.click();
  if (runnerGame) {
    clearInterval(runnerGame.timer);
    runnerGame.ended = true;
  }
  showGamesScreen();
};

// ★ 暴露入口
window.startRunnerGame = startRunnerGame;