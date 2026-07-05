import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const start = `${date}T00:00:00+09:00`
  const end   = `${date}T23:59:59+09:00`

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select(`
      id, start_time, end_time, status, source, notes,
      staff(id, name, role),
      customers(id, name, line_user_id),
      menus(id, name, price, duration_min)
    `)
    .gte('start_time', start)
    .lte('start_time', end)
    .neq('status', 'cancelled')
    .order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reservations: data })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reservation: data })
}
