const MC_DIFFICULTY = {
  easy: { name:'简单', icon:'🌱', time:75, blocksPerDepth:5,  oreBonus:0.8,
          desc:'75秒 · 每层5块 · 轻松下探', color:'#4ade80' },
  mid:  { name:'中等', icon:'🔥', time:75, blocksPerDepth:6,  oreBonus:1.0,
          desc:'75秒 · 每层6块 · 标准挑战', color:'#f59e0b' },
  hard: { name:'困难', icon:'💎', time:75, blocksPerDepth:8,  oreBonus:1.3,
          desc:'75秒 · 每层8块 · 稀有矿物加成', color:'#ff6b9d' }
};


let mcGame=null;

const MC_ORES = [
  {id:'coal',    icon:'🪨', name:'煤',   color:'#5a5a5a', minDepth:1, baseWeight:60, value:1},
  {id:'copper',  icon:'🟠', name:'铜',   color:'#c07a3e', minDepth:1, baseWeight:25, value:2},
  {id:'iron',    icon:'⚙️', name:'铁',   color:'#8a8fa0', minDepth:1, baseWeight:15, value:3},
  {id:'gold',    icon:'🟡', name:'金',   color:'#f0b429', minDepth:2, baseWeight:12, value:5},
  {id:'diamond', icon:'💎', name:'钻石', color:'#3ec6d4', minDepth:3, baseWeight:7,  value:10},
  {id:'emerald', icon:'💚', name:'绿宝石',color:'#2ecc71', minDepth:4, baseWeight:4,  value:20}
];


const MC_BLOCK_TYPES = [
  {type:'grass',    minDepth:1, maxDepth:1, weight:4},
  {type:'dirt',     minDepth:1, maxDepth:1, weight:4},
  {type:'stone',    minDepth:1, maxDepth:5, weight:3},
  {type:'wood',     minDepth:1, maxDepth:2, weight:2},
  {type:'iron',     minDepth:2, maxDepth:5, weight:3},
  {type:'copper',   minDepth:2, maxDepth:5, weight:3},
  {type:'gold',     minDepth:3, maxDepth:5, weight:2},
  {type:'diamond',  minDepth:3, maxDepth:5, weight:2},
  {type:'emerald',  minDepth:4, maxDepth:5, weight:1},
  {type:'obsidian', minDepth:3, maxDepth:5, weight:2},
  {type:'lava',     minDepth:4, maxDepth:5, weight:2}
];

function rollBlockType(depth){
  const pool=MC_BLOCK_TYPES.filter(t=>depth>=t.minDepth && depth<=t.maxDepth);
  const weights=pool.map(t=>t.weight);
  const total=weights.reduce((a,b)=>a+b,0);
  let r=Math.random()*total;
  for(let i=0;i<pool.length;i++){
    r-=weights[i];
    if(r<=0) return pool[i].type;
  }
  return 'stone';
}

function rollOre(depth){
  const weights=MC_ORES.map(o=>{
    if(depth < o.minDepth) return 0;
    const depthBonus = Math.max(0, depth - o.minDepth);
    return o.baseWeight * (1 + depthBonus*0.7);
  });
  const total=weights.reduce((a,b)=>a+b,0);
  if(total<=0) return MC_ORES[0];
  let r=Math.random()*total;
  for(let i=0;i<MC_ORES.length;i++){
    r-=weights[i];
    if(r<=0) return MC_ORES[i];
  }
  return MC_ORES[0];
}

function randomMcType(depth){ return rollBlockType(depth); }

