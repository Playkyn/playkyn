let sheepGame=null;

const SHEEP_DIFFICULTIES = {
  easy:   { name:'简单', pairs:8,  cols:4, rows:2, layers:2 },
  mid:    { name:'中等', pairs:12, cols:4, rows:3, layers:2 },
  hard:   { name:'困难', pairs:16, cols:4, rows:4, layers:2 },
  insane: { name:'极限', pairs:20, cols:4, rows:5, layers:2 }
};

function showSheepSetup(){
  const poolCount=getPoolWords().length;
  openModal(`
    <div class="modal-title">🧩 趣味消词 · 设置</div>
    <div class="field">
      <label style="font-size:13px">选择难度</label>
      <div id="sheepDiffRow" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <button class="btn ghost small" data-diff="easy" style="padding:10px 4px;font-size:13px">
          简单<span style="display:block;font-size:10px;opacity:.7;font-weight:700">8对 · 16张</span>
        </button>
        <button class="btn ghost small" data-diff="mid" style="padding:10px 4px;font-size:13px">
          中等<span style="display:block;font-size:10px;opacity:.7;font-weight:700">12对 · 24张</span>
        </button>
        <button class="btn ghost small" data-diff="hard" style="padding:10px 4px;font-size:13px">
          困难<span style="display:block;font-size:10px;opacity:.7;font-weight:700">16对 · 32张</span>
        </button>
        <button class="btn ghost small" data-diff="insane" style="padding:10px 4px;font-size:13px">
          极限<span style="display:block;font-size:10px;opacity:.7;font-weight:700">20对 · 40张</span>
        </button>
      </div>
    </div>
    <div class="field">
      <label style="font-size:13px">词汇范围</label>
      <div id="sheepScopeRow" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <button class="btn ghost small" data-scope="current" style="padding:10px 4px;font-size:13px">
          当前范围<span style="display:block;font-size:10px;opacity:.7;font-weight:700">${poolCount}词</span>
        </button>
        <button class="btn ghost small" data-scope="all" style="padding:10px 4px;font-size:13px">
          全部词库<span style="display:block;font-size:10px;opacity:.7;font-weight:700">${WORDS.length}词</span>
        </button>
      </div>
    </div>
    <button class="btn primary" id="btnSheepStart" style="margin-top:6px">开始挑战</button>
    <button class="btn ghost small" id="btnSheepCancel" style="margin-top:10px">取消</button>
  `);
  let diff='easy',scope='current';

  const setDiff=(d)=>{
    diff=d;
    document.querySelectorAll('#sheepDiffRow button').forEach(b=>{
      const on=b.dataset.diff===d;
      b.style.background=on?'linear-gradient(120deg,var(--pink),var(--orange))':'';
      b.style.color=on?'#fff':'';
      b.style.borderColor=on?'transparent':'';
    });
  };
  const setScope=(s)=>{
    scope=s;
    document.querySelectorAll('#sheepScopeRow button').forEach(b=>{
      const on=b.dataset.scope===s;
      b.style.background=on?'linear-gradient(120deg,var(--purple),var(--blue))':'';
      b.style.color=on?'#fff':'';
      b.style.borderColor=on?'transparent':'';
    });
  };
  document.querySelectorAll('#sheepDiffRow button').forEach(b=>{
    b.onclick=()=>{ Sfx.click(); setDiff(b.dataset.diff); };
  });
  document.querySelectorAll('#sheepScopeRow button').forEach(b=>{
    b.onclick=()=>{ Sfx.click(); setScope(b.dataset.scope); };
  });
  setDiff('easy');
  setScope('current');

  $('#btnSheepCancel').onclick=()=>{ Sfx.click(); closeModal(); };
  $('#btnSheepStart').onclick=()=>{
    Sfx.click();
    closeModal();
    startSheepGame(diff, scope);
  };
}

