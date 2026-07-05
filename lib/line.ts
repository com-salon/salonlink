import { Client, FlexMessage, TextMessage } from '@line/bot-sdk'

export const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
})

// 予約確定メッセージ（Flexメッセージ）
export function buildConfirmMessage(params: {
  stylist: string
  menu: string
  date: string
  time: string
  reservationId: string
  price: number
}): FlexMessage {
  return {
    type: 'flex',
    altText: `予約が確定しました（${params.date} ${params.time}〜）`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#06C755',
        contents: [{
          type: 'text', text: '予約確定', color: '#ffffff',
          weight: 'bold', size: 'lg'
        }]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          { type: 'text', text: `予約番号: #${params.reservationId.slice(-6).toUpperCase()}`, size: 'xs', color: '#888888' },
          { type: 'separator', margin: 'sm' },
          row('日時', `${params.date} ${params.time}〜`),
          row('担当', params.stylist),
          row('メニュー', params.menu),
          row('料金目安', `¥${params.price.toLocaleString()}〜`),
        ]
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [{
          type: 'button', style: 'secondary',
          action: { type: 'message', label: '予約確認', text: '予約確認' }
        }]
      }
    }
  }
}

function row(label: string, value: string) {
  return {
    type: 'box', layout: 'horizontal',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#555555', flex: 2 },
      { type: 'text', text: value, size: 'sm', color: '#111111', flex: 3, wrap: true }
    ]
  }
}

// 予約確認メッセージ
export function buildCheckMessage(reservations: {
  date: string; time: string; stylist: string; menu: string; status: string
}[]): TextMessage | FlexMessage {
  if (reservations.length === 0) {
    return { type: 'text', text: '現在ご予約はございません。\n「予約する」からご予約いただけます。' }
  }
  const r = reservations[0]
  return {
    type: 'flex',
    altText: `ご予約: ${r.date} ${r.time}〜`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#1a3a5c',
        contents: [{ type: 'text', text: 'ご予約内容', color: '#ffffff', weight: 'bold', size: 'md' }]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          row('日時', `${r.date} ${r.time}〜`),
          row('担当', r.stylist),
          row('メニュー', r.menu),
          row('ステータス', r.status === 'confirmed' ? '確定済み' : r.status),
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [{
          type: 'button', style: 'secondary', color: '#dc2626',
          action: { type: 'uri', label: '変更・キャンセルはお電話で', uri: 'tel:011XXXXXXX' }
        }]
      }
    }
  }
}

// リッチメニューのボタン定義（LINE Developersで設定する内容）
export const RICH_MENU_TEMPLATE = {
  size: { width: 2500, height: 843 },
  selected: true,
  name: 'SalonLink メインメニュー',
  chatBarText: 'メニュー',
  areas: [
    { bounds: { x: 0,    y: 0, width: 833, height: 843 }, action: { type: 'message', text: '予約する' } },
    { bounds: { x: 833,  y: 0, width: 834, height: 843 }, action: { type: 'message', text: '予約確認' } },
    { bounds: { x: 1667, y: 0, width: 833, height: 843 }, action: { type: 'uri',     uri: 'tel:011XXXXXXX' } },
  ]
}
