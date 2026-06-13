import { Hono } from "hono"
import { cors } from "hono/cors"
import { sign, verify } from "hono/jwt"

type Bindings = {
  DB: D1Database
  USERNAME: string   // 環境変数（wrangler.tomlで設定）
  PASSWORD: string   // 環境変数
  JWT_SECRET: string // 環境変数
  IMAGES: R2Bucket // 画像保存用R2バケット
}

const app = new Hono<{ Bindings: Bindings }>()

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}))

// --- 認証ミドルウェア ---
// /api/records/* へのリクエストはJWT検証が必要
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "認証が必要です" }, 401)
  }
  const token = authHeader.replace("Bearer ", "")
  try {
    await verify(token, c.env.JWT_SECRET, "HS256")
    await next()
  } catch {
    return c.json({ error: "トークンが無効です" }, 401)
  }
}

// --- ログイン ---
// POST /auth/login
app.post("/auth/login", async (c) => {
  const { username, password } = await c.req.json<{
    username: string
    password: string
  }>()

  // 環境変数と照合
  if (username !== c.env.USERNAME || password !== c.env.PASSWORD) {
    return c.json({ error: "IDまたはパスワードが違います" }, 401)
  }

  // JWTトークン発行（24時間有効）
  const token = await sign(
    { sub: username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 },
    c.env.JWT_SECRET,
    "HS256"
  )

  return c.json({ token })
})

// 以下のルートは認証が必要
app.use("/api/records*", authMiddleware)  // レコードのみ認証必要
app.use("/api/images", authMiddleware)    // アップロードは認証必要

// --- 全件取得 ---
app.get("/api/records", async (c) => {
  const { results } = await c.env.DB
    .prepare("SELECT id, category, date, model_name, serial_number, content, image_url FROM maintenance_records ORDER BY date DESC")
    .all()
  return c.json(results)
})

// --- キーワード検索 ---
app.get("/api/records/search", async (c) => {
  const q        = c.req.query("q") ?? ""
  const category = c.req.query("category") ?? ""

  let sql = "SELECT id, category, date, model_name, serial_number, content, image_url FROM maintenance_records WHERE (model_name LIKE ? OR serial_number LIKE ? OR content LIKE ?)"
  let params: string[] = [`%${q}%`, `%${q}%`, `%${q}%`]

  if (category) {
    sql += " AND category = ?"
    params.push(category)
  }
  sql += " ORDER BY date DESC"

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(results)
})

// --- 1件取得 ---
app.get("/api/records/:id", async (c) => {
  const id = c.req.param("id")
  const record = await c.env.DB
    .prepare("SELECT * FROM maintenance_records WHERE id = ?")
    .bind(id).first()
  if (!record) return c.json({ error: "見つかりません" }, 404)
  return c.json(record)
})

// --- 新規登録 ---
app.post("/api/records", async (c) => {
  const body = await c.req.json<{
    category: string; date: string; model_name: string
    serial_number?: string; content: string; image_url?: string
  }>()
  if (!body.category || !body.date || !body.model_name || !body.content) {
    return c.json({ error: "必須項目が不足しています" }, 400)
  }
  await c.env.DB
    .prepare("INSERT INTO maintenance_records (category, date, model_name, serial_number, content, image_url) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(body.category, body.date, body.model_name, body.serial_number ?? null, body.content, body.image_url ?? null)
    .run()
  return c.json({ success: true }, 201)
})

// --- 更新 ---
app.put("/api/records/:id", async (c) => {
  const id   = c.req.param("id")
  const body = await c.req.json<{
    category: string; date: string; model_name: string
    serial_number?: string; content: string; image_url?: string  // 追加
  }>()
  await c.env.DB
    .prepare("UPDATE maintenance_records SET category=?, date=?, model_name=?, serial_number=?, content=?, image_url=? WHERE id=?")
    .bind(body.category, body.date, body.model_name, body.serial_number ?? null, body.content, body.image_url ?? null, id)
    .run()
  return c.json({ success: true })
})

// --- 削除 ---
app.delete("/api/records/:id", async (c) => {
  const id = c.req.param("id")
  await c.env.DB
    .prepare("DELETE FROM maintenance_records WHERE id = ?")
    .bind(id).run()
  return c.json({ success: true })
})

// --- 画像アップロード ---
// POST /api/images
app.post("/api/images", async (c) => {
  const formData = await c.req.formData()
  const file = formData.get("image") as File | null

  if (!file) {
    return c.json({ error: "画像ファイルがありません" }, 400)
  }

  // ファイルサイズチェック（10MB以下）
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ error: "ファイルサイズは10MB以下にしてください" }, 400)
  }

  // 拡張子チェック
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: "JPG/PNG/WEBP/GIFのみ対応しています" }, 400)
  }

  // ユニークなファイル名を生成（タイムスタンプ + ランダム）
  const ext = file.name.split(".").pop() ?? "jpg"
  const key = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  // R2にアップロード
  await c.env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  })

  // 公開URLを返す（Workers経由で配信）
  const url = `/api/images/${key}`
  return c.json({ url }, 201)
})

// --- 画像取得 ---
// GET /api/images/:key
app.get("/api/images/:key", async (c) => {
  const key = c.req.param("key")
  const obj = await c.env.IMAGES.get(key)

  if (!obj) return c.json({ error: "画像が見つかりません" }, 404)

  // 画像をそのまま返す
  const headers = new Headers()
  headers.set("Content-Type", obj.httpMetadata?.contentType ?? "image/jpeg")
  headers.set("Cache-Control", "public, max-age=31536000") // 1年キャッシュ

  return new Response(obj.body, { headers })
})

// --- 画像削除 ---
// DELETE /api/images/:key
app.delete("/api/images/:key", async (c) => {
  const key = c.req.param("key")
  await c.env.IMAGES.delete(key)
  return c.json({ success: true })
})

// --- ストレージ使用量 ---
// GET /api/storage
app.get("/api/storage", async (c) => {
  // D1のレコード数とおおよそのサイズを取得
  const countResult = await c.env.DB
    .prepare("SELECT COUNT(*) as count FROM maintenance_records")
    .first<{ count: number }>()

  const sizeResult = await c.env.DB
    .prepare("SELECT SUM(LENGTH(content) + LENGTH(COALESCE(model_name,'')) + LENGTH(COALESCE(serial_number,'')) + LENGTH(COALESCE(image_url,'')) + LENGTH(COALESCE(category,''))) as total_size FROM maintenance_records")
    .first<{ total_size: number }>()

  // R2のオブジェクト一覧からサイズを計算
  const r2List = await c.env.IMAGES.list()
  const r2Size = r2List.objects.reduce((acc, obj) => acc + obj.size, 0)

  return c.json({
    d1: {
      records: countResult?.count ?? 0,
      // D1の概算サイズ（バイト）
      used_bytes: sizeResult?.total_size ?? 0,
      // 無料枠: 5GB
      limit_bytes: 5 * 1024 * 1024 * 1024,
    },
    r2: {
      // R2の実際の使用サイズ（バイト）
      used_bytes: r2Size,
      // 無料枠: 10GB
      limit_bytes: 10 * 1024 * 1024 * 1024,
      object_count: r2List.objects.length,
    },
  })
})

export default app