function startSheepGame(diff, scope){
  const cfg = SHEEP_DIFFICULTIES[diff] || SHEEP_DIFFICULTIES.easy;
  const pairCount = cfg.pairs;
  const words = getGameWords(pairCount, scope);

  const rawCards=[];
  words.forEach(w=>{
    rawCards.push({pairId:w.en,text:w.en,type:'en'});
    rawCards.push({pairId:w.en,text:w.zh,type:'zh'});
  });
  const shuffled=shuffle(rawCards);

  const totalPositions = cfg.cols * cfg.rows;
  const totalCards = pairCount * 2;
  const cardsPerPosition = Math.ceil(totalCards / totalPositions);

  const assignments=[];
  for(let i=0;i<totalPositions;i++){
    for(let l=0;l<cardsPerPosition;l++){
      if(assignments.length < totalCards){
        assignments.push({slotId:i, layer:l});
      }
    }
  }
  let extraLayer = cardsPerPosition;
  while(assignments.length < totalCards){
    for(let i=0;i<totalPositions && assignments.length<totalCards;i++){
      assignments.push({slotId:i, layer:extraLayer});
    }
    extraLayer++;
  }
  shuffle(assignments);

  const cards=shuffled.map((c,idx)=>({
    ...c,
    slotId:assignments[idx].slotId,
    layer:assignments[idx].layer,
    removed:false,
    inSlot:false
  }));

  const cardH=62, gap=8, padY=12, layerOff=8;
  const maxLayer = Math.max(...assignments.map(a=>a.layer));
  const boardH = padY + cfg.rows*(cardH+gap) + maxLayer*layerOff + 20;

  sheepGame={
    cfg, scope,
    cards,
    slots:[],
    maxSlots:7,
    totalPairs:pairCount,
    matchedPairs:0,
    locked:false,
    ended:false,
    boardH
  };

  $('#sheepDiffTxt').textContent = `${cfg.name} · ${scope==='all'?'全词库':'当前范围'}`;
  $('#sheepBoard').style.height = boardH + 'px';
  $('#sheepSlots').textContent = `0/${sheepGame.maxSlots}`;

  showScreen('s-game-sheep');
  renderSheepBoard();
  renderSheepSlots();
}

function isSheepCardBlocked(card){
  if(!sheepGame)return true;
  return sheepGame.cards.some(other=>{
    if(other===card)return false;
    if(other.removed||other.inSlot)return false;
    if(other.layer<=card.layer)return false;
    return other.slotId===card.slotId;
  });
}

function renderSheepBoard(){
  if(!sheepGame)return;
  const board=$('#sheepBoard');
  const cols=sheepGame.cfg.cols;
  const cardW=80,cardH=62,gap=8,padX=12,padY=12,layerOff=8;
  board.innerHTML='';

  sheepGame.cards.forEach((card,idx)=>{
    if(card.removed||card.inSlot)return;
    const col=card.slotId%cols;
    const row=Math.floor(card.slotId/cols);
    const baseX=padX+col*(cardW+gap);
    const baseY=padY+row*(cardH+gap+4);
    const offX=card.layer*layerOff;
    const offY=card.layer*layerOff;
    const blocked=isSheepCardBlocked(card);

    const el=document.createElement('div');
    el.className='sheep-card '+(card.type==='en'?'en-card':'zh-card')+(blocked?' blocked':'');
    el.style.left=(baseX+offX)+'px';
    el.style.top=(baseY+offY)+'px';
    el.style.zIndex=String(10+card.layer*10+idx);
    if(card.type==='en'){
      el.innerHTML=renderSyllablesHTML(card.text);
    } else {
      el.textContent=card.text;
    }
    if(!blocked){
      el.onclick=()=>{ onSheepCardClick(card); };
    }
    board.appendChild(el);
  });

  const remaining=sheepGame.cards.filter(c=>!c.removed&&!c.inSlot).length;
  $('#sheepLeft').textContent=remaining;
  $('#sheepSlots').textContent=sheepGame.slots.length+'/'+sheepGame.maxSlots;
}

function renderSheepSlots(){
  if(!sheepGame)return;
  const row=$('#sheepSlotRow');
  let html='';
  for(let i=0;i<sheepGame.maxSlots;i++){
    const card=sheepGame.slots[i];
    if(card){
      const inner = card.type==='en' ? renderSyllablesHTML(card.text) : esc(card.text);
      html+=`<div class="sheep-slot filled ${card.type==='en'?'en-card':'zh-card'}">${inner}</div>`;
    }else{
      html+=`<div class="sheep-slot"></div>`;
    }
  }
  row.innerHTML=html;
}

