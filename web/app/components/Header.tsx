"use client"

import styles from "./Header.module.css"
import { useRouter } from "next/navigation"

type Props = {
  role?: "admin" | "guest" | null
}

export default function Header({ role }: Props) {
  const router = useRouter()

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0"
    router.push("/login")
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.icon} />
          <div className={styles.titleBlock}>
            <span className={styles.title}>Heavy Equipment Service Log</span>
            <span className={styles.subtitle}>Maintenance Record System — Field Edition</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* roleバッジ */}
          {role && (
            <span className={`${styles.roleBadge} ${role === "guest" ? styles.roleGuest : styles.roleAdmin}`}>
              {role === "guest" ? "GUEST" : "ADMIN"}
            </span>
          )}
          <div className={styles.status}>
            <div className={styles.dot} />
            <span>SYSTEM ONLINE</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            [ LOGOUT ]
          </button>
        </div>
      </div>
    </header>
  )
}
