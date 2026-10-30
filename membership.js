/* ═══════════════════════════════════════════════════
   Playkyn · 核心会员 & 额度逻辑模块 (V2.0 终极版)
   适配：7天试用二选一、付费上传、到期固化30词、防并发扣费
   ═══════════════════════════════════════════════════ */

const MEMBERSHIP_TIERS = {
  monthly:   { name: '月卡', price: 19,  days: 30,  quota: 180  },
  quarterly: { name: '季卡', price: 49,  days: 90,  quota: 540  },
  annual:    { name: '年卡', price: 199, days: 365, quota: 1800 }
};

const TRIAL_DAYS = 7;
const EXPIRE_WARN_DAYS = 3;

/* ════════ 解析 profile → 完整会员状态对象 ════════ */
function parseMembership(profile){
  profile = profile || {};
  const now = Date.now();
  const expMs = profile.membership_expires_at
    ? new Date(profile.membership_expires_at).getTime() : 0;
  
  const isExpired = expMs ? expMs <= now : true;
  const tier = profile.membership_tier || 'free';
  
  // 核心状态判定：free(免费) / trial(试用) / paid(付费)
  let status = 'free'; 
  if (!isExpired) {
    if (tier === 'trial') status = 'trial';
    if (['monthly', 'quarterly', 'annual'].includes(tier)) status = 'paid';
  }

  const quotaTotal = profile.quota_total || 0;
  const quotaUsed = profile.quota_used || 0;
  const quotaRemaining = Math.max(0, quotaTotal - quotaUsed);
  const credits = profile.word_credits || 0; // 永久额度

  const daysLeft = !isExpired
    ? Math.max(0, Math.ceil((expMs - now) / 86400000)) : 0;

  return {
    userId: profile.id, // 👈 加上这一行！！
    status,                  // 'free', 'trial', 'paid'
    isTrial: status === 'trial',
    isPaid: status === 'paid',
    isFree: status === 'free',
    isExpired,
    tier: tier,
    tierName: (MEMBERSHIP_TIERS[tier] || {}).name || (tier === 'trial' ? '试用会员' : '免费版'),
    expiresAt: expMs,
    expiresAtStr: expMs ? new Date(expMs).toLocaleDateString('zh-CN') : '—',
    daysLeft,
    nearExpiry: !isExpired && daysLeft > 0 && daysLeft <= EXPIRE_WARN_DAYS,
    
    // 额度数据
    quotaTotal, 
    quotaUsed, 
    quotaRemaining,
    quotaPercent: quotaTotal > 0 ? Math.round((quotaRemaining / quotaTotal) * 100) : 0,
    credits,
    // 可用总额度 (仅付费用户有上传额度)
    totalAvailable: (status === 'paid' ? quotaRemaining : 0) + credits, 
    canUpload: status === 'paid' && (quotaRemaining + credits) > 0,
    
    // 辅助字段 (供 user.html 使用)
    display_name: profile.display_name || '',
    daily_new: profile.daily_new || 10,
    trialSettings: profile.trialSettings || null 
  };
}

/* ════════ 加载 profile（带 10 秒缓存 + 联动试用设置） ════════ */
let __profileCache = { data: null, at: 0 };

async function loadMembership(sb, userId, force){
  if(!force && __profileCache.data && Date.now() - __profileCache.at < 10000){
    return parseMembership(__profileCache.data);
  }
  
  // 1. 获取基础资料
  const { data: profile, error: pErr } = await sb.from('profiles')
    .select('*').eq('id', userId).single();
  if(pErr) throw pErr;

  // 2. 获取试用期选择的词库
  const { data: trialSettings } = await sb.from('user_trial_settings')
    .select('*').eq('user_id', userId).maybeSingle();

  // 3. 合并对象
  const fullData = { ...profile, trialSettings };
  __profileCache = { data: fullData, at: Date.now() };
  
  return parseMembership(fullData);
}

/* ════════ 惰性结算（后台降级 + 发牌30词） + 读最新 profile ════════ */
async function settleAndLoad(sb, userId){
  try { 
    // 调用我们写的核心 RPC，如果用户过期了，后台会自动降级并抽出30个词
    await sb.rpc('settle_membership'); 
  } catch(e) { 
    console.warn('后台静默结算失败:', e); 
  }
  return await loadMembership(sb, userId, true);
}

/* ════════ 获取免费用户的专属 30 个词（供 wordgame 页面使用） ════════ */
async function getFreeWords(sb, userId) {
   if (!userId) return []; // 👈 加上这句，防止再报 UUID 错误
  const { data, error } = await sb.from('user_free_words')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true });
    
  if(error) {
    console.error("获取专属免费词失败", error);
    return [];
  }
  return data;
}

/* ════════ 兑换解锁码 ════════ */
async function redeemCode(sb, codeText){
  const t = (codeText || '').trim().toUpperCase();
  if(!t) return { ok: false, msg: '请输入解锁码' };
  
  const { data, error } = await sb.rpc('redeem_code', { p_code: t });
  if(error) return { ok: false, msg: error.message };
  
  if(data && data.ok) {
    __profileCache = { data: null, at: 0 }; // 兑换成功清空缓存
  }
  return data;
}