/* —— 单词矿工 · 难度选择 —— */
function showMcDifficulty(){
  openModal(`
    <div class="modal-title">⛏️ 单词矿工 · 选择难度</div>
    <div class="tip" style="background:rgba(167,139,250,.12);border-color:rgba(167,139,250,.3);text-align:center">
      🎯 难度越高，挖矿时间越短，但稀有矿物价值也越高！
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">
      ${Object.entries(MC_DIFFICULTY).map(([key,cfg])=>`
        <button class="btn ghost" data-mcdiff="${key}" style="padding:16px;text-align:left;
          border-color:${cfg.color};color:${cfg.color};background:${cfg.color}11">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:28px">${cfg.icon}</span>
            <div style="flex:1">
              <div style="font-size:16px;font-weight:900">${cfg.name}</div>
              <div style="font-size:11px;opacity:.7;font-weight:700;margin-top:2px">${cfg.desc}</div>
            </div>
            <span style="font-size:20px;opacity:.5">›</span>
          </div>
        </button>
      `).join('')}
    </div>
    <button class="btn ghost small" id="btnMcDiffCancel" style="margin-top:14px">取消</button>
  `);
  document.querySelectorAll('[data-mcdiff]').forEach(btn=>{
    btn.onclick = ()=>{
      Sfx.click();
      const diff = btn.dataset.mcdiff;
      closeModal();
      startMinecraftGame(diff);
    };
  });
  $('#btnMcDiffCancel').onclick = ()=>{ Sfx.click(); closeModal(); };
}

function startMinecraftGame(diff){
  diff = diff || 'mid';                          // 默认中等
  const diffCfg = MC_DIFFICULTY[diff] || MC_DIFFICULTY.mid;

  if(mcGame){ clearInterval(mcGame.timer); }
  const boardSize=16;
  const pool=shuffle(WORDS.filter(w=>w.en.length<=15 && w.zh.length<=12));
  const picked=[];
  const used=new Set();
  for(const w of pool){
    if(used.has(w.en)) continue;
    used.add(w.en); picked.push(w);
    if(picked.length>=boardSize) break;
  }
  if(picked.length<boardSize){
    for(const w of WORDS){
      if(used.has(w.en)) continue;
      used.add(w.en); picked.push(w);
      if(picked.length>=boardSize) break;
    }
  }
  const depth=1;
  const blocks=[];
  for(let i=0;i<boardSize;i++){
    blocks.push({word:picked[i],type:randomMcType(depth),alive:true});
  }
  const inventory={};
  MC_ORES.forEach(o=>inventory[o.id]=0);

  mcGame={
    blocks,score:0,correct:0,wrong:0,
    timeLeft:diffCfg.time,timer:null,locked:false,ended:false,
    currentIdx:null,newDropIdx:-1,
    depth:1,
    digProgress:0,
    blocksPerDepth:diffCfg.blocksPerDepth,
    diff:diff,
    diffCfg:diffCfg,
    inventory,
    lootThisGame:{}
  };
  pickMcTarget(true);
  showScreen('s-game-minecraft');
  $('#mcScore').textContent='0';
  $('#mcTimer').textContent=String(diffCfg.time);
  $('#mcDepthTag').textContent=`第 1 层 · ${diffCfg.icon}${diffCfg.name}`;
  $('#mcBoard').className='mc-board depth-1';
  renderMcInventory();
  renderMcBoard();
  renderMcOptions();

  mcGame.timer=setInterval(()=>{
    if(!mcGame||mcGame.ended) return;
    mcGame.timeLeft--;
    $('#mcTimer').textContent=Math.max(0,mcGame.timeLeft);
    if(mcGame.timeLeft<=5 && mcGame.timeLeft>0) Sfx.pop();
    if(mcGame.timeLeft<=0) endMinecraftGame();
  },1000);
}


function pickMcTarget(initial){
  if(!mcGame) return;
  const alive=mcGame.blocks.map((b,i)=>({b,i})).filter(x=>x.b.alive);
  if(!alive.length) return;
  let candidates=alive;
  if(!initial && alive.length>1 && mcGame.currentIdx!==null){
    candidates=alive.filter(x=>x.i!==mcGame.currentIdx);
  }
  const pick=candidates[Math.floor(Math.random()*candidates.length)];
  mcGame.currentIdx=pick.i;
}

function nextMcWord(){
  if(!mcGame) return null;
  const onBoard=new Set(mcGame.blocks.filter(b=>b.alive).map(b=>b.word.en));
  const pool=WORDS.filter(w=>w.en.length<=15 && w.zh.length<=12 && !onBoard.has(w.en));
  if(!pool.length) return WORDS[Math.floor(Math.random()*WORDS.length)];
  return pool[Math.floor(Math.random()*pool.length)];
}

