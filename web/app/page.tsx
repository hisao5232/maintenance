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
  image_url: string | null
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
  // 画像関連
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // 削除確認モーダル用
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; model_name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // 画像モーダル用
  const [imageModal, setImageModal] = useState<string | null>(null)

  // 編集モーダル用
  const [editTarget, setEditTarget] = useState<{
    id: number
    category: string
    date: string
    model_name: string
    serial_number: string
    content: string
    image_url: string | null
  } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)

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

  // 編集フォーム変更
  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    if (!editTarget) return
    setEditTarget({ ...editTarget, [e.target.name]: e.target.value })
  }

  // 編集モーダル用画像選択
  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setEditImageFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setEditImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setEditImagePreview(null)
    }
  }

  // 画像選択
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)

    // プレビュー用にBase64変換
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // 画像がある場合は先にR2にアップロード
      let imageUrl: string | null = null
      if (imageFile) {
        const formData = new FormData()
        formData.append("image", imageFile)

        const imgRes = await fetch(`${API_URL}/api/images`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        })

        if (imgRes.ok) {
          const { url } = await imgRes.json()
          // ローカルの相対パスを絶対URLに変換
          imageUrl = `${API_URL}${url}`
        }
      }

      // レコードをD1に保存
      const res = await fetch(`${API_URL}/api/records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...form,
          serial_number: form.serial_number || null,
          image_url: imageUrl,
        }),
      })

      setModal({
        show: true,
        status: res.status,
        ok: res.ok,
        message: res.ok ? "RECORD SAVED TO DATABASE" : "FAILED TO SAVE RECORD",
      })

      if (res.ok) {
        setForm({ category: "整備系", date: "", model_name: "", serial_number: "", content: "" })
        setImageFile(null)
        setImagePreview(null)
      }

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

  // 削除実行
  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`${API_URL}/api/records/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        // 削除後に検索結果を更新
        setResults((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      }
    } catch {
      // エラーは無視
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  // 更新実行
  const handleUpdate = async () => {
    if (!editTarget) return
    setIsUpdating(true)
    try {
      // 新しい画像がある場合はR2にアップロード
      let imageUrl = editTarget.image_url
      if (editImageFile) {
        const formData = new FormData()
        formData.append("image", editImageFile)
        const imgRes = await fetch(`${API_URL}/api/images`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        })
        if (imgRes.ok) {
          const { url } = await imgRes.json()
          imageUrl = `${API_URL}${url}`
        }
      }

      const res = await fetch(`${API_URL}/api/records/${editTarget.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          category: editTarget.category,
          date: editTarget.date,
          model_name: editTarget.model_name,
          serial_number: editTarget.serial_number || null,
          content: editTarget.content,
          image_url: imageUrl,
        }),
      })

      if (res.ok) {
        setResults((prev) =>
          prev.map((r) =>
            r.id === editTarget.id
              ? { ...r, ...editTarget, serial_number: editTarget.serial_number || null, image_url: imageUrl }
              : r
          )
        )
        // 画像stateをリセット
        setEditImageFile(null)
        setEditImagePreview(null)
        setEditTarget(null)
      }
    } catch {
      // エラーは無視
    } finally {
      setIsUpdating(false)
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

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className={styles.modal}>
          <div className={styles.modalBox}>
            <div className={`${styles.modalStatus} ${styles.modalStatusError}`}>
              ⚠
            </div>
            <div className={styles.modalMessage}>
              DELETE RECORD?
            </div>
            <div className={styles.modalDetail}>
              {deleteTarget.model_name} — ID: {deleteTarget.id}
            </div>
            <div className={styles.deleteButtons}>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={styles.deleteBtnConfirm}
              >
                {isDeleting ? "DELETING..." : "[ DELETE ]"}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className={styles.deleteBtnCancel}
              >
                [ CANCEL ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editTarget && (
        <div className={styles.modal} onClick={() => setEditTarget(null)}>
          <div className={styles.editModalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.editModalHeader}>
              // EDIT RECORD — ID: {editTarget.id}
            </div>
            <div className={styles.editForm}>
              <div className={styles.formRow}>
                <select
                  name="category"
                  value={editTarget.category}
                  onChange={handleEditChange}
                  className={styles.select}
                >
                  <option value="整備系">整備系</option>
                  <option value="マニュアル系">マニュアル系</option>
                </select>
                <input
                  name="date"
                  type="date"
                  value={editTarget.date}
                  onChange={handleEditChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formRow}>
                <input
                  name="model_name"
                  type="text"
                  value={editTarget.model_name}
                  onChange={handleEditChange}
                  placeholder="MODEL NAME"
                  className={styles.input}
                />
                <input
                  name="serial_number"
                  type="text"
                  value={editTarget.serial_number ?? ""}
                  onChange={handleEditChange}
                  placeholder="SERIAL NO. (OPTIONAL)"
                  className={styles.input}
                />
              </div>
              <textarea
                name="content"
                value={editTarget.content}
                onChange={handleEditChange}
                rows={6}
                className={styles.textarea}
              />
              {/* 画像アップロード */}
              <div className={styles.imageUpload}>
                {/* 既存画像の表示 */}
                {editTarget.image_url && !editImagePreview && (
                  <div className={styles.imagePreview}>
                    <img src={editTarget.image_url} alt="現在の画像" className={styles.previewImg} />
                    <button
                      type="button"
                      onClick={() => setEditTarget({ ...editTarget, image_url: null })}
                      className={styles.imageRemove}
                    >
                      [ REMOVE ]
                    </button>
                  </div>
                )}
                {/* 新しい画像のプレビュー */}
                {editImagePreview && (
                  <div className={styles.imagePreview}>
                    <img src={editImagePreview} alt="新しい画像" className={styles.previewImg} />
                    <button
                      type="button"
                      onClick={() => { setEditImageFile(null); setEditImagePreview(null) }}
                      className={styles.imageRemove}
                    >
                      [ REMOVE ]
                    </button>
                  </div>
                )}
                {/* 画像選択ボタン */}
                <label className={styles.imageLabel}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageChange}
                    className={styles.imageInput}
                  />
                  <span className={styles.imageLabelText}>
                    {editImageFile ? `📎 ${editImageFile.name}` : "[ + CHANGE IMAGE ]"}
                  </span>
                </label>
              </div>
              <div className={styles.deleteButtons}>
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className={styles.editBtnConfirm}
                >
                  {isUpdating ? "SAVING..." : "[ SAVE ]"}
                </button>
                <button
                  onClick={() => setEditTarget(null)}
                  className={styles.deleteBtnCancel}
                >
                  [ CANCEL ]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 画像モーダル */}
      {imageModal && (
        <div className={styles.modal} onClick={() => setImageModal(null)}>
          <div className={styles.imageModalBox}>
            <img
              src={imageModal}
              alt="整備画像"
              className={styles.imageModalImg}
              onClick={(e) => e.stopPropagation()} // 画像クリックで閉じないよう
            />
            <button
              onClick={() => setImageModal(null)}
              className={styles.imageModalClose}
            >
              [ CLOSE ]
            </button>
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
                    {/* 画像表示 */}
                    {r.image_url && (
                      <div className={styles.cardImage}>
                        <img
                          src={r.image_url}
                          alt={`${r.model_name}の整備画像`}
                          className={styles.cardImg}
                          onClick={() => setImageModal(r.image_url!)}
                        />
                      </div>
                    )}
                    <div className={styles.cardFooter}>
                      {/* 編集ボタン */}
                      <button
                        onClick={() => setEditTarget({
                          id: r.id,
                          category: r.category,
                          date: r.date,
                          model_name: r.model_name,
                          serial_number: r.serial_number ?? "",
                          content: r.content,
                          image_url: r.image_url,
                        })}
                        className={styles.editBtn}
                        title="編集"
                      >
                        ✏️
                      </button>
                      {/* 削除ボタン */}
                      <button
                        onClick={() => setDeleteTarget({ id: r.id, model_name: r.model_name })}
                        className={styles.deleteBtn}
                        title="削除"
                      >
                        🗑
                      </button>
                    </div>
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
            {/* 画像選択 */}
            <div className={styles.imageUpload}>
              <label className={styles.imageLabel}>
                <input
                  type="file"
                  accept="image/*"          // 画像ファイルのみ
                  onChange={handleImageChange}
                  className={styles.imageInput}
                />
                <span className={styles.imageLabelText}>
                  {imageFile ? `📎 ${imageFile.name}` : "[ + ATTACH IMAGE ]"}
                </span>
              </label>

              {/* プレビュー */}
              {imagePreview && (
                <div className={styles.imagePreview}>
                  <img src={imagePreview} alt="preview" className={styles.previewImg} />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className={styles.imageRemove}
                  >
                    [ REMOVE ]
                  </button>
                </div>
              )}
            </div>
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
