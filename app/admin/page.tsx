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

const COLORS = ['bg-blue-100 border-blue-400 text-blue-800', 'bg-pink-100 border-pink-400 text-pink-800', 'bg-green-100 border-green-400 text-green-800', 'bg-amber-100 border-amber-400 text-amber-800']
const SYMBOL = { open: '〇', closed: '✕', booked: '△', store_full: '✕' }
const SYM_COLOR = { open: 'text-green-600', closed: 'text-red-500', booked: 'text-yellow-500', store_full: 'text-red-500' }

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

  const toggleSlot = async (staffId: string, slot: string, current: SlotStatus['status']) => {
    if (current === 'booked') return
    const isOpen = current !== 'open'
    await fetch('/api/slots', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId, date, timeSlot: slot, isOpen }) })
    load()
  }

  const dateLabel = format(new Date(date + 'T00:00:00'), 'M月d日（E）', { locale: ja })

  const getApptForStaff = (staffId: string) =>
    reservations.filter(r => r.staff.id === staffId)

  const getApptStyle = (r: Reservation, allSlots: string[]) => {
    const startSlot = r.start_time.slice(11, 16)
    const endSlot   = r.end_time.slice(11, 16)
    const si = allSlots.indexOf(startSlot)
    const ei = allSlots.findIndex(s => s >= endSlot)
    const span = ei < 0 ? allSlots.length - si : ei - si
    return { gridColumn: `${si + 1} / span ${Math.max(span, 1)}` }
  }

  const storeSymbol = (slot: string) => {
    const c = capacity[slot] || 0
    if (c >= chairCount) return { sym: '✕', cls: 'text-red-500' }
    if (c === chairCount - 1) return { sym: '△', cls: 'text-yellow-500' }
    return { sym: '〇', cls: 'text-green-600' }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-sm">
      {/* サイドバー */}
      <aside className="w-44 bg-[#1a3a5c] flex flex-col text-white flex-shrink-0">
        <div className="p-4 border-b border-white/10">
          <div className="font-medium">SalonLink</div>
          <div className="text-xs text-white/50 mt-0.5">COM【コム】</div>
        </div>
        <nav className="p-2 flex-1 space-y-0.5">
          {(['schedule','customers','sales'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center gap-2 transition-colors
                ${tab === t ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white'}`}>
              {t === 'schedule' ? '📅' : t === 'customers' ? '👥' : '💴'}
              {t === 'schedule' ? '予約管理' : t === 'customers' ? 'お客様管理' : '売上管理'}
            </button>
          ))}
        </nav>
        <div className="m-2 bg-white/8 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block"/>
            <span className="text-white font-medium">サロンボード同期中</span>
          </div>
          <div className="text-white/50">最終同期: 2分前</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* トップバー */}
        {tab === 'schedule' && (
          <header className="flex items-center gap-2 px-4 py-2 border-b bg-white flex-shrink-0">
            <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs">今日</button>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setDate(format(addDays(new Date(date+'T00:00:00'), -1), 'yyyy-MM-dd'))}
                className="w-6 h-6 border rounded flex items-center justify-center text-gray-500 hover:bg-gray-50">‹</button>
              <span className="text-sm font-medium w-36 text-center">{dateLabel}</span>
              <button onClick={() => setDate(format(addDays(new Date(date+'T00:00:00'), 1), 'yyyy-MM-dd'))}
                className="w-6 h-6 border rounded flex items-center justify-center text-gray-500 hover:bg-gray-50">›</button>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-xs text-gray-500">カット台数</span>
              <button onClick={() => setChairCount(c => Math.max(1, c-1))} className="w-5 h-5 border rounded text-xs flex items-center justify-center">−</button>
              <span className="font-medium w-4 text-center">{chairCount}</span>
              <button onClick={() => setChairCount(c => c+1)} className="w-5 h-5 border rounded text-xs flex items-center justify-center">+</button>
            </div>
            <div className="ml-auto flex gap-2">
              <button className="px-3 py-1.5 border rounded text-xs">印刷</button>
              <button className="px-3 py-1.5 bg-red-600 text-white rounded text-xs">＋ 新規予約</button>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-auto">
          {tab === 'schedule' && (
            <div>
              {/* サマリー */}
              <div className="grid grid-cols-4 gap-2 p-3 border-b bg-gray-50">
                {[
                  { val: reservations.length, lbl: '本日の予約' },
                  { val: slots.filter(s => !capacity[s] || capacity[s] < chairCount).length, lbl: '残り空き枠' },
                  { val: `¥${reservations.reduce((s,r) => s + (r.menus?.price || 0), 0).toLocaleString()}`, lbl: '本日売上見込' },
                  { val: `${chairCount}台`, lbl: 'カット台稼働' },
                ].map(({ val, lbl }) => (
                  <div key={lbl} className="bg-white border rounded-lg p-3">
                    <div className="text-lg font-medium">{val}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{lbl}</div>
                  </div>
                ))}
              </div>

              {/* グリッド */}
              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  {/* ヘッダー */}
                  <div className="grid border-b bg-gray-50" style={{ gridTemplateColumns: `80px repeat(${slots.length}, 1fr)` }}>
                    <div className="px-2 py-2 text-xs text-gray-400 border-r">スタッフ</div>
                    {slots.map(s => <div key={s} className="text-center py-2 text-xs text-gray-400 border-r">{s}</div>)}
                  </div>

                  {/* 店舗全体行 */}
                  <div className="grid border-b bg-blue-50" style={{ gridTemplateColumns: `80px repeat(${slots.length}, 1fr)` }}>
                    <div className="px-2 py-2 border-r">
                      <div className="text-xs font-medium text-blue-700">店舗全体</div>
                      <div className="text-xs text-blue-400">/{chairCount}台</div>
                    </div>
                    {slots.map(s => {
                      const { sym, cls } = storeSymbol(s)
                      return <div key={s} className={`flex items-center justify-center border-r text-sm font-medium ${cls}`} style={{ minHeight: 36 }}>{sym}</div>
                    })}
                  </div>

                  {/* スタッフ行 */}
                  {staffSlots.map((ss, idx) => {
                    const appts = getApptForStaff(ss.staff.id)
                    return (
                      <div key={ss.staff.id} className="border-b">
                        <div className="grid" style={{ gridTemplateColumns: `80px repeat(${slots.length}, 1fr)` }}>
                          <div className="px-2 py-2 border-r flex flex-col justify-center" style={{ minHeight: 52 }}>
                            <div className="text-xs font-medium text-gray-800">{ss.staff.name}</div>
                            <div className="text-xs text-gray-400">{ss.staff.role}</div>
                          </div>
                          {/* タイムライン（相対配置でapptを重ねる） */}
                          <div className="relative col-span-full" style={{ display: 'grid', gridTemplateColumns: `repeat(${slots.length}, 1fr)`, minHeight: 52 }}>
                            {ss.slots.map(sl => (
                              <div key={sl.slot}
                                onClick={() => toggleSlot(ss.staff.id, sl.slot, sl.status)}
                                className={`border-r flex items-center justify-center text-xs font-medium cursor-pointer transition-colors
                                  ${sl.status === 'closed' ? 'bg-gray-100' : 'hover:bg-gray-50'}
                                  ${sl.status !== 'booked' ? SYM_COLOR[sl.status] : ''}`}
                                style={{ minHeight: 52 }}>
                                {sl.status !== 'booked' && <span>{SYMBOL[sl.status]}</span>}
                              </div>
                            ))}
                            {/* 予約ブロック */}
                            {appts.map(r => (
                              <div key={r.id}
                                onClick={() => setSelected(r)}
                                className={`absolute top-1.5 rounded border-l-2 px-1.5 py-1 text-xs cursor-pointer z-10 overflow-hidden ${COLORS[idx % COLORS.length]}`}
                                style={{ ...getApptStyle(r, slots), bottom: 6, left: 2, right: 2, position: 'absolute',
                                  gridColumn: getApptStyle(r, slots).gridColumn,
                                  left: `calc(${slots.indexOf(r.start_time.slice(11,16))} / ${slots.length} * 100%)`,
                                  width: `calc(${Math.max(1, slots.findIndex(s => s >= r.end_time.slice(11,16)) - slots.indexOf(r.start_time.slice(11,16)))} / ${slots.length} * 100% - 4px)`
                                }}>
                                <div className="font-medium truncate">{r.customers?.name || 'お客様'}</div>
                                <div className="truncate opacity-75">{r.menus?.name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 日付ナビ */}
              <div className="flex items-center gap-1 px-4 py-2 border-t bg-white flex-wrap">
                {Array.from({ length: 10 }, (_, i) => {
                  const d = addDays(new Date(), i - 2)
                  const ds = format(d, 'yyyy-MM-dd')
                  const lbl = format(d, 'd')
                  const dow = d.getDay()
                  return (
                    <button key={ds} onClick={() => setDate(ds)}
                      className={`w-7 h-7 rounded text-xs border flex items-center justify-center
                        ${ds === date ? 'bg-blue-600 text-white border-blue-600' :
                          dow === 0 ? 'text-red-500 border-gray-200' :
                          dow === 6 ? 'text-blue-500 border-gray-200' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      {lbl}
                    </button>
                  )
                })}
                <div className="ml-auto flex gap-2">
                  <button className="px-2 py-1 border rounded text-xs">設定</button>
                  <button className="px-2 py-1 bg-red-600 text-white rounded text-xs">＋ 予約追加</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'customers' && (
            <div className="p-4">
              <div className="flex gap-2 mb-3">
                <input className="flex-1 border rounded px-3 py-1.5 text-xs" placeholder="お客様名・電話番号で検索"/>
                <button className="px-3 py-1.5 bg-red-600 text-white rounded text-xs">＋ 新規登録</button>
              </div>
              <div className="text-xs text-gray-400 mb-2">全 284 件</div>
              {[
                { init: '田', name: '田中 花子', sub: '最終来店: 6/28　累計12回', line: true, badge: '本日予約あり', badgeOk: true },
                { init: '佐', name: '佐藤 美穂', sub: '最終来店: 5/15　累計5回',  line: true, badge: '本日予約あり', badgeOk: true },
                { init: '高', name: '高橋 翔太', sub: '最終来店: 4/02　累計3回',  line: false, badge: 'LINE未登録', badgeOk: false },
                { init: '伊', name: '伊藤 さくら', sub: '最終来店: 6/28　累計8回', line: true, badge: '本日予約あり', badgeOk: true },
              ].map(c => (
                <div key={c.name} className="flex items-center gap-3 px-3 py-2.5 border-b hover:bg-gray-50 cursor-pointer">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${c.line ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>{c.init}</div>
                  <div className="flex-1">
                    <div className="text-xs font-medium">{c.name} {c.line && <span className="bg-[#06c75520] text-[#059c40] text-xs px-1.5 py-0.5 rounded">LINE</span>}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badgeOk ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>{c.badge}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'sales' && (
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[['¥42,000','本日売上見込'],['¥680,000','今月累計'],['¥14,000','客単価（今月）'],['87%','再来率']].map(([v,l]) => (
                  <div key={l} className="bg-white border rounded-lg p-3">
                    <div className="text-lg font-medium">{v}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b">
                    {['お客様','メニュー','担当','決済','金額'].map(h => <th key={h} className="text-left py-2 px-3 text-gray-400 font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">{r.customers?.name || 'お客様'}</td>
                      <td className="py-2 px-3">{r.menus?.name}</td>
                      <td className="py-2 px-3">{r.staff?.name}</td>
                      <td className="py-2 px-3"><span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full">クレジット</span></td>
                      <td className="py-2 px-3 font-medium">¥{r.menus?.price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* 予約詳細モーダル */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl border p-5 w-72" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium">予約詳細</div>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-lg leading-none">×</button>
            </div>
            {[
              ['お客様', selected.customers?.name || '未登録'],
              ['メニュー', selected.menus?.name],
              ['時間', `${selected.start_time.slice(11,16)}〜${selected.end_time.slice(11,16)}`],
              ['担当', selected.staff?.name],
              ['金額', `¥${selected.menus?.price.toLocaleString()}〜`],
              ['LINE', selected.customers?.line_user_id ? '登録済み' : '未登録'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5 border-b text-xs last:border-none">
                <span className="text-gray-400">{l}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 bg-blue-600 text-white rounded text-xs">編集</button>
              <button onClick={async () => {
                await fetch('/api/reservations', { method: 'PATCH', headers: {'Content-Type':'application/json'},
                  body: JSON.stringify({ id: selected.id, status: 'cancelled' }) })
                setSelected(null); load()
              }} className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded text-xs">キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
