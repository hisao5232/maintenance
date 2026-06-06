export const runtime = 'edge'  // Cloudflare Pages用にEdge Runtimeを指定

import { NextRequest, NextResponse } from "next/server"

export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value

  // ログインページはスルー
  if (request.nextUrl.pathname === "/login") {
    // すでにログイン済みならトップへ
    if (token) return NextResponse.redirect(new URL("/", request.url))
    return NextResponse.next()
  }

  // トークンがなければログインページへリダイレクト
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

// proxyを適用するパス
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
