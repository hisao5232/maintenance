import type { Metadata, Viewport } from "next"
import "./globals.css"
import Header from "./components/Header"
import Footer from "./components/Footer"

export const viewport: Viewport = {
  themeColor: "#f59e0b",  // ブラウザのテーマカラー（アドレスバーがオレンジに）
}

export const metadata: Metadata = {
  title: "Heavy Equipment Service Log",
  description: "重機整備記録システム",
  manifest: "/manifest.json",  // PWA設定ファイル
  appleWebApp: {
    capable: true,
    title: "Service Log",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <Header />
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