function onSheepCardClick(card){
  if(!sheepGame||sheepGame.locked||sheepGame.ended)return;
  if(card.removed||card.inSlot)return;
  if(sheepGame.slots.length>=sheepGame.maxSlots)return;
  if(isSheepCardBlocked(card))return;

  Sfx.click();
  card.inSlot=true;
  sheepGame.slots.push(card);
  renderSheepBoard();
  renderSheepSlots();

  const pairIdx=findSheepPair();
  if(pairIdx!==null){
    sheepGame.locked=true;
    setTimeout(()=>{
      if(!sheepGame||sheepGame.ended)return;
      let [i,j]=pairIdx;
      const c1=sheepGame.slots[i],c2=sheepGame.slots[j];
      c1.removed=true;c1.inSlot=false;
      c2.removed=true;c2.inSlot=false;
      const maxI=Math.max(i,j),minI=Math.min(i,j);
      sheepGame.slots.splice(maxI,1);
      sheepGame.slots.splice(minI,1);
      sheepGame.matchedPairs++;
      Sfx.correct();
      spawnStars(3,innerWidth/2,innerHeight*0.5,['✨','⭐','💫']);
      renderSheepBoard();
      renderSheepSlots();
      sheepGame.locked=false;

      if(sheepGame.matchedPairs>=sheepGame.totalPairs){
        endSheepGame(true);
      }else if(sheepGame.slots.length>=sheepGame.maxSlots && findSheepPair()===null){
        setTimeout(()=>endSheepGame(false),500);
      }
    },340);
  }else{
    if(sheepGame.slots.length>=sheepGame.maxSlots){
      setTimeout(()=>{
        if(!sheepGame||sheepGame.ended)return;
        if(findSheepPair()===null) endSheepGame(false);
      },400);
    }
  }
}

function findSheepPair(){
  if(!sheepGame)return null;
  const slots=sheepGame.slots;
  for(let i=0;i<slots.length;i++){
    for(let j=i+1;j<slots.length;j++){
      if(slots[i].pairId===slots[j].pairId && slots[i].type!==slots[j].type){
        return [i,j];
      }
    }
  }
  return null;
}

function endSheepGame(win){
  if(!sheepGame||sheepGame.ended)return;
  sheepGame.ended=true;
  const diff=sheepGame.cfg.name;
  let coins=0,xp=0;
  if(win){
    const mult = sheepGame.cfg.pairs/8;
    coins=Math.round(50*mult);
    xp=Math.round(30*mult);
    if(sheepGame.scope==='all'){ coins=Math.round(coins*1.3); xp=Math.round(xp*1.3); }
    Sfx.finish();celebrateBig();
  }else{
    coins=5;xp=5;Sfx.wrong();
  }
  addCoins(coins);addXp(xp);
 trackGamePlayed('sheep');
  save();
  openModal(`
    <div style="text-align:center">
      <div style="font-size:60px">${win?'🎉':'😢'}</div>
      <div style="font-size:20px;font-weight:900;margin:10px 0">
        ${win?'太厉害了！全部消除！':'槽位满了...'}
      </div>
      <div class="muted small" style="font-weight:700">难度 ${diff} · ${sheepGame.scope==='all'?'全词库':'当前范围'}</div>
      ${win
        ? `<div style="color:var(--orange);font-weight:900;margin-top:8px">🎁 +${coins} 金币 · +${xp} 经验</div>`
        : `<div style="color:var(--muted);font-weight:900;margin-top:8px">已配对 ${sheepGame.matchedPairs}/${sheepGame.totalPairs}</div>
           <div style="color:var(--orange);font-weight:900;margin-top:4px">🎁 +${coins} 金币 · +${xp} 经验</div>`}
      <button class="btn primary" id="btnSheepAgain" style="margin-top:20px">🔄 再来一局</button>
      <button class="btn ghost small" id="btnSheepChange" style="margin-top:10px">⚙️ 调整难度</button>
      <button class="btn ghost small" id="btnSheepExit" style="margin-top:10px">返回游戏乐园</button>
    </div>`);
  $('#btnSheepAgain').onclick=()=>{
    Sfx.click();closeModal();
    const d=sheepGame.cfg.name;
    let key='easy';
    Object.keys(SHEEP_DIFFICULTIES).forEach(k=>{ if(SHEEP_DIFFICULTIES[k].name===d) key=k; });
    const sc=sheepGame.scope;
    sheepGame=null;
    startSheepGame(key, sc);
  };
  $('#btnSheepChange').onclick=()=>{ Sfx.click();closeModal();sheepGame=null;showSheepSetup(); };
  $('#btnSheepExit').onclick=()=>{ Sfx.click();closeModal();sheepGame=null;showGamesScreen(); };
}

$('#btnSheepBack').onclick=()=>{
  if(!confirm('确定要退出本局游戏吗？'))return;
  Sfx.click();
  sheepGame=null;showGamesScreen();
};
window.showSheepSetup = showSheepSetup;
