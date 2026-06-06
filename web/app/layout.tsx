import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "整備記録システム",
  description: "重機整備記録の検索・登録",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}
