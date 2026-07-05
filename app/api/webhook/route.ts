import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin, generateSlots, getBookedSlots, getStoreCapacity } from '@/lib/supabase'
import { lineClient, buildConfirmMessage, buildCheckMessage } from '@/lib/line'
import { format, addMinutes } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'Asia/Tokyo'

// LINE署名検証
function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', process.env.LINE_CHANNEL_SECRET!)
    .update(body).digest('base64')
  return hash === signature
}

// ユーザーセッション（簡易: KVS代わりにSupabaseを使う）
async function getSession(userId: string) {
  const { data } = await supabaseAdmin
    .from('line_sessions')
    .select('*').eq('user_id', userId).single()
  return data
}
async function setSession(userId: string, state: object) {
  await supabaseAdmin.from('line_sessions').upsert({
    user_id: userId, state: JSON.stringify(state), updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' })
}
async function clearSession(userId: string) {
  await supabaseAdmin.from('line_sessions').delete().eq('user_id', userId)
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('x-line-signature') || ''
  if (!verifySignature(rawBody, sig)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)
  for (const event of body.events || []) {
    if (event.type !== 'message' || event.message.type !== 'text') continue
    await handleMessage(event.source.userId, event.message.text.trim(), event.replyToken)
  }
  return NextResponse.json({ ok: true })
}

async function handleMessage(userId: string, text: string, replyToken: string) {
  const session = await getSession(userId) || {}
  const state = session.state ? JSON.parse(session.state) : {}

  // 予約確認
  if (text === '予約確認') {
    const { data: customer } = await supabaseAdmin
      .from('customers').select('id').eq('line_user_id', userId).single()
    if (!customer) {
      return reply(replyToken, [{ type: 'text', text: 'ご予約は見つかりませんでした。' }])
    }
    const { data: reservations } = await supabaseAdmin
      .from('reservations')
      .select('start_time, status, staff(name), menus(name)')
      .eq('customer_id', customer.id)
      .neq('status', 'cancelled')
      .gte('start_time', new Date().toISOString())
      .order('start_time').limit(1)
    const list = (reservations || []).map((r: any) => ({
      date: format(toZonedTime(new Date(r.start_time), TZ), 'M月d日（E）', { timeZone: TZ } as any),
      time: format(toZonedTime(new Date(r.start_time), TZ), 'HH:mm'),
      stylist: r.staff?.name || '',
      menu: r.menus?.name || '',
      status: r.status
    }))
    await clearSession(userId)
    return reply(replyToken, [buildCheckMessage(list)])
  }

  // フロー開始
  if (text === '予約する') {
    const { data: staffList } = await supabaseAdmin
      .from('staff').select('id, name, role').eq('is_active', true).order('display_order')
    await setSession(userId, { step: 'select_stylist' })
    return reply(replyToken, [{
      type: 'text',
      text: 'ご担当のスタイリストをお選びください\n\n' +
        (staffList || []).map((s: any, i: number) => `${i+1}. ${s.name}（${s.role}）`).join('\n') +
        '\n\n番号またはお名前でお答えください\n\n0. お電話で予約する（011-XXX-XXXX）'
    }])
  }

  // スタイリスト選択
  if (state.step === 'select_stylist') {
    const { data: staffList } = await supabaseAdmin
      .from('staff').select('id, name').eq('is_active', true).order('display_order')
    const found = (staffList || []).find((s: any, i: number) =>
      text === String(i+1) || s.name.includes(text)
    )
    if (!found) {
      return reply(replyToken, [{ type: 'text', text: '番号またはスタイリスト名をお選びください。' }])
    }
    const { data: menuList } = await supabaseAdmin
      .from('menus').select('id, name, duration_min, price').eq('is_active', true).order('display_order')
    await setSession(userId, { step: 'select_menu', staffId: found.id, staffName: found.name })
    return reply(replyToken, [{
      type: 'text',
      text: `${found.name}さんですね！\n\nメニューをお選びください\n\n` +
        (menuList || []).map((m: any, i: number) =>
          `${i+1}. ${m.name}（${m.duration_min}分 / ¥${m.price.toLocaleString()}〜）`
        ).join('\n')
    }])
  }

  // メニュー選択
  if (state.step === 'select_menu') {
    const { data: menuList } = await supabaseAdmin
      .from('menus').select('id, name, duration_min, price').eq('is_active', true).order('display_order')
    const found = (menuList || []).find((m: any, i: number) =>
      text === String(i+1) || m.name.includes(text)
    )
    if (!found) {
      return reply(replyToken, [{ type: 'text', text: 'メニューの番号をお選びください。' }])
    }

    // 今日から7日分の空き枠を取得
    const { data: settings } = await supabaseAdmin
      .from('salon_settings').select('*').single()
    const slots = generateSlots(settings.open_time, settings.close_time, settings.slot_minutes)
    const today = format(toZonedTime(new Date(), TZ), 'yyyy-MM-dd')
    let availableText = ''
    for (let d = 0; d < 7; d++) {
      const date = format(addMinutes(new Date(today), d * 24 * 60), 'yyyy-MM-dd')
      const booked = await getBookedSlots(state.staffId, date)
      const capacity = await getStoreCapacity(date)
      const available = slots.filter(s => !booked.includes(s) && (capacity[s] || 0) < settings.chair_count)
      if (available.length > 0) {
        const dateLabel = format(new Date(date + 'T00:00:00'), 'M/d（E）')
        availableText += `\n📅 ${dateLabel}: ${available.slice(0, 6).join(' ')}`
      }
    }

    await setSession(userId, { ...state, step: 'select_datetime', menuId: found.id, menuName: found.name, menuDuration: found.duration_min, menuPrice: found.price })
    return reply(replyToken, [{
      type: 'text',
      text: `${found.name}ですね（${found.duration_min}分 / ¥${found.price.toLocaleString()}〜）\n\n` +
        `ご希望の日時を選んでください：\n${availableText}\n\n` +
        `例: 「7/5 10:00」のようにお送りください`
    }])
  }

  // 日時選択
  if (state.step === 'select_datetime') {
    const match = text.match(/(\d{1,2})[\/月](\d{1,2})\s*[日]?\s*(\d{1,2}):(\d{2})/)
    if (!match) {
      return reply(replyToken, [{ type: 'text', text: '「7/5 10:00」のような形式でお送りください。' }])
    }
    const now = toZonedTime(new Date(), TZ)
    const year = now.getFullYear()
    const dateStr = `${year}-${String(match[1]).padStart(2,'0')}-${String(match[2]).padStart(2,'0')}`
    const timeStr = `${match[3].padStart(2,'0')}:${match[4]}`
    const startTime = new Date(`${dateStr}T${timeStr}:00+09:00`)
    const endTime = addMinutes(startTime, state.menuDuration)
    const dateLabel = format(startTime, 'M月d日（E）')

    // ダブルブッキングチェック
    const booked = await getBookedSlots(state.staffId, dateStr)
    const capacity = await getStoreCapacity(dateStr)
    const { data: settings } = await supabaseAdmin.from('salon_settings').select('*').single()
    if (booked.includes(timeStr) || (capacity[timeStr] || 0) >= settings.chair_count) {
      return reply(replyToken, [{
        type: 'text',
        text: `申し訳ございません、${dateLabel} ${timeStr}はすでに満席です。\n別のお時間をお選びください。`
      }])
    }

    await setSession(userId, {
      ...state, step: 'confirm',
      dateStr, timeStr, startTime: startTime.toISOString(), endTime: endTime.toISOString(), dateLabel
    })
    return reply(replyToken, [{
      type: 'text',
      text: `以下の内容でよろしいですか？\n\n` +
        `📅 ${dateLabel} ${timeStr}〜\n` +
        `👤 ${state.staffName}\n` +
        `💇 ${state.menuName}\n` +
        `💴 ¥${state.menuPrice.toLocaleString()}〜\n\n` +
        `「確定」または「やり直し」でお答えください`
    }])
  }

  // 確定
  if (state.step === 'confirm' && text === '確定') {
    // 顧客登録（LINEユーザーIDで管理）
    let { data: customer } = await supabaseAdmin
      .from('customers').select('id').eq('line_user_id', userId).single()
    if (!customer) {
      const { data: newCustomer } = await supabaseAdmin
        .from('customers').insert({ line_user_id: userId }).select('id').single()
      customer = newCustomer
    }

    // 予約登録
    const { data: settings } = await supabaseAdmin.from('salon_settings').select('id').single()
    const { data: reservation, error } = await supabaseAdmin
      .from('reservations').insert({
        salon_id: settings.id,
        staff_id: state.staffId,
        customer_id: customer!.id,
        menu_id: state.menuId,
        start_time: state.startTime,
        end_time: state.endTime,
        status: 'confirmed',
        source: 'line'
      }).select('id').single()

    if (error) {
      return reply(replyToken, [{
        type: 'text', text: '予約が重複しています。別のお時間をお選びください。'
      }])
    }

    await clearSession(userId)
    return reply(replyToken, [buildConfirmMessage({
      stylist: state.staffName,
      menu: state.menuName,
      date: state.dateLabel,
      time: state.timeStr,
      reservationId: reservation!.id,
      price: state.menuPrice
    })])
  }

  if (state.step === 'confirm' && text === 'やり直し') {
    await clearSession(userId)
    return reply(replyToken, [{ type: 'text', text: '最初からやり直します。「予約する」と送ってください。' }])
  }

  // デフォルト
  return reply(replyToken, [{
    type: 'text',
    text: 'リッチメニューから「予約する」または「予約確認」をお選びください。\nお電話: 011-XXX-XXXX（10:00〜19:00）'
  }])
}

async function reply(replyToken: string, messages: any[]) {
  await lineClient.replyMessage({ replyToken, messages })
}
