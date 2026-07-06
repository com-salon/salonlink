import { Client } from '@line/bot-sdk'

export const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
})

export function buildConfirmMessage(params: {
  stylist: string; menu: string; date: string; time: string; reservationId: string; price: number
}) {
  return {
    type: 'flex' as const,
    altText: `予約が確定しました（${params.date} ${params.time}〜）`,
    contents: {
      type: 'bubble' as const,
      header: {
        type: 'box' as const, layout: 'vertical' as const,
        backgroundColor: '#06C755',
        contents: [{ type: 'text' as const, text: '予約確定', color: '#ffffff', weight: 'bold' as const, size: 'lg' as const }]
      },
      body: {
        type: 'box' as const, layout: 'vertical' as const, spacing: 'sm' as const,
        contents: [
          { type: 'text' as const, text: `予約番号: #${params.reservationId.slice(-6).toUpperCase()}`, size: 'xs' as const, color: '#888888' },
          { type: 'separator' as const, margin: 'sm' as const },
          { type: 'box' as const, layout: 'horizontal' as const, contents: [{ type: 'text' as const, text: '日時', size: 'sm' as const, color: '#555555', flex: 2 }, { type: 'text' as const, text: `${params.date} ${params.time}〜`, size: 'sm' as const, color: '#111111', flex: 3, wrap: true }] },
          { type: 'box' as const, layout: 'horizontal' as const, contents: [{ type: 'text' as const, text: '担当', size: 'sm' as const, color: '#555555', flex: 2 }, { type: 'text' as const, text: params.stylist, size: 'sm' as const, color: '#111111', flex: 3, wrap: true }] },
          { type: 'box' as const, layout: 'horizontal' as const, contents: [{ type: 'text' as const, text: 'メニュー', size: 'sm' as const, color: '#555555', flex: 2 }, { type: 'text' as const, text: params.menu, size: 'sm' as const, color: '#111111', flex: 3, wrap: true }] },
          { type: 'box' as const, layout: 'horizontal' as const, contents: [{ type: 'text' as const, text: '料金目安', size: 'sm' as const, color: '#555555', flex: 2 }, { type: 'text' as const, text: `¥${params.price.toLocaleString()}〜`, size: 'sm' as const, color: '#111111', flex: 3, wrap: true }] },
        ]
      },
      footer: {
        type: 'box' as const, layout: 'vertical' as const,
        contents: [{
          type: 'button' as const, style: 'secondary' as const,
          action: { type: 'message' as const, label: '予約確認', text: '予約確認' }
        }]
      }
    }
  }
}

export function buildCheckMessage(reservations: {
  date: string; time: string; stylist: string; menu: string; status: string
}[]) {
  if (reservations.length === 0) {
    return { type: 'text' as const, text: '現在ご予約はございません。\n「予約する」からご予約いただけます。' }
  }
  const r = reservations[0]
  return {
    type: 'flex' as const,
    altText: `ご予約: ${r.date} ${r.time}〜`,
    contents: {
      type: 'bubble' as const,
      header: {
        type: 'box' as const, layout: 'vertical' as const, backgroundColor: '#1a3a5c',
        contents: [{ type: 'text' as const, text: 'ご予約内容', color: '#ffffff', weight: 'bold' as const, size: 'md' as const }]
      },
      body: {
        type: 'box' as const, layout: 'vertical' as const, spacing: 'sm' as const,
        contents: [
          { type: 'box' as const, layout: 'horizontal' as const, contents: [{ type: 'text' as const, text: '日時', size: 'sm' as const, color: '#555555', flex: 2 }, { type: 'text' as const, text: `${r.date} ${r.time}〜`, size: 'sm' as const, color: '#111111', flex: 3, wrap: true }] },
          { type: 'box' as const, layout: 'horizontal' as const, contents: [{ type: 'text' as const, text: '担当', size: 'sm' as const, color: '#555555', flex: 2 }, { type: 'text' as const, text: r.stylist, size: 'sm' as const, color: '#111111', flex: 3, wrap: true }] },
          { type: 'box' as const, layout: 'horizontal' as const, contents: [{ type: 'text' as const, text: 'メニュー', size: 'sm' as const, color: '#555555', flex: 2 }, { type: 'text' as const, text: r.menu, size: 'sm' as const, color: '#111111', flex: 3, wrap: true }] },
          { type: 'box' as const, layout: 'horizontal' as const, contents: [{ type: 'text' as const, text: 'ステータス', size: 'sm' as const, color: '#555555', flex: 2 }, { type: 'text' as const, text: r.status === 'confirmed' ? '確定済み' : r.status, size: 'sm' as const, color: '#111111', flex: 3, wrap: true }] },
        ]
      },
      footer: {
        type: 'box' as const, layout: 'vertical' as const,
        contents: [{
          type: 'button' as const, style: 'secondary' as const, color: '#dc2626',
          action: { type: 'uri' as const, label: '変更・キャンセルはお電話で', uri: 'tel:011XXXXXXX' }
        }]
      }
    }
  }
}
