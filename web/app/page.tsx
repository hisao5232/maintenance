"use client"

import { useState, useEffect } from "react"
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
    setSaveMessage("")
    try {
      const res = await fetch(`${API_URL}/api/records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...form, serial_number: form.serial_number || null }),
      })
      if (res.ok) {
        setSaveMessage("// RECORD SAVED SUCCESSFULLY")
        setForm({ category: "整備系", date: "", model_name: "", serial_number: "", content: "" })
        await handleSearch()
      } else {
        setSaveMessage("// ERROR: FAILED TO SAVE")
      }
    } catch {
      setSaveMessage("// ERROR: CONNECTION FAILED")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.page}>

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
