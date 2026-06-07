"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./login.module.css"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) { setError("// AUTH FAILED: INVALID CREDENTIALS"); return }
      const { token } = await res.json()
      document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict`
      router.push("/")
    } catch {
      setError("// ERROR: CONNECTION FAILED")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.box}>
        <div className={styles.icon} />
        <h1 className={styles.title}>HEAVY EQUIPMENT</h1>
        <p className={styles.subtitle}>SERVICE LOG SYSTEM</p>
        <p className={styles.access}>// AUTHORIZED ACCESS ONLY</p>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>USER_ID</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className={styles.input} placeholder="ENTER ID" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>PASSWORD</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={styles.input} placeholder="••••••••" />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" disabled={isLoading} className={styles.btn}>
            {isLoading ? "AUTHENTICATING..." : "[ AUTHENTICATE ]"}
          </button>
        </form>
      </div>
    </div>
  )
}
