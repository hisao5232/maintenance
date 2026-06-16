"use client"

import { useEffect, useState } from "react"
import styles from "./StorageBar.module.css"

type StorageInfo = {
  d1: {
    records: number
    used_bytes: number
    limit_bytes: number
  }
  r2: {
    used_bytes: number
    limit_bytes: number
    object_count: number
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`
}

function calcPercent(used: number, limit: number): number {
  return Math.min((used / limit) * 100, 100)
}

export default function StorageBar() {
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [loading, setLoading] = useState(true)  // ローディング状態を追加

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((r) => r.startsWith("token="))
      ?.split("=")[1]

    if (!token) {
      setLoading(false)
      return
    }

    fetch(`${API_URL}/api/storage`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setStorage(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // ローディング中はプレースホルダーを表示
  if (loading) return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <span className={styles.loadingText}>
          // LOADING STORAGE INFO...
        </span>
      </div>
    </div>
  )

  if (!storage) return null

  const d1Percent = calcPercent(storage.d1.used_bytes, storage.d1.limit_bytes)
  const r2Percent = calcPercent(storage.r2.used_bytes, storage.r2.limit_bytes)

  return (
    <div className={styles.container}>
      <div className={styles.inner}>

        {/* D1 */}
        <div className={styles.item}>
          <div className={styles.label}>
            <span className={styles.name}>D1 DATABASE</span>
            <span className={styles.value}>
              {storage.d1.records} records
              {" · "}
              {formatBytes(storage.d1.used_bytes)} / 5GB
            </span>
          </div>
          <div className={styles.barBg}>
            <div
              className={styles.barFill}
              style={{ width: `${d1Percent}%` }}
              data-warning={d1Percent > 80}
            />
          </div>
        </div>

        {/* R2 */}
        <div className={styles.item}>
          <div className={styles.label}>
            <span className={styles.name}>R2 STORAGE</span>
            <span className={styles.value}>
              {storage.r2.object_count} files
              {" · "}
              {formatBytes(storage.r2.used_bytes)} / 10GB
            </span>
          </div>
          <div className={styles.barBg}>
            <div
              className={styles.barFill}
              style={{ width: `${r2Percent}%` }}
              data-warning={r2Percent > 80}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
