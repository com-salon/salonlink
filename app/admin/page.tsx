'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'

type Reservation = {
  id: string; start_time: string; end_time: string; status: string; source: string
  staff: { id: string; name: string; role: string }
  customers: { id: string; name: string; line_user_id: string } | null
  menus: { id: string; name: string; price: number; duration_min: number }
}
type SlotStatus = { slot: string; status: 'open' | 'closed' | 'booked' | 'store_full' }
type StaffSlot = { staff: { id: string; name: string; role: string }; slots: SlotStatus[] }

const APPT_COLORS = [
  { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
  { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
]

export default function AdminPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [staffSlots, setStaffSlots] = useState<StaffSlot[]>([])
  const [capacity, setCapacity] = useState<Record<string, number>>({})
  const [chairCount, setChairCount] = useState(3)
  const [slots, setSlots] = useState<string[]>([])
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [tab, setTab] = useState<'schedule' | 'customers' | 'sales'>('schedule')

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([
      fetch(`/api/reservations?date=${date}`).then(r => r.json()),
      fetch(`/api/slots?date=${date}`).then(r => r.json())
    ])
    setReservations(r.reservations || [])
    setStaffSlots(s.staffSlots || [])
    setCapacity(s.capacity || {})
    setChairCount(s.chairCount || 3)
    if (s.staffSlots?.[0]?.slots) setSlots(s.staffSlots[0].slots.map((sl: SlotStatus) => sl.slot))
  }, [date])

  useEffect(() => { load() }, [load])

  const toggleSlot = async (staffId: string, slot: string, current: string) => {
    if (current === 'booked') return
    await fetch('/api/slots', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId, date, timeSlot: slot, isOpen: current !== 'open' }) })
    load()
  }

  const dateLabel = format(new Date(date + 'T00:00:00'), 'M月d日（E）', { locale: ja })
  const getApptForStaff = (staffId: string) => reservations.filter(r => r.staff?.id === staffId)

  const storeSymbol = (slot: string) => {
    const c = capacity[slot] || 0
    if (c >= chairCount) return { sym: '✕', color: '#dc2626' }
    if (c === chairCount - 1) return { sym: '△', color: '#d97706' }
    return { sym: '〇', color: '#16a34a' }
  }

  const navItems = [
    { id: 'schedule', label: '予約管理', icon: '📅' },
    { id: 'customers', label: 'お客様管理', icon: '👥' },
    { id: 'sales', label: '売上管理', icon: '💴' },
    { id: 'settings', label: '設定', icon: '⚙️' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif', fontSize: 13, background: '#f3f4f6' }}>
      {/* サイドバー */}
      <div style={{ width: 176, background: '#1a3a5c', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>SalonLink</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>COM【コム】</div>
        </div>
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setTab(item.id as any)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                background: tab === item.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: tab === item.id ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              <span>{item.icon}</span>{item.label}
            </div>
          ))}
        </nav>
        <div style={{ margin: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }}/>
            <span style={{ color: '#fff', fontWeight: 500, fontSize: 11 }}>サロンボード同期中</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>最終同期: 2分前</div>
        </div>
      </div>

      {/* メインエリア */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* トップバー */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fff', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
          <button style={{ padding: '5px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>今日</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setDate(format(addDays(new Date(date+'T00:00:00'), -1), 'yyyy-MM-dd'))}
              style={{ width: 24, height: 24, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 14 }}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 140, textAlign: 'center' }}>{dateLabel}</span>
            <button onClick={() => setDate(format(addDays(new Date(date+'T00:00:00'), 1), 'yyyy-MM-dd'))}
              style={{ width: 24, height: 24, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 14 }}>›</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <span style={{ fontSize: 11, color: '#6b7280' }}>カット台数</span>
            <button onClick={() => setChairCount(c => Math.max(1, c-1))} style={{ width: 20, height: 20, border: '1px solid #d1d5db', borderRadius: '50%', background: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>−</button>
            <span style={{ fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{chairCount}</span>
            <button onClick={() => setChairCount(c => c+1)} style={{ width: 20, height: 20, border: '1px solid #d1d5db', borderRadius: '50%', background: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>+</button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button style={{ padding: '5px 12px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', fontSize: 12, cursor: 'pointer' }}>印刷</button>
            <button style={{ padding: '5px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>＋ 新規予約</button>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'schedule' && (
            <div>
              {/* サマリー */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: 12, borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                {[
                  { val: reservations.length, lbl: '本日の予約' },
                  { val: slots.filter(s => !capacity[s] || capacity[s] < chairCount).length, lbl: '残り空き枠' },
                  { val: `¥${reservations.reduce((s,r) => s+(r.menus?.price||0),0).toLocaleString()}`, lbl: '本日売上見込' },
                  { val: `${chairCount}台`, lbl: 'カット台稼働' },
                ].map(({val,lbl}) => (
                  <div key={lbl} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>{val}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{lbl}</div>
                  </div>
                ))}
              </div>

              {/* タイムライングリッド */}
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 720 }}>
                  {/* ヘッダー */}
                  <div style={{ display: 'grid', gridTemplateColumns: `90px repeat(${slots.length},1fr)`, background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ padding: '6px 8px', fontSize: 11, color: '#9ca3af', borderRight: '1px solid #e5e7eb' }}>スタッフ</div>
                    {slots.map(s => <div key={s} style={{ padding: '6px 2px', textAlign: 'center', fontSize: 10, color: '#9ca3af', borderRight: '1px solid #e5e7eb' }}>{s}</div>)}
                  </div>

                  {/* 予約数行 */}
                  <div style={{ display: 'grid', gridTemplateColumns: `90px repeat(${slots.length},1fr)`, borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <div style={{ padding: '4px 8px', fontSize: 10, color: '#9ca3af', borderRight: '1px solid #e5e7eb' }}>予約数</div>
                    {slots.map(s => <div key={s} style={{ padding: '4px 2px', textAlign: 'center', fontSize: 11, borderRight: '1px solid #e5e7eb' }}>{capacity[s]||0}</div>)}
                  </div>

                  {/* 残り受付可能数行 */}
                  <div style={{ display: 'grid', gridTemplateColumns: `90px repeat(${slots.length},1fr)`, borderBottom: '2px solid #d1d5db', background: '#eff6ff' }}>
                    <div style={{ padding: '6px 8px', fontSize: 11, fontWeight: 600, color: '#1d4ed8', borderRight: '1px solid #e5e7eb' }}>
                      店舗全体<div style={{ fontSize: 10, fontWeight: 400, color: '#60a5fa' }}>/{chairCount}台</div>
                    </div>
                    {slots.map(s => {
                      const {sym,color} = storeSymbol(s)
                      return <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color, borderRight: '1px solid #e5e7eb', minHeight: 36 }}>{sym}</div>
                    })}
                  </div>

                  {/* スタッフ行 */}
                  {staffSlots.map((ss, idx) => {
                    const appts = getApptForStaff(ss.staff.id)
                    const color = APPT_COLORS[idx % APPT_COLORS.length]
                    return (
                      <div key={ss.staff.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: `90px 1fr` }}>
                          <div style={{ padding: '8px 8px', borderRight: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 56 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{ss.staff.name}</div>
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>{ss.staff.role}</div>
                          </div>
                          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${slots.length},1fr)`, minHeight: 56 }}>
                            {ss.slots.map(sl => (
                              <div key={sl.slot} onClick={() => toggleSlot(ss.staff.id, sl.slot, sl.status)}
                                style={{ borderRight: '1px solid #e5e7eb', minHeight: 56, cursor: sl.status === 'booked' ? 'default' : 'pointer',
                                  background: sl.status === 'closed' ? 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 3px,#e5e7eb 3px,#e5e7eb 6px)' : '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {sl.status !== 'booked' && sl.status !== 'open' && (
                                  <span style={{ fontSize: 14, fontWeight: 600, color: sl.status === 'closed' ? '#dc2626' : '#d97706' }}>✕</span>
                                )}
                              </div>
                            ))}
                            {appts.map(r => {
                              const si = slots.indexOf(r.start_time.slice(11,16))
                              const ei = slots.findIndex(s => s >= r.end_time.slice(11,16))
                              const span = ei < 0 ? slots.length - si : ei - si
                              if (si < 0) return null
                              return (
                                <div key={r.id} onClick={() => setSelected(r)}
                                  style={{ position: 'absolute', top: 3, bottom: 3, borderRadius: 4, padding: '3px 6px', fontSize: 10, cursor: 'pointer', zIndex: 2,
                                    background: color.bg, borderLeft: `3px solid ${color.border}`, color: color.text, overflow: 'hidden',
                                    left: `calc(${si}/${slots.length}*100%)`, width: `calc(${Math.max(1,span)}/${slots.length}*100% - 4px)` }}>
                                  <div style={{ fontWeight: 600 }}>{r.customers?.name || 'お客様'}</div>
                                  <div style={{ opacity: 0.8 }}>{r.menus?.name}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 日付ナビ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', background: '#fff', borderTop: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
                {Array.from({length: 12}, (_,i) => {
                  const d = addDays(new Date(), i-3)
                  const ds = format(d, 'yyyy-MM-dd')
                  const dow = d.getDay()
                  return (
                    <button key={ds} onClick={() => setDate(ds)}
                      style={{ width: 28, height: 28, border: `1px solid ${ds===date?'#2563eb':'#e5e7eb'}`, borderRadius: 4, fontSize: 11, cursor: 'pointer',
                        background: ds===date?'#2563eb':'#fff',
                        color: ds===date?'#fff':dow===0?'#dc2626':dow===6?'#2563eb':'#374151' }}>
                      {format(d,'d')}
                    </button>
                  )
                })}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button style={{ padding: '4px 10px', border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', fontSize: 11, cursor: 'pointer' }}>シフト設定</button>
                  <button style={{ padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>＋ 予約追加</button>
                  <button style={{ padding: '4px 10px', border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', fontSize: 11, cursor: 'pointer' }}>設定</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'customers' && (
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 4, padding: '6px 10px', fontSize: 12 }} placeholder="お客様名・電話番号で検索"/>
                <button style={{ padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>＋ 新規登録</button>
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>全 284 件</div>
              {[
                { init:'田', name:'田中 花子', sub:'最終来店: 6/28　累計12回', line:true, badge:'本日予約あり', ok:true },
                { init:'佐', name:'佐藤 美穂', sub:'最終来店: 5/15　累計5回', line:true, badge:'本日予約あり', ok:true },
                { init:'高', name:'高橋 翔太', sub:'最終来店: 4/02　累計3回', line:false, badge:'LINE未登録', ok:false },
                { init:'伊', name:'伊藤 さくら', sub:'最終来店: 6/28　累計8回', line:true, badge:'本日予約あり', ok:true },
              ].map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid #e5e7eb', cursor: 'pointer', background: '#fff', marginBottom: 1, borderRadius: 4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.line?'#dbeafe':'#f3f4f6', color: c.line?'#1d4ed8':'#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{c.init}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name} {c.line && <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 10, padding: '1px 6px', borderRadius: 3 }}>LINE</span>}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{c.sub}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500, background: c.ok?'#f0fdf4':'#fefce8', color: c.ok?'#16a34a':'#ca8a04' }}>{c.badge}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'sales' && (
            <div style={{ padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
                {[['¥42,000','本日売上見込'],['¥680,000','今月累計'],['¥14,000','客単価'],['87%','再来率']].map(([v,l]) => (
                  <div key={l} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>{v}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    {['お客様','メニュー','担当','決済','金額'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#9ca3af', fontWeight: 500 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '9px 10px' }}>{r.customers?.name||'お客様'}</td>
                      <td style={{ padding: '9px 10px' }}>{r.menus?.name}</td>
                      <td style={{ padding: '9px 10px' }}>{r.staff?.name}</td>
                      <td style={{ padding: '9px 10px' }}><span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>クレジット</span></td>
                      <td style={{ padding: '9px 10px', fontWeight: 500 }}>¥{r.menus?.price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 予約詳細モーダル */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 20, width: 280, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>予約詳細</div>
              <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>
            {[
              ['お客様', selected.customers?.name||'未登録'],
              ['メニュー', selected.menus?.name],
              ['時間', `${selected.start_time.slice(11,16)}〜${selected.end_time.slice(11,16)}`],
              ['担当', selected.staff?.name],
              ['金額', `¥${selected.menus?.price.toLocaleString()}〜`],
              ['LINE', selected.customers?.line_user_id?'登録済み':'未登録'],
            ].map(([l,v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                <span style={{ color: '#9ca3af' }}>{l}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={{ flex: 1, padding: 8, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>編集</button>
              <button onClick={async () => {
                await fetch('/api/reservations', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id:selected.id,status:'cancelled'}) })
                setSelected(null); load()
              }} style={{ flex: 1, padding: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
