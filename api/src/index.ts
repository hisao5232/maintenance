import { Hono } from "hono"
import { cors } from "hono/cors"
import { sign, verify } from "hono/jwt"

type Bindings = {
  DB: D1Database
  USERNAME: string   // 環境変数（wrangler.tomlで設定）
  PASSWORD: string   // 環境変数
  JWT_SECRET: string // 環境変数
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
app.use("/api/*", authMiddleware)

// --- 全件取得 ---
app.get("/api/records", async (c) => {
  const { results } = await c.env.DB
    .prepare("SELECT id, category, date, model_name, serial_number, content FROM maintenance_records ORDER BY date DESC")
    .all()
  return c.json(results)
})

// --- キーワード検索 ---
app.get("/api/records/search", async (c) => {
  const q        = c.req.query("q") ?? ""
  const category = c.req.query("category") ?? ""

  let sql = "SELECT id, category, date, model_name, serial_number, content FROM maintenance_records WHERE (model_name LIKE ? OR serial_number LIKE ? OR content LIKE ?)"
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
    serial_number?: string; content: string
  }>()
  if (!body.category || !body.date || !body.model_name || !body.content) {
    return c.json({ error: "必須項目が不足しています" }, 400)
  }
  await c.env.DB
    .prepare("INSERT INTO maintenance_records (category, date, model_name, serial_number, content) VALUES (?, ?, ?, ?, ?)")
    .bind(body.category, body.date, body.model_name, body.serial_number ?? null, body.content)
    .run()
  return c.json({ success: true }, 201)
})

// --- 更新 ---
app.put("/api/records/:id", async (c) => {
  const id   = c.req.param("id")
  const body = await c.req.json<{
    category: string; date: string; model_name: string
    serial_number?: string; content: string
  }>()
  await c.env.DB
    .prepare("UPDATE maintenance_records SET category=?, date=?, model_name=?, serial_number=?, content=? WHERE id=?")
    .bind(body.category, body.date, body.model_name, body.serial_number ?? null, body.content, id)
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

export default app