function renderMcInventory(){
  if(!mcGame) return;
  const inv=mcGame.inventory;
  const el=$('#mcInventory');
  el.innerHTML=MC_ORES.map(o=>{
    const count=inv[o.id]||0;
    return `<div class="mc-inv-item${count===0?' empty':''}" data-ore="${o.id}">
      <span class="ic">${o.icon}</span>
      <span class="ct">${count}</span>
    </div>`;
  }).join('');
}

function flashInventory(oreId){
  const el=document.querySelector(`.mc-inv-item[data-ore="${oreId}"]`);
  if(!el) return;
  el.classList.remove('just-got');
  void el.offsetWidth;
  el.classList.add('just-got');
}

function renderMcBoard(){
  if(!mcGame) return;
  const board=$('#mcBoard');
  board.className='mc-board depth-'+Math.min(5,mcGame.depth);
  board.innerHTML=mcGame.blocks.map((b,i)=>{
    if(!b.alive){
      return `<div class="mc-block empty" data-i="${i}"></div>`;
    }
    const isTarget=i===mcGame.currentIdx;
    const isNew=i===mcGame.newDropIdx;
    return `<div class="mc-block ${b.type}${isTarget?' target':''}${isNew?' new-drop':''}" data-i="${i}">
      <span class="mc-word">${esc(b.word.en)}</span>
    </div>`;
  }).join('');
  mcGame.newDropIdx=-1;
}

