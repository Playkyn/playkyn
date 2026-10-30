let listenGame=null;

function startListenGame(){
  if(!Speaker.supported){
    if(!confirm('当前浏览器不支持语音合成，无法播放发音。\n是否改为显示英文单词来做英译中题目？'))return;
  }
  if(listenGame){ clearInterval(listenGame.timer); Speaker.stop(); }
  const words=getGameWords(40);
  listenGame={
    words,idx:0,score:0,correct:0,wrong:0,
    timeLeft:60,timer:null,locked:false,ended:false,
    fallbackMode:!Speaker.supported
  };
  showScreen('s-game-listen');
  $('#listenScore').textContent='0';
  $('#listenTimer').textContent='60';
  renderListenQuestion();

  listenGame.timer=setInterval(()=>{
    if(!listenGame||listenGame.ended)return;
    listenGame.timeLeft--;
    $('#listenTimer').textContent=Math.max(0,listenGame.timeLeft);
    if(listenGame.timeLeft<=5 && listenGame.timeLeft>0){ Sfx.pop(); }
    if(listenGame.timeLeft<=0) endListenGame();
  },1000);
}

function renderListenQuestion(){
  if(!listenGame||listenGame.ended)return;
  const w=listenGame.words[listenGame.idx % listenGame.words.length];
  const distractors=shuffle(listenGame.words.filter(x=>x.en!==w.en)).slice(0,3);
  const options=shuffle([w,...distractors]);
  listenGame.current=w;

  const showWord = listenGame.fallbackMode;

  $('#listenCard').innerHTML=`
    <div style="text-align:center;padding:6px 0 12px">
      ${showWord
        ? `<div class="syll-word" style="font-size:26px;line-height:1.45">${renderSyllablesHTML(w.en)}</div>
           ${w.ph?`<div class="phonetic-line" style="margin-top:6px">${renderPhonetic(w.ph)}</div>`:''}
           <div class="muted small" style="font-weight:700;margin-top:8px">选择正确的释义</div>`
        : `<button class="listen-loud" id="listenPlayBtn" title="点击重听">🔊</button>
           <div class="muted small" style="font-weight:800;margin-top:12px">点击喇叭听发音 · 选择正确释义</div>`}
    </div>
    <div class="options">
      ${options.map(o=>`<button class="option" data-en="${esc(o.en)}">${esc(o.zh)}</button>`).join('')}
    </div>`;

  const playBtn=$('#listenPlayBtn');
  if(playBtn){
    playBtn.onclick=(e)=>{
      e.stopPropagation();
      Sfx.pop();
      playBtn.classList.add('playing');
      Speaker.speak(w.en, 0.82);
      setTimeout(()=>playBtn.classList.remove('playing'), 1500);
    };
    setTimeout(()=>{
      if(!listenGame||listenGame.ended)return;
      if(!playBtn.classList.contains('playing')){
        playBtn.classList.add('playing');
        setTimeout(()=>playBtn.classList.remove('playing'), 1500);
      }
      Speaker.speak(w.en, 0.82);
    }, 250);
  }

  $('#listenCard').querySelectorAll('.option').forEach(btn=>{
    btn.onclick=()=>{
      if(!listenGame||listenGame.locked||listenGame.ended||listenGame.timeLeft<=0)return;
      listenGame.locked=true;
      const ok=btn.dataset.en===w.en;
      if(ok){
        listenGame.score+=10;listenGame.correct++;
        $('#listenScore').textContent=listenGame.score;
        Sfx.correct();
        btn.classList.add('correct');
        spawnStars(2,innerWidth/2,innerHeight*0.5,['⭐','✨']);
      }else{
        listenGame.score=Math.max(0,listenGame.score-3);listenGame.wrong++;
        $('#listenScore').textContent=listenGame.score;
        Sfx.wrong();
        btn.classList.add('wrong');
        $('#listenCard').querySelectorAll('.option').forEach(b=>{
          if(b.dataset.en===w.en) b.classList.add('correct');
        });
        setTimeout(()=>Speaker.speak(w.en,0.75), 400);
      }
      setTimeout(()=>{
        if(!listenGame||listenGame.ended)return;
        listenGame.locked=false;
        listenGame.idx++;
        if(listenGame.timeLeft>0) renderListenQuestion();
      }, ok?400:1200);
    };
  });
}

function endListenGame(){
  if(!listenGame||listenGame.ended)return;
  listenGame.ended=true;
  clearInterval(listenGame.timer);
  Speaker.stop();
  const score=listenGame.score;
  let coins=0,xp=0,msg='';
  if(score>=80){ coins=40;xp=25;msg='🎧 听力超强！'; }
  else if(score>=50){ coins=25;xp=15;msg='👍 听得很准！'; }
  else if(score>=20){ coins=10;xp=8;msg='💪 继续加油！'; }
  else{ coins=5;xp=5;msg='🌱 多练习会更好！'; }
  addCoins(coins);addXp(xp);trackGamePlayed('listen');save();
  Sfx.finish();celebrateBig();
  openModal(`
    <div style="text-align:center">
      <div style="font-size:60px">🎧</div>
      <div style="font-size:20px;font-weight:900;margin:10px 0">${msg}</div>
      <div style="font-size:36px;font-weight:900;color:var(--pink)">${score} 分</div>
      <div class="muted small" style="font-weight:700;margin-top:6px">
        答对 ${listenGame.correct} · 答错 ${listenGame.wrong}
      </div>
      <div style="color:var(--orange);font-weight:900;margin-top:10px">🎁 +${coins} 金币 · +${xp} 经验</div>
      <button class="btn primary" id="btnListenAgain" style="margin-top:20px">🔄 再来一局</button>
      <button class="btn ghost small" id="btnListenExit" style="margin-top:10px">返回游戏乐园</button>
    </div>`);
  $('#btnListenAgain').onclick=()=>{ Sfx.click();closeModal();startListenGame(); };
  $('#btnListenExit').onclick=()=>{ Sfx.click();closeModal();showGamesScreen(); };
}
$('#btnListenGameBack').onclick=()=>{
  // 1. 用 try-catch 包住音效，就算被拦截也不影响退出
  try {
    Sfx.click();
  } catch(e) {
    console.warn('音效被拦截，已忽略', e);
  }

  // 2. 清理游戏状态
  if(listenGame){
    clearInterval(listenGame.timer);
    listenGame.ended = true;
  }

  // 3. 停止发音，同样包一层保险
  try {
    Speaker.stop();
  } catch(e) {
    console.warn('停止发音失败，已忽略', e);
  }

  // 4. 跳回游戏乐园（你测试过没问题的那个函数）
  showGamesScreen();
};
window.startListenGame = startListenGame;