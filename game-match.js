let matchGame=null;

function startMatchGame(){
  if(matchGame){ clearInterval(matchGame.timer); }
  const pairCount=6;
  const words=getGameWords(pairCount);
  const leftCards=words.map(w=>({id:w.en,text:w.en,matched:false}));
  const rightCards=words.map(w=>({id:w.en,text:w.zh,matched:false}));
  const left=shuffle([...leftCards]);
  const right=shuffle([...rightCards]);
  matchGame={
    left,right,selectedLeft:null,selectedRight:null,
    matchedCount:0,total:pairCount,
    startTime:Date.now(),timer:null,locked:false
  };
  showScreen('s-game-match');
  $('#matchTime').textContent='0';
  $('#matchProgress').textContent=`0 / ${pairCount}`;
  renderMatchGrid();

  matchGame.timer=setInterval(()=>{
    if(!matchGame)return;
    $('#matchTime').textContent=Math.floor((Date.now()-matchGame.startTime)/1000);
  },1000);
}

function renderMatchGrid(){
  if(!matchGame)return;
  const grid=$('#matchGrid');
  const leftHtml=matchGame.left.map((c,i)=>`
    <div class="match-cell${c.matched?' matched':''}${matchGame.selectedLeft===i?' selected':''}"
         data-side="left" data-i="${i}">${renderSyllablesHTML(c.text)}</div>`).join('');
  const rightHtml=matchGame.right.map((c,i)=>`
    <div class="match-cell${c.matched?' matched':''}${matchGame.selectedRight===i?' selected':''}"
         data-side="right" data-i="${i}">${esc(c.text)}</div>`).join('');
  grid.innerHTML=`<div class="match-col">${leftHtml}</div><div class="match-col">${rightHtml}</div>`;

  grid.querySelectorAll('.match-cell').forEach(el=>{
    el.onclick=()=>onMatchCellClick(el.dataset.side,parseInt(el.dataset.i,10));
  });
}

function onMatchCellClick(side,idx){
  if(!matchGame||matchGame.locked)return;
  if(side==='left'){
    if(matchGame.left[idx].matched)return;
    if(matchGame.selectedLeft===idx) matchGame.selectedLeft=null;
    else matchGame.selectedLeft=idx;
  }else{
    if(matchGame.right[idx].matched)return;
    if(matchGame.selectedRight===idx) matchGame.selectedRight=null;
    else matchGame.selectedRight=idx;
  }
  Sfx.click();
  renderMatchGrid();

  if(matchGame.selectedLeft!==null && matchGame.selectedRight!==null){
    const l=matchGame.left[matchGame.selectedLeft];
    const r=matchGame.right[matchGame.selectedRight];
    if(l.id===r.id){
      matchGame.locked=true;
      const li=matchGame.selectedLeft,ri=matchGame.selectedRight;
      setTimeout(()=>{
        if(!matchGame)return;
        matchGame.left[li].matched=true;
        matchGame.right[ri].matched=true;
        matchGame.matchedCount++;
        matchGame.selectedLeft=null;
        matchGame.selectedRight=null;
        matchGame.locked=false;
        Sfx.correct();
        spawnStars(3,innerWidth/2,innerHeight*0.4,['✨','⭐','💫']);
        renderMatchGrid();
        $('#matchProgress').textContent=`${matchGame.matchedCount} / ${matchGame.total}`;
        if(matchGame.matchedCount>=matchGame.total) endMatchGame();
      },260);
    }else{
      matchGame.locked=true;
      setTimeout(()=>{
        if(!matchGame)return;
        matchGame.selectedLeft=null;
        matchGame.selectedRight=null;
        matchGame.locked=false;
        Sfx.wrong();
        renderMatchGrid();
      },480);
    }
  }
}

function endMatchGame(){
  if(!matchGame)return;
  clearInterval(matchGame.timer);
  const elapsed=Math.floor((Date.now()-matchGame.startTime)/1000);
  let coins=10,xp=10;
  if(elapsed<=30){ coins=30;xp=20; }
  else if(elapsed<=60){ coins=20;xp=15; }
  addCoins(coins);addXp(xp);
 trackGamePlayed('match');
  save();
  Sfx.finish();celebrateBig();
  openModal(`
    <div style="text-align:center">
      <div style="font-size:60px">🎉</div>
      <div style="font-size:20px;font-weight:900;margin:10px 0">全部配对成功！</div>
      <div style="font-size:28px;font-weight:900;color:var(--pink)">${elapsed} 秒</div>
      <div style="color:var(--orange);font-weight:900;margin-top:8px">🎁 +${coins} 金币 · +${xp} 经验</div>
      <button class="btn primary" id="btnMatchAgain" style="margin-top:20px">🔄 再来一局</button>
      <button class="btn ghost small" id="btnMatchExit" style="margin-top:10px">返回游戏乐园</button>
    </div>`);
  $('#btnMatchAgain').onclick=()=>{ Sfx.click();closeModal();matchGame=null;startMatchGame(); };
  $('#btnMatchExit').onclick=()=>{ Sfx.click();closeModal();matchGame=null;showGamesScreen(); };
}
$('#btnMatchBack').onclick=()=>{
  if(!confirm('确定要退出本局游戏吗？'))return;
  Sfx.click();
  if(matchGame){ clearInterval(matchGame.timer);matchGame=null; }
  showGamesScreen();
};
window.startMatchGame = startMatchGame;