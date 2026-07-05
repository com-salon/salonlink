import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 営業時間内の全スロット一覧を生成
export function generateSlots(openTime: string, closeTime: string, slotMinutes: number): string[] {
  const slots: string[] = []
  const [oh, om] = openTime.split(':').map(Number)
  const [ch, cm] = closeTime.split(':').map(Number)
  let h = oh, m = om
  while (h * 60 + m < ch * 60 + cm) {
    slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    m += slotMinutes
    if (m >= 60) { h += Math.floor(m/60); m = m % 60 }
  }
  return slots
}

// 指定日・スタッフの予約済みスロットを取得
export async function getBookedSlots(staffId: string, date: string): Promise<string[]> {
  const start = `${date}T00:00:00+09:00`
  const end   = `${date}T23:59:59+09:00`
  const { data } = await supabaseAdmin
    .from('reservations')
    .select('start_time, end_time')
    .eq('staff_id', staffId)
    .neq('status', 'cancelled')
    .gte('start_time', start)
    .lte('start_time', end)
  return (data || []).map(r => r.start_time.slice(11, 16))
}

// 店舗全体のスロット別予約数を取得
export async function getStoreCapacity(date: string): Promise<Record<string, number>> {
  const start = `${date}T00:00:00+09:00`
  const end   = `${date}T23:59:59+09:00`
  const { data } = await supabaseAdmin
    .from('reservations')
    .select('start_time')
    .neq('status', 'cancelled')
    .gte('start_time', start)
    .lte('start_time', end)
  const counts: Record<string, number> = {}
  for (const r of data || []) {
    const slot = r.start_time.slice(11, 16)
    counts[slot] = (counts[slot] || 0) + 1
  }
  return counts
}
