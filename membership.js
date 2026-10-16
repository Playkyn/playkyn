/* ═══════════════════════════════════════════════════
   Playkyn · 会员 & 额度工具模块
   被 index.html / user.html / wordgame.html 共用
   ═══════════════════════════════════════════════════ */

const MEMBERSHIP_TIERS = {
  monthly:   { name:'月卡',  price:19,  days:30,  quota:180  },
  quarterly: { name:'季卡',  price:49,  days:90,  quota:540  },
  annual:    { name:'年卡',  price:199, days:365, quota:1800 }
};

const NEW_USER_FREE_CREDITS = 30;
const EXPIRE_SOFT_BONUS     = 0.5;
const EXPIRE_WARN_DAYS      = 3;

/* ════════ 解析 profile → 会员状态 ════════ */
function parseMembership(profile){
  profile = profile || {};
  const now   = Date.now();
  const expMs = profile.membership_expires_at
    ? new Date(profile.membership_expires_at).getTime() : 0;
  const isVip = expMs > now;

  const quotaTotal     = profile.quota_total || 0;
  const quotaUsed      = profile.quota_used  || 0;
  const quotaRemaining = isVip ? Math.max(0, quotaTotal - quotaUsed) : 0;
  const credits        = profile.word_credits || 0;

  const daysLeft = isVip
    ? Math.max(0, Math.ceil((expMs - now) / 86400000)) : 0;

  return {
    isVip,
    tier: isVip ? (profile.membership_tier || null) : null,
    tierName: isVip ? ((MEMBERSHIP_TIERS[profile.membership_tier]||{}).name || '会员') : null,
    expiresAt: expMs,
    expiresAtStr: expMs
      ? new Date(expMs).toLocaleDateString('zh-CN') : '—',
    daysLeft,
    nearExpiry: isVip && daysLeft > 0 && daysLeft <= EXPIRE_WARN_DAYS,
    quotaTotal, quotaUsed, quotaRemaining,
    quotaPercent: quotaTotal > 0
      ? Math.round((1 - quotaRemaining / quotaTotal) * 100) : 0,
    credits,
    totalAvailable: quotaRemaining + credits,
    canUpload: (quotaRemaining + credits) > 0
  };
}

/* ════════ 加载 profile（带 10 秒缓存）════════ */
let __profileCache = { data:null, at:0 };

async function loadMembership(sb, userId, force){
  if(!force && __profileCache.data && Date.now() - __profileCache.at < 10000){
    return __profileCache.data;
  }
  const { data, error } = await sb.from('profiles')
    .select('*').eq('id', userId).single();
  if(error) throw error;
  __profileCache = { data, at: Date.now() };
  return data;
}

/* ════════ 惰性结算 + 读最新 profile ════════ */
async function settleAndLoad(sb, userId){
  try{ await sb.rpc('settle_membership'); }catch(e){ /* 忽略 */ }
  return await loadMembership(sb, userId, true);
}

/* ════════ 兑换解锁码 ════════ */
async function redeemCode(sb, codeText){
  const t = (codeText || '').trim().toUpperCase();
  if(!t) return { ok:false, msg:'请输入解锁码' };
  const { data, error } = await sb.rpc('redeem_code', { p_code: t });
  if(error) return { ok:false, msg: error.message };
  if(data && data.ok) __profileCache = { data:null, at:0 };
  return data;
}

/* ════════ 扣减额度 ════════ */
async function consumeQuota(sb, userId, wordCount){
  const profile = await loadMembership(sb, userId, true);
  const m = parseMembership(profile);

  if(wordCount > m.totalAvailable){
    const need = wordCount - m.totalAvailable;
    throw new Error(`额度不足，还差 ${need} 词`);
  }
  const fromQuota   = Math.min(m.quotaRemaining, wordCount);
  const fromCredits = wordCount - fromQuota;

  const { error } = await sb.from('profiles').update({
    quota_used: (profile.quota_used||0) + fromQuota,
    word_credits: (profile.word_credits||0) - fromCredits,
    total_words_uploaded: (profile.total_words_uploaded||0) + wordCount
  }).eq('id', userId);
  if(error) throw error;

  __profileCache = { data:null, at:0 };
  return { fromQuota, fromCredits };
}

/* ════════ 徽章 HTML ════════ */
function renderMembershipBadge(m){
  if(m.isVip)     return `<span class="badge pro">${m.tierName} · 剩 ${m.daysLeft} 天</span>`;
  if(m.credits>0) return `<span class="badge free">体验中 · ${m.credits} 词</span>`;
  return `<span class="badge free">免费版</span>`;
}

/* ════════ 额度条 HTML ════════ */
function renderQuotaBar(m){
  if(m.isVip){
    return `
      <div style="margin:10px 0 4px">
        <div style="display:flex;justify-content:space-between;
          font-size:12px;color:#8A8A8A;font-weight:700;margin-bottom:6px">
          <span>本周期额度</span>
          <span style="color:#FF4D8D;font-weight:900">
            ${m.quotaRemaining} / ${m.quotaTotal} 词
          </span>
        </div>
        <div style="height:8px;background:#F5F5F5;border-radius:8px;overflow:hidden">
          <div style="height:100%;width:${m.quotaPercent}%;
            background:linear-gradient(90deg,#FF4D8D,#FFA751);
            transition:width .4s"></div>
        </div>
      </div>`;
  }
  if(m.credits > 0){
    return `<div style="margin:10px 0 4px;font-size:12px;
      color:#8A8A8A;font-weight:700">
      剩余可用 <b style="color:#FF4D8D">${m.credits}</b> 词（永久有效）
    </div>`;
  }
  return '';
}

/* ════════ 到期提醒条 ════════ */
function renderExpiryWarning(m){
  if(!m.nearExpiry) return '';
  const remainAfter = Math.floor(m.quotaRemaining * EXPIRE_SOFT_BONUS);
  return `
    <div style="border:1px solid #FFD9E5;background:#FFF0F5;
      border-radius:12px;padding:14px 16px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:900;color:#FF4D8D;margin-bottom:6px">
        ⏰ ${m.tierName}还有 ${m.daysLeft} 天到期
      </div>
      <div style="font-size:12px;color:#525252;line-height:1.7">
        未使用的 <b>${m.quotaRemaining}</b> 词额度到期后
        将按 50% 转为永久额度（约 <b>${remainAfter}</b> 词）。
      </div>
    </div>`;
}

/* ════════ 全局暴露 ════════ */
window.MEMBERSHIP_TIERS = MEMBERSHIP_TIERS;
window.parseMembership  = parseMembership;
window.loadMembership   = loadMembership;
window.settleAndLoad    = settleAndLoad;
window.redeemCode       = redeemCode;
window.consumeQuota     = consumeQuota;
window.renderMembershipBadge = renderMembershipBadge;
window.renderQuotaBar   = renderQuotaBar;
window.renderExpiryWarning   = renderExpiryWarning;