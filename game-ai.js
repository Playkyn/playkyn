const AI_DIFFICULTY = {
  easy: { name:'简单', icon:'🌱', min:6,  max:9,  target:'每分钟答对 15 题', color:'#4ade80' },
  mid:  { name:'中等', icon:'🔥', min:9,  max:11, target:'每分钟答对 20 题', color:'#f59e0b' },
  hard: { name:'困难', icon:'💎', min:11, max:14, target:'每分钟答对 25 题', color:'#ff6b9d' }
};


let aiGame=null;

/* —— 人机对决 · 难度选择 —— */
function showAiDifficulty(){
  openModal(`
    <div class="modal-title">🤖 人机对决 · 选择难度</div>
    <div class="tip" style="background:rgba(167,139,250,.12);border-color:rgba(167,139,250,.3);text-align:center">
      🎯 电脑会模拟真实对手的答题速度，选一个适合你的难度吧！
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">
      ${Object.entries(AI_DIFFICULTY).map(([key,cfg])=>`
        <button class="btn ghost" data-diff="${key}" style="padding:16px;text-align:left;
          border-color:${cfg.color};color:${cfg.color};background:${cfg.color}11">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:28px">${cfg.icon}</span>
            <div style="flex:1">
              <div style="font-size:16px;font-weight:900">${cfg.name}</div>
              <div style="font-size:11px;opacity:.7;font-weight:700;margin-top:2px">${cfg.target}</div>
            </div>
            <span style="font-size:20px;opacity:.5">›</span>
          </div>
        </button>
      `).join('')}
    </div>
    <button class="btn ghost small" id="btnAiDiffCancel" style="margin-top:14px">取消</button>
  `);
  document.querySelectorAll('[data-diff]').forEach(btn=>{
    btn.onclick = ()=>{
      Sfx.click();
      const diff = btn.dataset.diff;
      closeModal();
      startAiGame(diff);
    };
  });
  $('#btnAiDiffCancel').onclick = ()=>{ Sfx.click(); closeModal(); };
}

function startAiGame(diff){
  diff = diff || 'mid';                     // 默认中等
  const cfg = AI_DIFFICULTY[diff] || AI_DIFFICULTY.mid;

  if(aiGame){ clearInterval(aiGame.timer); clearInterval(aiGame.botTimer); }
  const words=getGameWords(40);
  aiGame={
    words,idx:0,playerScore:0,botScore:0,diff:diff,cfg:cfg,
    timeLeft:60,timer:null,botTimer:null,locked:false,ended:false
  };
  showScreen('s-game-ai');
  $('#aiPlayerScore').textContent='0';
  $('#aiBotScore').textContent='0';
  $('#aiTimer').textContent='60';
  renderAiQuestion();

  aiGame.timer=setInterval(()=>{
    if(!aiGame||aiGame.ended)return;
    aiGame.timeLeft--;
    $('#aiTimer').textContent=Math.max(0,aiGame.timeLeft);
    if(aiGame.timeLeft<=5 && aiGame.timeLeft>0){ Sfx.pop(); }
    if(aiGame.timeLeft<=0) endAiGame();
  },1000);

  // ★ 电脑按难度加分：每 3 秒一次，共 20 次
  aiGame.botTimer=setInterval(()=>{
    if(!aiGame||aiGame.ended||aiGame.timeLeft<=0)return;
    const range = cfg.max - cfg.min + 1;
    aiGame.botScore += cfg.min + Math.floor(Math.random()*range);
    $('#aiBotScore').textContent=aiGame.botScore;
  },3000);
}



