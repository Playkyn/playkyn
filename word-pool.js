window.PK_WORD_POOL = {
  THEMES: {
    fruit: { id: 'fruit', label: '水果', words: [ { word: 'apple', hint: '苹果' }, { word: 'banana', hint: '香蕉' }, { word: 'grape', hint: '葡萄' }, { word: 'pear', hint: '梨' }, { word: 'orange', hint: '橙子' }, { word: 'peach', hint: '桃子' }, { word: 'lemon', hint: '柠檬' }, { word: 'mango', hint: '芒果' }, { word: 'cherry', hint: '樱桃' } ] },
    animal: { id: 'animal', label: '动物', words: [ { word: 'cat', hint: '猫' }, { word: 'dog', hint: '狗' }, { word: 'bird', hint: '鸟' }, { word: 'fish', hint: '鱼' }, { word: 'rabbit', hint: '兔子' }, { word: 'tiger', hint: '老虎' }, { word: 'panda', hint: '熊猫' }, { word: 'horse', hint: '马' }, { word: 'monkey', hint: '猴子' } ] },
    food: { id: 'food', label: '食物', words: [ { word: 'rice', hint: '米饭' }, { word: 'bread', hint: '面包' }, { word: 'milk', hint: '牛奶' }, { word: 'cake', hint: '蛋糕' }, { word: 'noodle', hint: '面条' }, { word: 'egg', hint: '鸡蛋' }, { word: 'juice', hint: '果汁' } ] }
  },
  getPool: function(themeId) {
    const t = this.THEMES[themeId] || this.THEMES.fruit;
    return t.words.slice();
  },
  shuffle: function(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  pickWords: function(themeId, n) {
    return this.shuffle(this.getPool(themeId)).slice(0, n);
  },
  randomDistractors: function(pool, correctWord, n = 2) {
    const others = pool.map(w => w.word).filter(w => w !== correctWord);
    if (others.length >= n) return this.shuffle(others).slice(0, n);
    return [];
  }
};