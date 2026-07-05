import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, generateSlots, getBookedSlots, getStoreCapacity } from '@/lib/supabase'

// 指定日の全スタッフ空き状況を返す
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10)

  const { data: settings } = await supabaseAdmin.from('salon_settings').select('*').single()
  const { data: staffList } = await supabaseAdmin.from('staff').select('id, name, role').eq('is_active', true).order('display_order')
  const { data: availability } = await supabaseAdmin
    .from('staff_availability')
    .select('staff_id, time_slot, is_open')
    .eq('target_date', date)

  const slots = generateSlots(settings.open_time, settings.close_time, settings.slot_minutes)
  const capacity = await getStoreCapacity(date)

  const result = []
  for (const staff of staffList || []) {
    const booked = await getBookedSlots(staff.id, date)
    const avail = availability?.filter((a: any) => a.staff_id === staff.id) || []
    const slotStatus = slots.map(slot => {
      const isBooked = booked.includes(slot)
      const closedManually = avail.find((a: any) => a.time_slot === slot && !a.is_open)
      const storeFull = (capacity[slot] || 0) >= settings.chair_count
      return {
        slot,
        status: isBooked ? 'booked' : closedManually ? 'closed' : storeFull ? 'store_full' : 'open'
      }
    })
    result.push({ staff, slots: slotStatus })
  }

  return NextResponse.json({ date, chairCount: settings.chair_count, capacity, staffSlots: result })
}

// スタッフの枠を手動で開閉する
export async function POST(req: NextRequest) {
  const { staffId, date, timeSlot, isOpen } = await req.json()
  const { error } = await supabaseAdmin
    .from('staff_availability')
    .upsert({ staff_id: staffId, target_date: date, time_slot: timeSlot, is_open: isOpen },
      { onConflict: 'staff_id,target_date,time_slot' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// 店舗のカット台数を更新
export async function PATCH(req: NextRequest) {
  const { chairCount } = await req.json()
  const { error } = await supabaseAdmin
    .from('salon_settings').update({ chair_count: chairCount }).neq('id', '')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