function renderAiQuestion(){
  if(!aiGame||aiGame.ended)return;
  const w=aiGame.words[aiGame.idx % aiGame.words.length];
  const mode=Math.random()<0.5?'en2zh':'zh2en';
  const distractors=shuffle(aiGame.words.filter(x=>x.en!==w.en)).slice(0,3);
  const options=shuffle([w,...distractors]);
  const isEn2Zh=mode==='en2zh';

  $('#aiQuestionCard').innerHTML=`
    <div class="q-label">${isEn2Zh?'🔍 选出中文释义':'🔍 选出英文单词'}</div>
    ${isEn2Zh
      ? `<div style="text-align:center">
           <div class="syll-word" style="font-size:26px;line-height:1.45">${renderSyllablesHTML(w.en)}</div>
           ${w.ph?`<div class="phonetic-line" style="font-size:15px;margin-top:4px">${renderPhonetic(w.ph)}</div>`:''}
           <button class="speak-btn" data-speak="${esc(w.en)}" style="margin-top:10px">🔊</button>
         </div>`
      : `<div class="zh-big" style="text-align:center">${esc(w.zh)}</div>`}
    <div class="options">
      ${options.map(o=>`<button class="option" data-en="${esc(o.en)}">${esc(isEn2Zh?o.zh:o.en)}</button>`).join('')}
    </div>`;

  $('#aiQuestionCard').querySelectorAll('.option').forEach(btn=>{
    btn.onclick=()=>{
      if(!aiGame||aiGame.locked||aiGame.ended||aiGame.timeLeft<=0)return;
      aiGame.locked=true;
      const ok=btn.dataset.en===w.en;
      if(ok){
        aiGame.playerScore+=10;
        $('#aiPlayerScore').textContent=aiGame.playerScore;
        Sfx.correct();
        btn.classList.add('correct');
        spawnStars(2,innerWidth/2,innerHeight*0.5,['⭐','✨']);
      }else{
        aiGame.playerScore=Math.max(0,aiGame.playerScore-3);
        $('#aiPlayerScore').textContent=aiGame.playerScore;
        Sfx.wrong();
        btn.classList.add('wrong');
        $('#aiQuestionCard').querySelectorAll('.option').forEach(b=>{
          if(b.dataset.en===w.en) b.classList.add('correct');
        });
      }
      setTimeout(()=>{
        if(!aiGame||aiGame.ended)return;
        aiGame.locked=false;
        aiGame.idx++;
        if(aiGame.timeLeft>0) renderAiQuestion();
      }, ok?350:800);
    };
  });
}

function endAiGame(){
  if(!aiGame||aiGame.ended)return;
  aiGame.ended=true;
  clearInterval(aiGame.timer);
  clearInterval(aiGame.botTimer);
  const p=aiGame.playerScore,b=aiGame.botScore;
  const diff=aiGame.diff,cfg=aiGame.cfg;
  const win=p>b,draw=p===b;
  let rewardTxt='';
  if(win){ addCoins(30);addXp(20);Sfx.finish();celebrateBig();
    rewardTxt='<div style="color:var(--orange);font-weight:900;margin-top:8px">🎁 +30 金币 · +20 经验</div>'; }
  else if(draw){ addCoins(15);addXp(10);Sfx.correct();
    rewardTxt='<div style="color:var(--orange);font-weight:900;margin-top:8px">🎁 +15 金币 · +10 经验</div>'; }
  else{ Sfx.wrong(); }
  trackGamePlayed('ai');
  save();
  const emoji=win?'🏆':draw?'🤝':'💪';
  const title=win?'你赢了！':draw?'平局！':'再接再厉！';
  openModal(`
    <div style="text-align:center">
      <div style="font-size:60px">${emoji}</div>
      <div style="font-size:20px;font-weight:900;margin:10px 0">${title}</div>
      <div class="muted small" style="font-weight:800;margin-bottom:6px">
        ${cfg.icon} ${cfg.name}难度 · ${cfg.target}
      </div>
      <div style="display:flex;gap:16px;justify-content:center;margin:18px 0;align-items:center">
        <div><div style="font-size:28px;font-weight:900;color:var(--pink)">${p}</div>
          <div class="muted small" style="font-weight:700">你</div></div>
        <div style="font-size:20px;color:var(--muted)">:</div>
        <div><div style="font-size:28px;font-weight:900;color:var(--purple)">${b}</div>
          <div class="muted small" style="font-weight:700">电脑</div></div>
      </div>
      ${rewardTxt}
      <button class="btn primary" id="btnAiAgain" style="margin-top:20px">🔄 再来一局（同难度）</button>
      <button class="btn ghost small" id="btnAiChangeDiff" style="margin-top:10px">🎚️ 换个难度</button>
      <button class="btn ghost small" id="btnAiExit" style="margin-top:10px">返回游戏乐园</button>
    </div>`);
  $('#btnAiAgain').onclick=()=>{ Sfx.click();closeModal();startAiGame(diff); };
  $('#btnAiChangeDiff').onclick=()=>{ Sfx.click();closeModal();showAiDifficulty(); };
  $('#btnAiExit').onclick=()=>{ Sfx.click();closeModal();showGamesScreen(); };
}


$('#btnAiBack').onclick=()=>{
  if(!confirm('确定要退出本局对决吗？'))return;
  Sfx.click();
  if(aiGame){ clearInterval(aiGame.timer);clearInterval(aiGame.botTimer);aiGame.ended=true; }
  showGamesScreen();
};