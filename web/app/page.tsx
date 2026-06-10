"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import styles from "./page.module.css"

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
  const router = useRouter()

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1]
    if (!token) router.replace("/login")
  }, [router])

  const [query, setQuery]       = useState("")
  const [category, setCategory] = useState("")
  const [results, setResults]   = useState<Record[]>([])
  const [searched, setSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
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
  const [modal, setModal] = useState<{
    show: boolean
    status: number | null
    ok: boolean
    message: string
  } | null>(null)

  const getToken = () =>
    document.cookie.split("; ").find((r) => r.startsWith("token="))?.split("=")[1] ?? ""

  const handleSearch = async () => {
    setIsSearching(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({ q: query, category })
      const res = await fetch(`${API_URL}/api/records/search?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      setResults(await res.json())
    } catch {
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const res = await fetch(`${API_URL}/api/records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...form, serial_number: form.serial_number || null }),
      })

      // モーダルを表示（ステータスコード・成功可否）
      setModal({
        show: true,
        status: res.status,
        ok: res.ok,
        message: res.ok ? "RECORD SAVED TO DATABASE" : "FAILED TO SAVE RECORD",
      })

      if (res.ok) {
        setForm({ category: "整備系", date: "", model_name: "", serial_number: "", content: "" })
      }

      // 1秒後にモーダルを閉じる
      setTimeout(() => setModal(null), 2000)

    } catch {
      setModal({
        show: true,
        status: null,
        ok: false,
        message: "CONNECTION FAILED",
      })
      setTimeout(() => setModal(null), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.page}>

      {/* モーダル */}
      {modal?.show && (
        <div className={styles.modal}>
          <div className={styles.modalBox}>
            {/* ステータスコード */}
            <div className={`${styles.modalStatus} ${modal.ok ? styles.modalStatusOk : styles.modalStatusError}`}>
              {modal.status ?? "ERR"}
            </div>
            {/* メッセージ */}
            <div className={styles.modalMessage}>
              {modal.message}
            </div>
            {/* タイムスタンプ */}
            <div className={styles.modalDetail}>
              {new Date().toLocaleTimeString("ja-JP")} — DB WRITE {modal.ok ? "SUCCESS" : "FAILED"}
            </div>
            {/* プログレスバー */}
            <div className={styles.modalProgress}>
              <div className={styles.modalProgressBar} />
            </div>
          </div>
        </div>
      )}

      {/* 検索セクション */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>// SEARCH RECORDS</span>
        </div>
        <div className={styles.searchRow}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="MODEL / SERIAL / KEYWORD..."
            className={styles.input}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={styles.select}
          >
            <option value="">ALL</option>
            <option value="整備系">整備系</option>
            <option value="マニュアル系">マニュアル系</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className={styles.btnPrimary}
          >
            {isSearching ? "SEARCHING..." : "[ SEARCH ]"}
          </button>
        </div>

        {/* 検索結果 */}
        {searched && (
          <div className={styles.results}>
            {results.length === 0 ? (
              <div className={styles.noResult}>// NO RECORDS FOUND</div>
            ) : (
              <>
                <div className={styles.resultCount}>
                  // {results.length} RECORD(S) FOUND
                </div>
                {results.map((r) => (
                  <div key={r.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={`${styles.badge} ${r.category === "整備系" ? styles.badgeBlue : styles.badgeGreen}`}>
                        {r.category === "整備系" ? "MAINTENANCE" : "MANUAL"}
                      </span>
                      <span className={styles.modelName}>{r.model_name}</span>
                      {r.serial_number && (
                        <span className={styles.serial}>SN: {r.serial_number}</span>
                      )}
                      <span className={styles.date}>{r.date}</span>
                    </div>
                    <p className={styles.content}>{r.content}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* 登録セクション */}
      <section className={styles.section}>
        <button
          className={styles.toggleBtn}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "▼" : "▶"} // NEW RECORD ENTRY
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <select name="category" value={form.category} onChange={handleFormChange} className={styles.select}>
                <option value="整備系">整備系</option>
                <option value="マニュアル系">マニュアル系</option>
              </select>
              <input name="date" type="date" value={form.date} onChange={handleFormChange} required className={styles.input} />
            </div>
            <div className={styles.formRow}>
              <input name="model_name" type="text" value={form.model_name} onChange={handleFormChange} required placeholder="MODEL NAME" className={styles.input} />
              <input name="serial_number" type="text" value={form.serial_number} onChange={handleFormChange} placeholder="SERIAL NO. (OPTIONAL)" className={styles.input} />
            </div>
            <textarea
              name="content"
              value={form.content}
              onChange={handleFormChange}
              required
              placeholder="// ENTER SERVICE DETAILS..."
              rows={5}
              className={styles.textarea}
            />
            <div className={styles.formFooter}>
              <button type="submit" disabled={isSaving} className={styles.btnPrimary}>
                {isSaving ? "SAVING..." : "[ SAVE RECORD ]"}
              </button>
              {saveMessage && (
                <span className={saveMessage.includes("ERROR") ? styles.msgError : styles.msgSuccess}>
                  {saveMessage}
                </span>
              )}
            </div>
          </form>
        )}
      </section>

    </div>
  )
}