/* ════════ 扣减额度 (调用后端安全 RPC，防并发防越权) ════════ */
async function consumeQuota(sb, wordCount){
  // 不传 userId，完全由后端通过 auth.uid() 识别，绝对安全
  const { data, error } = await sb.rpc('consume_upload_quota', { p_word_count: wordCount });
  
  if(error) throw new Error(error.message);
  if(data && data.error) throw new Error(data.error);
  
  __profileCache = { data: null, at: 0 }; // 扣费成功清空缓存
  return data;
}


/* ═══════════════════════════════════════════
   以下为 UI 渲染辅助函数 (供 index.html / user.html 共用)
   ═══════════════════════════════════════════ */

// 1. 渲染状态徽章
function renderMembershipBadge(m){
  if(m.isPaid) {
    return `<span class="badge pro" style="background:#FFF0F5;color:#FF4D8D;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;">● ${m.tierName} · 剩 ${m.daysLeft} 天</span>`;
  }
  if(m.isTrial) {
    return `<span class="badge trial" style="background:#FFF3E0;color:#F57C00;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;">● 试用期 · 剩 ${m.daysLeft} 天</span>`;
  }
  return `<span class="badge free" style="background:#F5F5F5;color:#525252;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;">免费版</span>`;
}

// 2. 渲染额度进度条
function renderQuotaBar(m){
  // 付费会员：展示本周期额度进度条
  if(m.isPaid){
    return `
      <div style="margin:16px 0;">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#8A8A8A;font-weight:700;margin-bottom:6px;">
          <span>自定义上传额度</span>
          <span style="color:#FF4D8D;font-weight:900;">${m.quotaRemaining} / ${m.quotaTotal} 词</span>
        </div>
        <div style="height:8px;background:#F5F5F5;border-radius:8px;overflow:hidden">
          <div style="height:100%;width:${m.quotaPercent}%;background:linear-gradient(90deg,#FF4D8D,#FFA751);transition:width .4s"></div>
        </div>
        ${m.credits > 0 ? `<div style="font-size:12px;color:#8A8A8A;margin-top:8px;font-weight:600;">额外永久额度: <b style="color:#FF4D8D">${m.credits}</b> 词</div>` : ''}
      </div>`;
  }
  
  // 试用期：提示不支持上传
  if(m.isTrial){
    return `<div style="margin:16px 0;font-size:13px;color:#8A8A8A;font-weight:600;background:#FAFAFA;padding:10px;border-radius:8px;text-align:center;">试用期间享受全词库通玩，暂不支持上传自定义词汇</div>`;
  }
  
  // 免费用户：提示专属 30 词
  if(m.isFree) {
    return `<div style="margin:16px 0;font-size:13px;color:#F57C00;font-weight:600;background:#FFF3E0;padding:10px;border-radius:8px;text-align:center;">🔒 已为您保留 30 个专属免费词汇</div>`;
  }
  return '';
}

// 3. 渲染到期警告（营销钩子）
function renderExpiryWarning(m){
  if(!m.nearExpiry) return '';
  
  if (m.isPaid) {
    return `
      <div style="border:1px solid #FFD9E5;background:#FFF0F5;border-radius:12px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-size:14px;font-weight:900;color:#FF4D8D;margin-bottom:6px;">
          ⏰ ${m.tierName}还有 ${m.daysLeft} 天到期
        </div>
        <div style="font-size:13px;color:#525252;line-height:1.6;font-weight:500;">
          到期后您的自定义词库将被锁定保留（保留3个月），且无法再游玩。请及时续费以保留完整权益。
        </div>
      </div>`;
  }
  
  if (m.isTrial) {
    return `
      <div style="border:1px solid #FFD9E5;background:#FFF0F5;border-radius:12px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-size:14px;font-weight:900;color:#FF4D8D;margin-bottom:6px;">
          ⏰ 试用期仅剩 ${m.daysLeft} 天
        </div>
        <div style="font-size:13px;color:#525252;line-height:1.6;font-weight:500;">
          试用结束后，系统将为您随机保留 30 个专属免费词汇以供永久游玩。升级正式版即可解锁全部词库与无限自定义特权！
        </div>
      </div>`;
  }
  return '';
}

/* ════════ 全局暴露 (挂载到 window 供前端直接调用) ════════ */
window.MEMBERSHIP_TIERS       = MEMBERSHIP_TIERS;
window.parseMembership        = parseMembership;
window.loadMembership         = loadMembership;
window.settleAndLoad          = settleAndLoad;
window.getFreeWords           = getFreeWords;
window.redeemCode             = redeemCode;
window.consumeQuota           = consumeQuota;
window.renderMembershipBadge  = renderMembershipBadge;
window.renderQuotaBar         = renderQuotaBar;
window.renderExpiryWarning    = renderExpiryWarning;