function renderMcOptions(){
  if(!mcGame) return;
  const target=mcGame.blocks[mcGame.currentIdx];
  if(!target||!target.alive) return;
  const w=target.word;

  const pool=WORDS.filter(x=>x.en!==w.en);
  const same=shuffle(pool.filter(x=>x.g===w.g));
  const others=shuffle(pool.filter(x=>x.g!==w.g));
  const dists=[];
  for(const c of same){ if(dists.length>=3) break; dists.push(c); }
  for(const c of others){ if(dists.length>=3) break; dists.push(c); }
  const opts=shuffle([w,...dists.slice(0,3)]);

  const el=$('#mcQuestion');
  el.innerHTML=`
    <div class="mc-target-panel">
      <div>
        <div class="mc-target-label">⛏️ 挖掘目标 · 第 ${mcGame.depth} 层</div>
        <div style="font-size:12px;font-weight:700;color:var(--muted);margin-top:2px">
          本层进度 ${mcGame.digProgress}/${mcGame.blocksPerDepth}
        </div>
      </div>
      <div class="mc-target-word">
        <span class="syll-word" style="font-size:20px;line-height:1.45">${renderSyllablesHTML(w.en)}</span>
        ${w.ph?`<div class="phonetic-line" style="font-size:14px;margin-top:2px">${renderPhonetic(w.ph)}</div>`:''}
        <small>答对挖掉它并采集矿物</small>
      </div>
    </div>
    <div class="options">
      ${opts.map(o=>`<button class="option mc-option" data-en="${esc(o.en)}">${esc(o.zh)}</button>`).join('')}
    </div>`;

  el.querySelectorAll('.mc-option').forEach(btn=>{
    btn.onclick=()=>{
      if(!mcGame||mcGame.locked||mcGame.ended||mcGame.timeLeft<=0) return;
      mcGame.locked=true;
      const ok=btn.dataset.en===w.en;

      if(ok){
        mcGame.score+=10;
        mcGame.correct++;
        $('#mcScore').textContent=mcGame.score;
        Sfx.correct();
        btn.classList.add('correct');
        spawnStars(2,innerWidth/2,innerHeight*0.5,['⛏️','✨']);

      const ore=rollOre(mcGame.depth);
if(ore.id === 'diamond') unlockAch('diamond_digger');   // ← 新增
mcGame.inventory[ore.id]=(mcGame.inventory[ore.id]||0)+1;
        mcGame.lootThisGame[ore.id]=(mcGame.lootThisGame[ore.id]||0)+1;

        const blockEl=document.querySelector(`.mc-block[data-i="${mcGame.currentIdx}"]`);
        if(blockEl){
          const rect=blockEl.getBoundingClientRect();
          const invEl=document.querySelector(`.mc-inv-item[data-ore="${ore.id}"]`);
          let dx=0,dy=0;
          if(invEl){
            const invRect=invEl.getBoundingClientRect();
            dx=invRect.left+invRect.width/2 - (rect.left+rect.width/2);
            dy=invRect.top+invRect.height/2 - (rect.top+rect.height/2);
          }
          const flyEl=document.createElement('div');
          flyEl.className='mc-ore-fly';
          flyEl.textContent=ore.icon;
          flyEl.style.left=(rect.left+rect.width/2-16)+'px';
          flyEl.style.top=(rect.top+rect.height/2-16)+'px';
          flyEl.style.setProperty('--dx',dx+'px');
          flyEl.style.setProperty('--dy',dy+'px');
          document.body.appendChild(flyEl);
          setTimeout(()=>flyEl.remove(),1000);
        }
        setTimeout(()=>{
          if(!mcGame) return;
          renderMcInventory();
          flashInventory(ore.id);
          const oreName = document.createElement('div');
          oreName.className='float-star';
          oreName.textContent=`+1 ${ore.icon}${ore.name}`;
          oreName.style.left=(innerWidth/2-30)+'px';
          oreName.style.top=(innerHeight*0.45)+'px';
          oreName.style.fontSize='20px';
          oreName.style.color=ore.color;
          oreName.style.textShadow='0 2px 8px rgba(0,0,0,.3)';
          document.body.appendChild(oreName);
          setTimeout(()=>oreName.remove(),1200);
        }, 500);

        const oldIdx=mcGame.currentIdx;
        const blockEl2=document.querySelector(`.mc-block[data-i="${oldIdx}"]`);
        if(blockEl2){
          blockEl2.classList.remove('target');
          blockEl2.classList.add('breaking');
        }

        setTimeout(()=>{
          if(!mcGame||mcGame.ended) return;
          mcGame.digProgress++;
          if(mcGame.digProgress >= mcGame.blocksPerDepth){
            mcGame.depth++;
            mcGame.digProgress=0;
            showDepthUpToast(mcGame.depth);
            mcGame.blocks.forEach(b=>{
              if(b.alive) b.type=randomMcType(mcGame.depth);
            });
          }
          mcGame.blocks[oldIdx].word=nextMcWord();
          mcGame.blocks[oldIdx].type=randomMcType(mcGame.depth);
          mcGame.blocks[oldIdx].alive=true;
          mcGame.newDropIdx=oldIdx;
          pickMcTarget();
          mcGame.locked=false;
          $('#mcDepthTag').textContent=`第 ${mcGame.depth} 层`;
          renderMcBoard();
          renderMcOptions();
        },280);
      } else {
        mcGame.score=Math.max(0,mcGame.score-3);
        mcGame.wrong++;
        $('#mcScore').textContent=mcGame.score;
        Sfx.wrong();
        btn.classList.add('wrong');
        el.querySelectorAll('.mc-option').forEach(b=>{
          if(b.dataset.en===w.en) b.classList.add('correct');
        });
        setTimeout(()=>{
          if(!mcGame||mcGame.ended) return;
          mcGame.locked=false;
          renderMcOptions();
        },1200);
      }
    };
  });
}

function showDepthUpToast(depth){
  const existing=document.querySelector('.mc-depth-toast');
  if(existing) existing.remove();
  const toast=document.createElement('div');
  toast.className='mc-depth-toast';
  const depthNames=['','地表','浅层矿洞','深层矿洞','熔岩层','虚空暗层'];
  const name=depthNames[Math.min(depth,5)] || '深层矿洞';
  toast.innerHTML=`⛏️ 深入第 ${depth} 层<div class="sub">${name} · 稀有矿物概率提升！</div>`;
  document.body.appendChild(toast);
  Sfx.levelup();
  spawnStars(6,innerWidth/2,innerHeight/2,['💎','✨','⭐','💫']);
  setTimeout(()=>toast.classList.add('show'),30);
  setTimeout(()=>{
    toast.classList.remove('show');
    setTimeout(()=>toast.remove(),500);
  },1600);
}

