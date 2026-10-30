import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ⚠️ 在 Supabase 控制台的 Edge Functions -> Secrets 里配置这两个变量
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. 找出需要发警告的用户：已降级为 free，过期时间在 83~84 天前，且今天还没发过提醒
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .eq('membership_tier', 'free')
      .gte('membership_expires_at', new Date(Date.now() - 84 * 24 * 3600 * 1000).toISOString())
      .lte('membership_expires_at', new Date(Date.now() - 83 * 24 * 3600 * 1000).toISOString())
      .is('expiry_warning_sent_at', null)

    if (error) throw error
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users to notify today.' }), { status: 200 })
    }

    // 2. 遍历用户，调用 Resend 发信
    const emailPromises = users.map(async (user) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: '"Playkyn" <no-reply@mail.playkyn.com>',  // ⚠️ 换成你 Resend 里验证过的域名
          to: [user.email],
          subject: '⚠️ 紧急提醒：您的自定义词库即将被永久删除',
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>您好，${user.display_name || 'Playkyn 用户'}</h2>
              <p>您的会员已于近期到期。根据系统规则，您之前上传的<b>自定义词库</b>将在 <b>7 天后（即到期满 3 个月时）自动永久删除</b>。</p>
              <p>如果您希望保留这些宝贵的学习数据，请尽快登录 Playkyn 续费。</p>
              <a href="https://playkyn.com/user.html" style="display:inline-block; padding:10px 20px; background:#FF4D8D; color:#fff; text-decoration:none; border-radius:8px; margin-top:10px;">立即前往续费保留</a>
              <p style="color: #888; font-size: 12px; margin-top: 30px;">如果这不是您本人的操作，请忽略此邮件。</p>
            </div>
          `,
        }),
      })

      if (res.ok) {
        // 3. 发信成功，更新数据库标记，防止明天重复发
        await supabase
          .from('profiles')
          .update({ expiry_warning_sent_at: new Date().toISOString() })
          .eq('id', user.id)
      } else {
        console.error(`Failed to send to ${user.email}:`, await res.text())
      }
    })

    await Promise.all(emailPromises)

    return new Response(JSON.stringify({ success: true, notified: users.length }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})