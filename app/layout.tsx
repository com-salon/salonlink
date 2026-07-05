import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SalonLink 管理',
  description: 'LINE予約 × サロンボード連携の美容室予約管理システム',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