function endMinecraftGame(){
  if(!mcGame||mcGame.ended) return;
  mcGame.ended=true;
  clearInterval(mcGame.timer);
  const score=mcGame.score;

  let oreValue=0;
  const lootList=Object.entries(mcGame.lootThisGame).filter(([id,c])=>c>0);
  const oreBonus = mcGame.diffCfg ? mcGame.diffCfg.oreBonus : 1.0;
  lootList.forEach(([id,count])=>{
    const ore=MC_ORES.find(o=>o.id===id);
    if(ore) oreValue += Math.round(ore.value * count * oreBonus);
  });

  let baseCoins = 0;
  let msg = '';
  if(score>=100){ baseCoins=50; msg='⛏️ 钻石矿工！'; }
  else if(score>=60){ baseCoins=30; msg='💎 优秀矿工！'; }
  else if(score>=30){ baseCoins=15; msg='🪨 熟练矿工！'; }
  else { baseCoins=5; msg='🌱 新手矿工！'; }

  const totalCoins = baseCoins + oreValue;
  const totalXp = Math.round(baseCoins*0.6) + Math.round(oreValue*0.5);


  addCoins(totalCoins);addXp(totalXp);
 trackGamePlayed('minecraft');
 save();
  Sfx.finish();celebrateBig();

  let lootHtml='';
  if(lootList.length){
    lootHtml = `<div class="mc-loot-box">
      ${lootList.map(([id,count])=>{
        const ore=MC_ORES.find(o=>o.id===id);
        return `<div class="mc-loot-item">
          <div class="ic">${ore.icon}</div>
          <div class="nm">${ore.name}</div>
          <div class="ct">×${count}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="muted small" style="text-align:center;margin-top:10px;font-weight:800">
      💎 矿物总价值：${oreValue}
    </div>`;
  } else {
    lootHtml = `<div class="muted small" style="text-align:center;margin-top:14px;font-weight:700">本次没有挖到矿物</div>`;
  }

  openModal(`
    <div style="text-align:center">
      <div style="font-size:60px">⛏️</div>
      <div style="font-size:20px;font-weight:900;margin:10px 0">${msg}</div>
      <div style="font-size:32px;font-weight:900;color:var(--pink)">${score} 分</div>
     <div class="muted small" style="font-weight:800;margin-bottom:6px">
        ${mcGame.diffCfg.icon} ${mcGame.diffCfg.name}难度 · ${mcGame.diffCfg.desc}
      </div>
      <div class="muted small" style="font-weight:700;margin-top:4px">
        到达第 ${mcGame.depth} 层 · 答对 ${mcGame.correct} · 答错 ${mcGame.wrong}
      </div>
      ${lootHtml}
      <div style="color:var(--orange);font-weight:900;margin-top:12px">🎁 +${totalCoins} 金币 · +${totalXp} 经验</div>
      <button class="btn primary" id="btnMcAgain" style="margin-top:20px">🔄 再来一局（同难度）</button>
      <button class="btn ghost small" id="btnMcChangeDiff" style="margin-top:10px">🎚️ 换个难度</button>
      <button class="btn ghost small" id="btnMcExit" style="margin-top:10px">返回游戏乐园</button>
    </div>`);
   $('#btnMcAgain').onclick=()=>{ Sfx.click();closeModal();startMinecraftGame(mcGame.diff); };
  $('#btnMcChangeDiff').onclick=()=>{ Sfx.click();closeModal();showMcDifficulty(); };
  $('#btnMcExit').onclick=()=>{ Sfx.click();closeModal();showGamesScreen(); };
}

$('#btnMcBack').onclick=()=>{
  if(!confirm('确定要退出本局游戏吗？'))return;
  Sfx.click();
  if(mcGame){ clearInterval(mcGame.timer);mcGame.ended=true; }
  showGamesScreen();
};
window.showMcDifficulty = showMcDifficulty;