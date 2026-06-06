"use client"

import { useState } from "react"

// 整備記録の型定義
type Record = {
  id: number
  category: string
  date: string
  model_name: string
  serial_number: string | null
  content: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function HomePage() {
  // 検索関連のstate
  const [query, setQuery]       = useState("")
  const [category, setCategory] = useState("")
  const [results, setResults]   = useState<Record[]>([])
  const [searched, setSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // 登録フォーム関連のstate
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [form, setForm] = useState({
    category: "整備系",
    date: "",
    model_name: "",
    serial_number: "",
    content: "",
  })

  // 検索実行
  const handleSearch = async () => {
    setIsSearching(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({ q: query, category })
      const res = await fetch(`${API_URL}/api/records/search?${params}`)
      const data = await res.json()
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // フォーム入力変更
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // 新規登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveMessage("")
    try {
      const res = await fetch(`${API_URL}/api/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          serial_number: form.serial_number || null,
        }),
      })
      if (res.ok) {
        setSaveMessage("登録しました！")
        // フォームをリセット
        setForm({ category: "整備系", date: "", model_name: "", serial_number: "", content: "" })
        // 登録後に検索結果を更新
        await handleSearch()
      } else {
        setSaveMessage("登録に失敗しました")
      }
    } catch {
      setSaveMessage("エラーが発生しました")
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    // Cookieを削除
    document.cookie = "token=; path=/; max-age=0"
    window.location.href = "/login"
  }

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">整備記録システム</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-500"
        >
          ログアウト
        </button>
      </div>

      {/* 検索フォーム */}
      <section className="bg-white rounded-lg shadow p-4 space-y-3">
        <h2 className="font-bold text-gray-700">🔍 検索</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="機種名・シリアル番号・内容で検索..."
            className="border rounded px-3 py-2 flex-1 text-sm"
          />
          {/* カテゴリ絞り込み */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">全カテゴリ</option>
            <option value="整備系">整備系</option>
            <option value="マニュアル系">マニュアル系</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {isSearching ? "検索中..." : "検索"}
          </button>
        </div>

        {/* 検索結果 */}
        {searched && (
          <div className="space-y-2 pt-2">
            {results.length === 0 ? (
              <p className="text-gray-400 text-sm">該当なし</p>
            ) : (
              results.map((r) => (
                <div key={r.id} className="border rounded p-3 space-y-1 bg-gray-50">
                  <div className="flex items-center gap-2">
                    {/* カテゴリバッジ */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.category === "整備系"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {r.category}
                    </span>
                    <span className="font-bold text-gray-800">{r.model_name}</span>
                    {r.serial_number && (
                      <span className="text-xs text-gray-500">#{r.serial_number}</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{r.date}</span>
                  </div>
                  {/* 改行を保持して表示 */}
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* 新規登録フォーム（トグル） */}
      <section className="bg-white rounded-lg shadow p-4 space-y-3">
        <button
          onClick={() => setShowForm(!showForm)}
          className="font-bold text-gray-700 w-full text-left"
        >
          {showForm ? "▼" : "▶"} ✏️ 新規登録
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              {/* カテゴリ選択 */}
              <select
                name="category"
                value={form.category}
                onChange={handleFormChange}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="整備系">整備系</option>
                <option value="マニュアル系">マニュアル系</option>
              </select>
              {/* 日付 */}
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleFormChange}
                required
                className="border rounded px-3 py-2 text-sm flex-1"
              />
            </div>
            <div className="flex gap-2">
              {/* 機種名 */}
              <input
                name="model_name"
                type="text"
                value={form.model_name}
                onChange={handleFormChange}
                required
                placeholder="機種名"
                className="border rounded px-3 py-2 text-sm flex-1"
              />
              {/* シリアル番号（任意） */}
              <input
                name="serial_number"
                type="text"
                value={form.serial_number}
                onChange={handleFormChange}
                placeholder="シリアル番号（任意）"
                className="border rounded px-3 py-2 text-sm flex-1"
              />
            </div>
            {/* 内容 */}
            <textarea
              name="content"
              value={form.content}
              onChange={handleFormChange}
              required
              placeholder="整備内容・メモ"
              rows={4}
              className="border rounded px-3 py-2 text-sm w-full"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
              >
                {isSaving ? "登録中..." : "登録"}
              </button>
              {saveMessage && (
                <p className="text-sm text-green-600">{saveMessage}</p>
              )}
            </div>
          </form>
        )}
      </section>

    </main>
  )
}
