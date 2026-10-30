/* ═══════════════════════════════════════════════════════════
   游戏 6 · 场景故事（纯数据库驱动版）
   ═══════════════════════════════════════════════════════════ */
let scenarioState = null;

function startScenarioGame(){
  scenarioState = { view:'list' };
  showScreen('s-game-scenario');
  renderScenario();
}

function renderSentence(text){
  return esc(text).replace(/\[([^\]]+)\]|([a-zA-Z][a-zA-Z'-]*)/g, (match, keyWord, normalWord) => {
    if (keyWord) {
      return `<span class="key-word clickable-word" data-word="${keyWord}">${keyWord}</span>`;
    } else {
      return `<span class="normal-word clickable-word" data-word="${normalWord}">${normalWord}</span>`;
    }
  });
}

function sentencePlain(text){
  return text.replace(/\[([^\]]+)\]/g, '$1');
}

// ★ 注意这里变成了 async
async function renderScenario(){
  const el = $('#scenarioContent');
  if(!scenarioState) return;

  // ================= 列表页 =================
  if(scenarioState.view === 'list'){
    el.innerHTML = `<div class="tip" style="text-align:center;padding:20px;">⏳ 正在从云端加载故事库...</div>`;
    
      const pool = getPoolWords();
    
    // 把当前用户词库里的单词全部转成小写，方便比对
    const userWordsSet = new Set(pool.map(w => w.en.toLowerCase()));

    // 从 Supabase 拉取所有故事
    const { data: dbScenarios, error } = await sb.from('scenarios').select('*');
    
    if(error){
      el.innerHTML = `<div class="tip">加载失败，请检查网络或数据库权限。</div>`;
      console.error('加载故事失败', error);
      return;
    }

    // 🌟 核心改变：计算每个故事包含了多少个用户学过的词
    let list = dbScenarios.map(s => {
      let matchCount = 0;
      if (s.sentences && Array.isArray(s.sentences)) {
        s.sentences.forEach(item => {
          // 如果故事里的单词在用户词库里，重合度 +1
          if (item.w && userWordsSet.has(item.w.toLowerCase())) {
            matchCount++;
          }
        });
      }
      return { ...s, matchCount };
    })
    .filter(s => s.matchCount > 0) // 👈 只要包含至少 1 个学过的词，就留下
    .sort((a, b) => b.matchCount - a.matchCount); // 👈 按包含的单词数量从多到少排序

    if(!list.length){
      el.innerHTML = `<div class="tip">当前词库里没有匹配到故事里的单词，建议先去「开始学习」背几个词，或者去「📚 主题」里多选几个分类～</div>
        <button class="btn ghost small" id="btnScenarioEmptyBack">← 返回游戏乐园</button>`;
      $('#btnScenarioEmptyBack').onclick=()=>{ Sfx.click(); showGamesScreen(); };
      return;
    }

    el.innerHTML = `
      <div class="tip">📖 每个主题都有一个专属场景。<b>先看单词例句（词→句）</b>，<b>再读完整故事（连句成文）</b>，最后做填空挑战。<br>💡 单词按<span style="color:#7c3aed;font-weight:900">音节分色</span>，点击任意单词可听发音。</div>
      <div class="scenario-grid">
        ${list.map(s=>`
          <div class="scenario-card" data-id="${s.id}">
            <div class="scenario-icon">${s.icon || '📖'}</div>
            <div class="scenario-info">
              <div class="scenario-unit">${esc(s.unit)}</div>
              <div class="scenario-name">${esc(s.name)}</div>
              <div class="scenario-desc">${esc(s.description || '')}</div>
              <div class="scenario-count" style="background:${s.color || '#ff6b9d'}22;color:${s.color || '#ff6b9d'}">
                ${s.sentences.length} 个词 · ${s.story.length} 句故事 · ${s.quizzes.length} 道填空
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    el.querySelectorAll('.scenario-card').forEach(card=>{
      card.onclick = ()=>{
        Sfx.click();
        const s = list.find(x=>x.id===card.dataset.id); // ★ 这里改用 id 查找
        scenarioState = { view:'study', scenario:s, quizIdx:0, correct:0, locked:false };
        renderScenario();
      };
    });
    return;
  }

  // ================= 学习/故事页 =================
  if(scenarioState.view === 'study'){
    const s = scenarioState.scenario;

    const sentHtml = s.sentences.map(item=>{
      const wd = getWord(item.w);
      const zh = wd ? wd.zh : (item.zh || ''); // 优先用本地词库，没找到用 AI 生成的
      const ph = wd ? (wd.ph || '') : '';
      return `
        <div class="word-sent">
          <div class="ws-head">
            <span class="ws-word syll-word">${renderSyllablesHTML(item.w)}</span>
            <span class="ws-zh-mini">${esc(zh)}</span>
            <button class="ws-speak" data-text="${esc(item.w)}" title="朗读单词">🔊</button>
          </div>
          ${ph ? `<div class="ws-phonetic-mini">${renderPhonetic(ph)}</div>` : ''}
          <div class="ws-en">
            ${renderSentence(item.en)}
          </div>
          <div class="ws-zh">${esc(item.zh)}</div>
        </div>
      `;
    }).join('');

    const storyHtml = s.story.map((line, i)=>`
      <div class="story-line">
        <div class="line-num">${i+1}</div>
        <div class="line-text">${renderSentence(line)}</div>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="story-card">
        <div class="story-title">
          <div class="st-icon">${s.icon || '📖'}</div>
          <div class="st-info">
            <div class="st-name">${esc(s.unit)} · ${esc(s.name)}</div>
            <div class="st-desc">${esc(s.description || '')}</div>
          </div>
        </div>

        <div class="section-label">🔤 词 → 句 · 每个单词的场景例句</div>
        <div class="word-sent-list">${sentHtml}</div>

        <div class="section-label">📖 连句成文 · 串起全部单词的小故事</div>
        <div class="story-text">${storyHtml}</div>
        <div class="story-zh">📝 参考译文：${esc(s.story_zh || '')}</div>

        <button class="btn primary" id="btnScenarioQuiz" style="margin-top:18px">
          🎯 开始填空挑战（${s.quizzes.length} 题）
        </button>
      </div>
    `;

    // 绑定点读发音
    el.querySelectorAll('.ws-speak').forEach(btn=>{
      btn.onclick = (e)=>{
        e.stopPropagation();
        Speaker.speak(btn.dataset.text, 0.82);
        setTimeout(()=>Sfx.pop(), 80);
      };
    });
    
    el.querySelectorAll('.clickable-word').forEach(wordEl => {
      wordEl.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const word = wordEl.dataset.word;
        wordEl.style.color = 'var(--pink)';
        setTimeout(() => { wordEl.style.color = ''; }, 300);
        if ('speechSynthesis' in window) speechSynthesis.cancel();
        Speaker.speak(word, 0.82);
      };
    });

    $('#btnScenarioQuiz').onclick = ()=>{
      Sfx.click();
      scenarioState.view = 'quiz';
      scenarioState.quizIdx = 0;
      scenarioState.correct = 0;
      scenarioState.locked = false;
      renderScenario();
    };
    return;
  }

  // ================= 答题页 =================
  if(scenarioState.view === 'quiz'){
    const s = scenarioState.scenario;
    const idx = scenarioState.quizIdx;

    if(idx >= s.quizzes.length){
      renderScenarioResult();
      return;
    }

    const quiz = s.quizzes[idx];
    const unitWords = s.sentences.map(x=>getWord(x.w)).filter(Boolean);
    const dists = shuffle(unitWords.filter(w=>w.en!==quiz.a)).slice(0,3);
    const answerWord = unitWords.find(w=>w.en===quiz.a) || {en:quiz.a, zh:quiz.h};
    
    while(dists.length < 3) {
      const randomW = WORDS[Math.floor(Math.random() * WORDS.length)];
      if(randomW.en !== quiz.a && !dists.find(d => d.en === randomW.en)) {
        dists.push(randomW);
      }
    }
    
    const options = shuffle([answerWord, ...dists]);
    const sentenceHtml = renderSentence(quiz.s);

    el.innerHTML = `
      <div class="progress" style="margin-bottom:12px">
        <div class="progress-fill" style="width:${(idx/s.quizzes.length)*100}%"></div>
      </div>
      <div class="learn-meta" style="margin-bottom:14px">
        <span>${esc(s.unit)} · 填空挑战</span>
        <span>${idx+1} / ${s.quizzes.length}</span>
      </div>
      <div class="scenario-quiz">
        <div class="q-label">📝 选择正确的单词填入空格</div>
        <div class="q-sentence">${sentenceHtml}</div>
        <div class="q-hint">💡 提示：${esc(quiz.h)}</div>
        <div class="options">
          ${options.map(o=>`
            <button class="option" data-en="${esc(o.en)}">
              <span class="syll-word" style="font-size:15px">${renderSyllablesHTML(o.en)}</span>
              <span style="color:var(--muted);font-size:13px;font-weight:700"> · ${esc(o.zh)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    el.querySelectorAll('.option').forEach(btn=>{
      btn.onclick = ()=>{
        if(scenarioState.locked) return;
        scenarioState.locked = true;
        const ok = btn.dataset.en === quiz.a;

        el.querySelectorAll('.option').forEach(b=>{
          b.classList.add('disabled');
          if(b.dataset.en === quiz.a) b.classList.add('correct');
          else if(b === btn) b.classList.add('wrong');
        });

        if(ok){
          Sfx.correct();
          spawnStars(3, innerWidth/2, innerHeight*0.5, ['⭐','✨','💫']);
          addCoins(5);
          addXp(5);
          save();
          scenarioState.correct++;
        } else {
          Sfx.wrong();
          setTimeout(()=>Speaker.speak(quiz.a, 0.8), 320);
        }

        setTimeout(()=>{
          scenarioState.locked = false;
          scenarioState.quizIdx++;
          renderScenario();
        }, ok ? 900 : 1500);
      };
    });
    return;
  }
}

function renderScenarioResult(){
  const s = scenarioState.scenario;
  const total = s.quizzes.length;
  const correct = scenarioState.correct;
  const acc = Math.round(correct/total*100);

  let emoji = '🌱';
  let title = '继续加油！';
  if(acc === 100){ emoji='🏆'; title='完美通关！'; }
  else if(acc >= 80){ emoji='🎉'; title='非常棒！'; }
  else if(acc >= 60){ emoji='👍'; title='做得不错！'; }
  else if(acc >= 40){ emoji='💪'; title='继续努力！'; }

  const bonusCoins = 20 + correct*3;
  const bonusXp = 15 + correct*2;
  addCoins(bonusCoins);
  addXp(bonusXp);
  trackGamePlayed('scenario'); unlockAch('story_master');
  save();
  Sfx.finish();
  celebrateBig();

  $('#scenarioContent').innerHTML = `
    <div class="card scenario-result">
      <div class="res-emoji">${emoji}</div>
      <div class="res-title">${title}</div>
      <div class="res-score">${correct} / ${total}</div>
      <div class="res-sub">${esc(s.unit)} · ${esc(s.name)} 场景完成</div>
      <div style="background:rgba(255,167,81,.12);border-radius:14px;padding:12px;
        margin-bottom:18px;font-weight:900;color:var(--orange)">
        🎁 +${bonusCoins} 金币 · +${bonusXp} 经验
      </div>
      <button class="btn primary" id="btnScenarioAgain">🔄 再练一遍</button>
      <button class="btn ghost small" id="btnScenarioRead" style="margin-top:10px">📖 重读故事</button>
      <button class="btn ghost small" id="btnScenarioOther" style="margin-top:10px">📚 换个主题场景</button>
      <button class="btn ghost small" id="btnScenarioExit" style="margin-top:10px">返回游戏乐园</button>
    </div>
  `;

  $('#btnScenarioAgain').onclick = ()=>{
    Sfx.click();
    scenarioState = { view:'quiz', scenario:s, quizIdx:0, correct:0, locked:false };
    renderScenario();
  };
  $('#btnScenarioRead').onclick = ()=>{
    Sfx.click();
    scenarioState = { view:'study', scenario:s, quizIdx:0, correct:0, locked:false };
    renderScenario();
  };
  $('#btnScenarioOther').onclick = ()=>{
    Sfx.click();
    scenarioState = { view:'list' };
    renderScenario();
  };
  $('#btnScenarioExit').onclick = ()=>{
    Sfx.click();
    showGamesScreen();
  };
}

$('#btnScenarioBack').onclick = ()=>{
  Sfx.click();
  if(!scenarioState || scenarioState.view === 'list'){
    scenarioState = null;
    showGamesScreen();
  } else {
    scenarioState = { view:'list' };
    renderScenario();
  }
};

window.startScenarioGame = startScenarioGame;